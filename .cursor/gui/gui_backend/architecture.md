# GUI backend (Wails / Go)

Правила слоя между React и Forester. Код живёт в `sources/frontend/dfm-gui` (Go-часть Wails-приложения).

Обзор: [../architecture.md](../architecture.md).  
Методы: [jsonapi.md](./jsonapi.md).  
Workdir: [workdir.md](./workdir.md).  
Превью: [thumbnails.md](./thumbnails.md).  
Скролл сетки (frontend): [../gui_frontend/virtual-scroll.md](../gui_frontend/virtual-scroll.md).  
Кэш коммитов/стейджей: [../gui_frontend/revision-cache.md](../gui_frontend/revision-cache.md).

---

## Назначение

Wails backend:

1. Поднимает окно и отдаёт frontend методы через Wails bindings.
2. Держит сессию `pkg/jsonapi` на выбранном `workPath`.
3. Читает/пишет `~/.dfm/setup.cfg` и `~/.dfm/repos.cfg`.
4. Вызывает нативные диалоги ОС (выбор папки, файла, приложения — фильтры зависят от `GOOS`).
5. При необходимости следит за изменениями файлов в workdir и сигналит frontend.

Вся логика VCS — в Forester. Backend GUI — тонкая обёртка: сериализовать аргументы в JSON, вызвать `jsonapi.Call`, вернуть `result` или ошибку.

---

## Зависимость

Модуль Forester: `github.com/difference-machine/forester`.

```go
import "github.com/difference-machine/forester/pkg/jsonapi"
```

Публичный пакет реэкспортирует `Open`, `Close`, `Call`, `CallStateless`. Внутренний диспетчер — `internal/jsonapi` (не импортировать из GUI).

---

## Сессия

| Операция | API | Когда |
|----------|-----|--------|
| Открыть | `jsonapi.Open(absRepoRoot)` | Старт, смена репо, успешный `repo.init` |
| Вызов | `jsonapi.Call(h, method, argsJSON)` | Каждый VCS/workdir метод |
| Закрыть | `jsonapi.Close(h)` | Смена/удаление репо, выход |

`workPath` — абсолютный путь корня проекта (каталог, в котором есть или будет `.DFM/`).

`repo.init` допустим через `CallStateless` на ещё не инициализированный путь, затем `Open`.

Не хранить несколько живых handle на разные репо без явной необходимости: UI однооконный, один текущий репозиторий.

Обработчики Forester берут глобальный mutex на время вызова. Не запускать пачку `Call` параллельно с ожиданием ускорения — они выстроятся в очередь.

---

## Обёртка вызова

Рекомендуемый контракт Wails-метода для frontend:

- Вход: `method string`, `argsJSON string` (уже JSON-объект).
- Выход: тот же envelope (`ok` / `result` / `error`) либо разобранная ошибка Wails.

Frontend не должен знать про `Handle`. Handle живёт только в Go.

Дополнительно backend может экспортировать узкие методы без JSON (`SelectDirectory`, `SelectApplication`, `ReadSetupCfg`, `WatchWorkdir`), если они не являются методами Forester. `GetSession` / `GetSettings` отдают `platform` (`darwin` / `windows` / `linux`).

---

## Зона ответственности vs JSON API

