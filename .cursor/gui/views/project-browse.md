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
| Empty DFM Folder | [`4385:8956`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-8956) | в сетке есть файлы; в списке коммитов [Null Repository](../components/items/placeholder-null-repository.md) | Project view - Folder DFM Null | Folder Expanded 788 | File Info Null |
| Root Folder | [`4224:14140`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4224-14140) | корень, файл не выбран, есть коммиты | Project view | Folder Expanded 788 | File Info Null |
| Root Folder - Collapse | [`4276:6972`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4276-6972) | корень, info свёрнута | Project view | Folder Collapse 1120 | нет |
| SubFolder | [`4324:5701`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4324-5701) | вложенная папка (breadcrumb не только `Home`) | Project view | Folder Expanded 788 | File Info |
| File Info | [`4408:11431`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4408-11431) | выбран **один** файл в сетке | Project view | Folder Expanded 788 | File Info |
| File More Info | [`4408:12671`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4408-12671) | выбрано **несколько** файлов | Project view | Folder Expanded 788 | [Select More Files](../panels/select-more-files.md) |
| Create Commit | [`4385:10858`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-10858) | открыт композер, выбран **не один** файл | Uncommitted слот = [CreateCommitCard](../components/atoms/card-create-commit.md); список коммитов как обычно | Folder Expanded 788 | Select More Files |
| Create Commit single file | [`6036:14491`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-14491) | открыт композер, выбран **один** файл | тот же композер в Card Directory Selected | Folder Expanded 788, файл выбран | [File Info](../panels/file-info.md) (Edit + More, не Create commit) |
| Stages | [`4385:12759`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4385-12759) | вкладка **Stash**, `stash.list` непустой | Project view, список = [StageCard](../components/atoms/card-stage.md) | Folder Expanded 788 | File Info Null |
| Stashes Null | [`6035:12553`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6035-12553) | вкладка **Stash**, `stash.list` пуст | Project view, один Disable + [NoStagesProject](../components/atoms/card-no-stages-project.md) `6020:12733` | Folder Empty 788: `No files yet` / **`Create stash`** | File Info Null |

Empty Project: copy центра `No files yet` / `Create or move your files to the repository` — [folder-null](../components/placeholders/folder-null.md).

---

## Правила композиции

1. **Корень vs подпапка** — только `folderPath` и breadcrumb хедера ([header-folder-action](../components/items/header-folder-action.md)). Не отдельный тип панели. Кадра «подпапка, ничего не выбрано» нет: File Info Null + крошки подпапки.
2. Кадр **SubFolder** в Figma — вложенный path **и** заполненный File Info (файл выбран). Кадр **File Info** — то же при `folderPath = ""`.
3. **Ничего не выбрано** — [File Info Null](../panels/file-info.md) + [not-select-file](../components/placeholders/not-select-file.md), если right видна. На Empty Project right нет.
4. **Один файл в сетке** — File Info, сетка остаётся. Открытие превью файла — переход в [file-preview.md](./file-preview.md), не замена только info.
5. **Несколько файлов** — Select More Files, не стек File Info.
6. **Collapse** — `infoCollapsed`: right нет, center 1120, хедер Folder Action `Collapse=yes`. То же правило для file-preview collapse.
7. **Create Commit** — не [Dialog /](../dialogs/architecture.md). Форма в слоте Uncommitted files (Card Directory Selected). Один выбранный файл — кадр [Create Commit single file](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6036-14491): справа File Info. Иначе справа Select More Files. Cancel возвращает карточку Uncommitted.
8. **Stash** — вкладка того же Project view (Figma: Stages). Forester stash, не git `staged_*`. Каталог: `stash.list`. Непустой список: кадр **Stages**, сетка папки как обычно. Пустой список: кадр **Stashes Null** (`6035:12553`) — [NoStagesProject](../components/atoms/card-no-stages-project.md) слева и Folder Empty в центре (`No files yet` / `Create stash`). Не оставлять сетку рабочей папки и не уходить на Root Folder / Empty Project. Virtualizer как у коммитов ([revision-cache.md](../gui_frontend/revision-cache.md)).
9. **Only changed** вкл. — сетка = dirty файлы всего проекта, не текущая папка.

---

## Переходы

| Действие | Куда |
|----------|------|
| Клик по папке в сетке | тот же семейство, новый `folderPath`; info Null пока файл не выбран |
| Breadcrumb Home | Root Folder |
| Клик по файлу (выбор) | File Info (корень) или кадр SubFolder (вложенный path) |
| Range / multi-select | File More Info |
| Open / двойной клик файла | [file-preview](./file-preview.md) по kind |
| Клик коммита в History | [commit](./commit.md) |
| Вкладка Stash | Stash, если есть записи; иначе [Stashes Null](./project-browse.md) |
| Commit All Files / Create | Create Commit; если выбран один файл — Create Commit single file |
| Add in commit (один файл) | Create Commit single file |
| Collapse info | Root Folder Collapse (или collapse текущего folder-экрана) |
