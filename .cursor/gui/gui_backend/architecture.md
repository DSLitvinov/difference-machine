# GUI backend (Wails / Go)

Правила слоя между React и Forester. Код живёт в `sources/frontend/dfm-gui` (Go-часть Wails-приложения).

Обзор: [../architecture.md](../architecture.md).  
Методы: [jsonapi.md](./jsonapi.md).  
Workdir: [workdir.md](./workdir.md).  
Превью: [thumbnails.md](./thumbnails.md).

---

## Назначение

Wails backend:

1. Поднимает окно и отдаёт frontend методы через Wails bindings.
2. Держит сессию `pkg/jsonapi` на выбранном `workPath`.
3. Читает/пишет `~/.dfm/setup.cfg`.
4. Вызывает нативные диалоги ОС (выбор папки).
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

Дополнительно backend может экспортировать узкие методы без JSON (`SelectDirectory`, `ReadSetupCfg`, `WatchWorkdir`), если они не являются методами Forester.

---

## Зона ответственности vs JSON API

| Задача | Где |
|--------|-----|
| `status.get`, `commit.create`, `workdir.thumbnail`, … | Только `jsonapi.Call` |
| Список репозиториев | `setup.cfg` `[repo]` / `[current repo]` |
| Автор по умолчанию | `setup.cfg` `[user]`; в `commit.create` передавать `author` |
| Выбор папки на диске | Wails/OS dialog → абсолютный путь |
| Открыть файл в редакторе | `workdir.open` (`path` + опционально `editor`) |
| Удалить файл | `workdir.delete` (корзина ОС, не `os.Remove` из GUI) |
| Переименовать | `workdir.rename` |
| Превью картинки/blend/текста | `workdir.thumbnail` / `blob.get` |

Запрещено:

- Запускать `forester` CLI из GUI для штатных операций.
- Читать `.DFM/objects`, `index`, `HEAD` напрямую.
- Собирать thumbnail в GUI, если метод API уже это делает.
- Писать относительные пути с `\`.

---

## Ошибки

`Call` не бросает Go-error на бизнес-отказ: ошибка в envelope (`ok: false`). Транспортные сбои (нет сессии, битый JSON аргументов) тоже приходят envelope-ом (`invalid session handle`, `invalid args JSON`, `unknown method`).

Wails-слой:

- Не глотать `error`.
- Не маппить неизвестные строки на выдуманный UX.
- После ошибки сессии — не продолжать `Call` с тем же handle, пока не `Open` заново.

---

## Конфигурация и bootstrap

При первом запуске GUI может записать в `setup.cfg` пути установленного payload (`bin/`, `lib/`, аддон). Это нужно аддону Blender, не самому JSON API.

`[api] path` указывает на native library, не на CLI. См. [setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc).

---

## Наблюдение за workdir

Если включён filesystem watcher:

- Игнорировать `.DFM/` (кроме необходимости инвалидировать compare/tmp_review по продуктовому сценарию).
- Дебаунс событий, затем `status.get` + инвалидация кэша превью на frontend.
- Не сканировать дерево в Go дублем `workdir.entries` — источник списка файлов остаётся JSON API.

---

## Потоки и UI

Wails вызывает Go из JS. Долгие методы (`workdir.thumbnail` с ffmpeg, `compare.extract`, `merge.start`) блокируют mutex API. Frontend показывает состояние загрузки панели/тайла (см. [states](../states/architecture.md)), не спамит повторными вызовами того же path.
