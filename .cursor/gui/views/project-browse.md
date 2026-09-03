# View / Project view — обзор папки

Семейство: пользователь смотрит **сетку текущей папки** workdir. Left — [Panel / Project view](../panels/project-view.md) (или empty-вариант). Center — [Content View Folder](../panels/content-view.md). Right — info или скрыта.

Холст: [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772).  
Каркас 1429×768: [architecture.md](./architecture.md).

Не путать с [file-preview.md](./file-preview.md) (открыт один файл) и [commit.md](./commit.md) (выбран коммит проекта).

---

## Каркас (все варианты)

1. [Header Window](../components/items/header-window.md) 1429×48.
2. Left 309 — Project view.
3. Center 788 или 1120 — Folder Expanded / Collapse / Empty.
4. Right 332 — File Info / File Info Null / Select More Files, либо **нет**.

Вкладки сайдбара `History` / `Stash` (слой Figma `Stages`) — внутри панели, не смена экрана-приложения.

---

## Варианты

| Figma | Node | Когда | Left | Center | Right |
|-------|------|-------|------|--------|-------|
| Empty DFM Project | [`4382:8827`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4382-8827) | папка пустая, истории нет | [Project view - History Null](../panels/project-view.md) | Folder Empty 1120 | нет |
| DFM Damaged | [`6078:16278`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6078-16278) | `.DFM/` есть, HEAD commit или его tree не читаются (`status.damaged`) | History Null | Folder Empty 1120: [Damaged](../components/placeholders/damaged.md) | нет |
| Empty DFM Folder | [`4385:8956`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-8956) | открыта папка **без** `.DFM/`; в сетке есть файлы; в списке коммитов [Null Repository](../components/items/placeholder-null-repository.md) | Project view - Folder DFM Null | Folder Expanded 788 | File Info Null |
| Root Folder | [`4224:14140`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4224-14140) | корень, файл не выбран, есть коммиты | Project view | Folder Expanded 788 | File Info Null |
| Root Folder - Collapse | [`4276:6972`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4276-6972) | корень, info свёрнута | Project view | Folder Collapse 1120 | нет |
| SubFolder | [`4324:5701`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4324-5701) | вложенная папка (breadcrumb не только `Home`) | Project view | Folder Expanded 788 | File Info |
| File Info | [`4408:11431`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4408-11431) | выбран **один** файл в сетке | Project view | Folder Expanded 788 | File Info |
| File More Info | [`4408:12671`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4408-12671) | выбрано **несколько** файлов | Project view | Folder Expanded 788 | [Select More Files](../panels/select-more-files.md) |
| Create Commit | [`4385:10858`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-10858) | композер **selection**, выбран **не один** файл | Card Directory **Disable**, атом Directory + `Сommit all files` inactive | Folder Expanded 788 | [Select More Files](../panels/select-more-files.md) + [CreateCommitCard](../components/atoms/card-create-commit.md) вместо кнопок |
| Create Commit single file | [`6036:14491`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-14491) | композер **selection**, выбран **один** файл | то же Disable слева | Folder Expanded 788, файл выбран | [File Info](../panels/file-info.md) + CreateCommitCard вместо Edit + More |
| Create Commit all file | [`6076:15959`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6076-15959) | кнопка **Сommit all files**; композер **all** | Card Directory **Selected**, Swapper = CreateCommitCard (не Directory, не Disable) | Folder Expanded 788, selection сброшен | [File Info Null](../panels/file-info.md) |
| Stages | [`4385:12759`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-12759) | вкладка **Stash**, `stash.list` непустой | Project view, список = [StageCard](../components/atoms/card-stage.md) | Folder Expanded 788 | File Info Null |
| Stashes Null | [`6035:12553`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6035-12553) | вкладка **Stash**, `stash.list` пуст | Project view, один Disable + [NoStagesProject](../components/atoms/card-no-stages-project.md) `6020:12733` | Folder Empty 788: `No files yet` / **`Create stash`** | File Info Null |

Empty Project: copy центра `No files yet` / `Create or move your files to the repository` — [folder-null](../components/placeholders/folder-null.md).

