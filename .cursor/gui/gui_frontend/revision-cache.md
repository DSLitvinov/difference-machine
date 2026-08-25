# Кэш содержимого коммитов и стейджей

Ленивая подгрузка **payload** истории: статистика карточки, список файлов ревизии, diff и blob. Каталог (`log.get`) — отдельно, как у сетки.

Виртуализация списков: [virtual-scroll.md](./virtual-scroll.md).  
Эскизы workdir: [../gui_backend/thumbnails.md](../gui_backend/thumbnails.md).  
Правило агента: [virtual-scroll-preview](../../rules/virtual-scroll-preview.mdc).

---

## Не путать три вещи

| Что | Это | Кэш |
|-----|-----|-----|
| **Коммит** | Неизменяемый объект Forester (`hash`) | Memory LRU по hash. Диск GUI **не** нужен: байты уже в `.DFM/objects` |
| **Именованный stash** (вкладка Stash, Figma Stages, [StageCard](../components/atoms/card-stage.md)) | Снимок workdir, не git-commit. Каталог: `stash.list` | Тот же каркас, ключ `stageId` (`hash`). `diff.stat` на stash hash не вызывать |
| **Index / `staged_*`** | Живой индекс (`status.get`, `index.add`) | Снимок VCS-store. Не LRU blob. Превью этих файлов — workdir + mtime, не hash коммита |

Вкладка Stash ≠ фильтр «только staged в git». Открытый вопрос: [views/architecture.md](../views/architecture.md) §3.

---

## Слои (не смешивать)

Как у папки: страница списка ≠ содержимое.

| Слой | Методы | Когда грузить | Ключ memory |
|------|--------|---------------|-------------|
| Каталог | `log.get` (`branch`, `max_count`, опционально `path`) | Первая страница при открытии вкладки; дальше при scroll (`capped`) | `repoAbs + branch + pathFilter + max_count` (накапливать commits, не копить параллельные копии) |
| Карточка | `diff.stat` (`to` = hash; для File view — ещё `path`) | Visible ∪ overscan **карточек**, не вся страница log | `repoAbs + commitHash` или `+ path` |
| Мета коммита | `commit.get` | Выбранный коммит (хедер, screenshot) | `repoAbs + commitHash` |
| Список path | `diff.name_status` (`to` = hash) | Когда открыт inspect коммита | `repoAbs + from + to` (`from` по умолчанию — родитель) |
| Payload path | `diff.text` или `blob.get` | **Выбранный** path (+ 0–1 сосед в file list) | `repoAbs + from + to + path` |

`log.get` отдаёт hash, message, author, timestamp, tag — этого достаточно нарисовать карточку **без** `diff.stat`. Stats (`7 files changed`, `+` / `−`) — второй запрос, ленивый.

Не делать после `log.get(max_count=100)` сто вызовов `diff.stat`.

---

## Очередь и приоритет

JSON API под глобальный mutex. Бюджет GUI: **1–2** in-flight `Call` на всё окно (thumbs + history + status). Пачка не ускоряет.

Порядок, если очередь не пуста:

1. Payload открытой панели (выбранный `diff.text` / `blob.get` / `commit.get`).
2. Visible карточки (`diff.stat`) и visible тайлы сетки (`workdir.thumbnail`).
3. Overscan.

Не стартовать `blob.get` чужого коммита, пока грузится diff текущего.

---

## Коммит: сценарии

### Список History (Project view / File view)

1. Каталог: `log.get`. Карточка сразу с title / author / date из log.
2. `diff.stat` — когда карточка в viewport + 1–2 соседних. Пока нет ответа — слот Stats пустой (без «…» и без спиннера на всю колонку).
3. Hit LRU при возврате скролла — без `Call`.

Атом карточки API не вызывает ([card-commit-project](../components/atoms/card-commit-project.md), [card-commit-file](../components/atoms/card-commit-file.md)).

### View Commit (inspect)

1. `diff.name_status` один раз на выбранный hash → кэш. File list виртуализировать, если длинный.
2. `diff.stat` для хедера — из кэша карточки или тот же ключ.
3. `commit.get` — сообщение / screenshot, если хедеру мало полей log.
4. `diff.text` / `blob.get` — **только выбранный path**. Не греть все файлы коммита.
5. Смена path в file list — payload нового path; предыдущий остаётся в LRU.
6. Смена hash — не чистить кэш старого hash (пользователь вернётся). Сбросить только UI selection.

### History of File

Тот же `diff.stat` с `path`. Payload: `diff.text` / `blob.get` для этого path и выбранного hash. Не тащить `name_status` всего дерева.

Картинка ревизии: `blob.get` в **memory** (blob URL), ключ с hash, не mtime. Не писать в `.DFM/cache/thumbs/` — это не ffmpeg-workdir.

---

## Stash (вкладка Stash)

Экран и [StageCard](../components/atoms/card-stage.md) — из Figma (слой Stage). В UI **Stash**. Каталог: `stash.list`. Пустой список — кадр [Stashes Null](../views/project-browse.md) (`6035:12553`): [NoStagesProject](../components/atoms/card-no-stages-project.md) (`6020:12733`) слева, Folder Empty в центре.

| Слой | Как у коммита, но |
|------|-------------------|
| Каталог | `stash.list` → `{stashes}` |
| Карточка | title `Stash №N` / date из каталога; `diff.stat` на stash hash не вызывать |
| Меню | `stash.apply` / `stash.drop`; не открывать commit inspect |

Ключ **не** `commitHash`: `repoAbs + stageId` (+ `path` / `from` если контракт так задаст).

Стейдж, в отличие от коммита, может быть мутабельным. Инвалидация — по событию API (create / delete / update этого id), не по mtime workdir. Не использовать кэш коммита как подмену.

---

## Index (`staged_*`) — не этот кэш

После `index.add` / `commit.create` / watcher: обновить снимок `status.get`. Содержимое staged-файла в сетке — `workdir.thumbnail` + ключ с mtime.

Не класть index-списки в LRU ревизий. Не считать `status.get` страницей, которую надо виртуализировать как log: это короткий снимок dirty path.

---

## Память vs диск

| | Memory LRU | `.DFM/cache/` | `.DFM/objects` |
|--|------------|---------------|----------------|
| `diff.stat`, `name_status`, `diff.text` | да | нет (текст дёшево перечитать) | источник истины у Forester |
| `blob.get` / screenshot | да, blob URL; не вечный base64 в Zustand | нет | да, уже лежит |
| ffmpeg workdir thumb | да | `.DFM/cache/thumbs/` | нет |

LRU: недавно открытые ревизии + visible stats, не вся история ветки. Evict: `URL.revokeObjectURL`. Смена repo — сброс всего memory.

Коммит неизменяем: hit по hash не протухает от watcher. Новый `commit.create` — prepend в каталог, старые ключи оставить. `commit.reset` / смена ветки — обновить каталог `log.get`; объекты старых hash в LRU можно оставить, пока не сменится repo.

---

## Запрещено

- `diff.stat` / `blob.get` / `diff.text` на все коммиты страницы log сразу.
- Prefetch всех path выбранного коммита.
- Диск-кэш GUI для blob ревизии (дубль object store).
- Выдуманный список стейджей вместо `stash.list`.
- Путать StageCard / вкладку Stash с `staged_*` из `status.get`.
- Видимые «cached», «N files loaded», MIME debug.