| Задача | Где |
|--------|-----|
| `status.get`, `commit.create`, `workdir.thumbnail`, … | Только `jsonapi.Call` |
| Список репозиториев | `~/.dfm/repos.cfg` `[repo]` / `[current repo]` |
| Автор по умолчанию | `setup.cfg` `[user]`; в `commit.create` передавать `author` |
| Выбор папки / файла / приложения | Wails/OS dialog; приложение — `SelectApplication` по `GOOS` (`darwin` `.app`, `windows` `.exe`) |
| Open Folder / Create repository | picker + `Open` / `repo.init` — [Header Window](../components/items/header-window.md) |
| Заголовок окна | `WindowSetTitle`: `Difference Machine` без репо, `Difference Machine ({name})` при открытой сессии (`{name}` = basename корня) |
| Verify repository | `repo.rebuild` |
| Recover commit | `reflog.get` / `reflog.restore` |
| Clean repository | Close + удалить каталог `.DFM/` на диске, не JSON API |
| Открыть файл в редакторе | `workdir.open` (`path` + опционально `editor`) |
| Удалить файл | `workdir.delete` (корзина ОС, не `os.Remove` из GUI) |
| Переименовать | `workdir.rename` |
| Превью картинки/видео/blend/текста | сетка и File Info: `workdir.thumbnail`; Content View файла: `workdir.file` для растра и SVG; ревизия: `blob.get`; кэш — [thumbnails.md](./thumbnails.md) |
| Garbage collection | `setup.cfg` `[gc]` (`enabled`, `reflog.expire.days`, `schedule.enabled`, `interval.day`, `schedule.hour`, `schedule.minute`, `last.run`) + `gc.run`. Тот же файл у аддона |
| Ignored files and folders | корневой `.dfmignore` через `workdir.dfmignore.get` / `set` |

Запрещено:

- Запускать `forester` CLI из GUI для штатных операций.
- Читать `.DFM/objects`, `index`, `HEAD` напрямую.
- Собирать thumbnail в React, если метод API уже это делает. Диск-кэш PNG в `.DFM/cache/thumbs/` после `Call` — можно (Wails).
- Писать относительные пути с `\`.

---

## Ошибки

`Call` не бросает Go-error на бизнес-отказ: ошибка в envelope (`ok: false`). Транспортные сбои тоже envelope.

| `error` | Когда | GUI |
|---------|-------|-----|
| `invalid session handle` | нет `Open` / после Close (в т.ч. Clean) | toast; не повторять `Call` пока снова не Open |
| `invalid args JSON` | битые аргументы | toast / в диалоге |
| `unknown method: …` | нет в `dispatch.go` | toast; не вызывать таких методов |
| `not a Forester repository` | нет `.DFM/` | First Start или toast; не app shell с workdir API |
| `not a Forester repository` (Open) | `SessionInfo.error` | toast, остаться где были |
| dirty worktree / uncommitted / stash | `repo.switch` без `auto_stash` | [Switch dirty](../dialogs/branches.md), не toast |
| `commit not found` / `object not found` / `invalid object` / parse commit/tree | HEAD или object store | при refresh → [Damaged](../views/project-browse.md); в мутации → toast или диалог |
| `file_too_large` / `screenshot_too_large` | превью | placeholder / toast по контексту панели |
| `failed to acquire lock. File may be already locked` | `lock.acquire` | toast |
| `Wails bindings are not available` | нет моста (не runtime GUI) | не глотать |
| прочие строки из handler | бизнес-отказ | как есть в toast или диалоге |

Wails-слой:

- Не глотать `error`.
- Не маппить неизвестные строки на выдуманный UX.
- После ошибки сессии — не продолжать `Call` с тем же handle, пока не `Open` заново.

Полный каталог «какой диалог / toast»: [dialogs](../dialogs/architecture.md#ошибки), [states](../states/architecture.md#ошибки-и-уведомления). Список типичных строк API: [jsonapi](./jsonapi.md#ошибки-envelope).

---

## Конфигурация и bootstrap

При первом запуске GUI может записать в `setup.cfg` пути установленного payload (`bin/`, `lib/`, аддон). Это нужно аддону Blender, не самому JSON API.

`[api] path` указывает на native library, не на CLI. См. [setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc).

---

## Наблюдение за workdir

Если включён filesystem watcher:

- Игнорировать `.DFM/` (в том числе `.DFM/cache/thumbs/` — запись эскиза не должна сбрасывать сетку).
- Дебаунс событий, затем `status.get` + инвалидация кэша превью **затронутых path** ([thumbnails.md](./thumbnails.md)).
- Не сканировать дерево в Go дублем `workdir.entries` — источник списка файлов остаётся JSON API.

---

## Потоки и UI

Wails вызывает Go из JS. Долгие методы (`workdir.thumbnail` с ffmpeg, `compare.extract`, `merge.start`) блокируют mutex API. Frontend показывает состояние загрузки панели/тайла (см. [states](../states/architecture.md)), не спамит повторными вызовами того же path.