После `repo.init` (First Start / Create repository) при уже существующих файлах и **нуле** коммитов: экран как Root Folder + History Null ([NoHistoryProject](../components/atoms/card-no-history-project.md)), **не** Empty DFM Folder. Кадр: [`6041:15400`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6041-15400).

---

## Правила композиции

1. **Корень vs подпапка** — только `folderPath` и breadcrumb хедера ([header-folder-action](../components/items/header-folder-action.md)). Не отдельный тип панели. Кадра «подпапка, ничего не выбрано» нет: File Info Null + крошки подпапки.
2. Кадр **SubFolder** в Figma — вложенный path **и** заполненный File Info (файл выбран). Кадр **File Info** — то же при `folderPath = ""`.
3. **Ничего не выбрано** и **клик по папке** (тайл Selected, не заход) — [File Info Null](../panels/file-info.md) + [not-select-file](../components/placeholders/not-select-file.md), если right видна. На Empty Project right нет. Заход в папку — **двойной клик**.
4. **Один файл в сетке** — File Info, сетка остаётся. Открытие превью файла — переход в [file-preview.md](./file-preview.md), не замена только info. Папка в selection File Info не открывает.
5. **Несколько файлов** — Select More Files, не стек File Info.
6. **Collapse** — `infoCollapsed`: right нет, center 1120, хедер Folder Action `Collapse=yes`. То же правило для file-preview collapse.
7. **Create Commit** (из File Info / Select More Files) — не [Dialog /](../dialogs/architecture.md). Форма в **правой** колонке: [CreateCommitCard](../components/atoms/card-create-commit.md) в оболочке Card Directory Selected **вместо** футера (Edit + More / Create commit + More). Превью и metadata скроллятся вверх над карточкой. Слева Card Directory **Disable**, атом Directory остаётся (счётчики), `Сommit all files` inactive. Один выбранный файл — кадр [Create Commit single file](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-14491): справа File Info. Иначе справа Select More Files. Cancel возвращает футер кнопок.
8. **Create Commit all files** — отдельный сценарий, кнопка `Сommit all files` в Uncommitted. Не тот же кадр, что Create Commit. `index.add` всех dirty path, затем форма в **левой** Card Directory **Selected** (Swapper = CreateCommitCard). Selection сбрасывается. Справа File Info Null. Cancel возвращает атом Directory. Create — `commit.create` по всем dirty path, не по selection. Выбор файла в сетке, пока форма слева открыта, не переносит композер вправо и не переключает на Create Commit / single file.
9. **Stash** — вкладка того же Project view (Figma: Stages). Forester stash, не git `staged_*`. Каталог: `stash.list`. Непустой список: кадр **Stages**, сетка папки как обычно. Пустой список: кадр **Stashes Null** (`6035:12553`) — [NoStagesProject](../components/atoms/card-no-stages-project.md) слева и Folder Empty в центре (`No files yet` / `Create stash`). Не оставлять сетку рабочей папки и не уходить на Root Folder / Empty Project. Virtualizer как у коммитов ([revision-cache.md](../gui_frontend/revision-cache.md)).
10. **Only changed** вкл. — сетка = dirty файлы всего проекта, не текущая папка.
11. **View ignored** вкл. — в сетке видны пути из `.dfmignore` с бейджем **i**; выкл. (default) — скрыты. Не меняет кадр `View /`.

---

## Переходы

| Действие | Куда |
|----------|------|
| Клик по папке в сетке | selection (тайл Selected); File Info Null — папка не файл |
| Двойной клик по папке | тот же семейство, новый `folderPath`; selection сброс |
| Breadcrumb Home | Root Folder |
| Клик по файлу (выбор) | File Info (корень) или кадр SubFolder (вложенный path) |
| Range / multi-select | File More Info, если в selection есть файл |
| Open / двойной клик файла | [file-preview](./file-preview.md) по kind |
| Клик коммита в History | [commit](./commit.md) |
| Вкладка Stash | Stash, если есть записи; иначе [Stashes Null](./project-browse.md) |
| Сommit all files | [Create Commit all files](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6076-15959); не Create Commit / single file, даже если файл был выбран |
| Create commit (File Info / Select More Files) | Create Commit; если выбран один файл — Create Commit single file |
| Collapse info | Root Folder Collapse (или collapse текущего folder-экрана) |
