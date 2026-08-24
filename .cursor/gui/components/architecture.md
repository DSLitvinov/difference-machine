# Кастомные компоненты (кирпичи)

Правила атомов и items UI в `sources/frontend/dfm-gui/frontend`.  
Панели и диалоги собираются из этих кирпичей плюс shadcn/ui.

Холст дизайн-системы: [DFM 0.8.1 component](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5772) (`4191:5772`).  
**Не** описывать и **не** реализовывать с этого холста фреймы `View / …` — это сборка окна, не кирпич.

Обзор: [../architecture.md](../architecture.md).  
Паритет: [figma-gui-parity](../../rules/figma-gui-parity.mdc).  
Правило агента: [shadcn-custom-components](../../rules/shadcn-custom-components.mdc).

---

## Слои

| Слой | Префикс Figma | Правило |
|------|---------------|---------|
| **shadcn/ui** | — | `components/ui/`. Не форкать Radix. Токены темы — под макет |
| **Atom** | `Atom /` | Один визуальный смысл. Свой `cva` по property Figma |
| **Item** | `Item /` | Ячейка списка/сетки/хедера. Собирает атомы, не копирует их hex |
| **Placeholder** | `Content / Placeholder /` | Empty панели. Спека панели ссылается сюда |
| **Popover** | `Popover (` | Меню. shadcn `DropdownMenu` / `Popover` |
| **Panel** | `Panel /` | Колонка. [../panels/architecture.md](../panels/architecture.md) |
| **Dialog** | `Dialog /` | Модалка. [../dialogs/architecture.md](../dialogs/architecture.md) |
| **View** | `View /` | Вне скоупа кирпичей. Не документировать здесь |

`Components / Dialog / …` — заготовки примитивов диалога, не отдельные продуктовые компоненты.

---

## Когда заводить кастомный атом / item

Да:

- Есть фрейм `Atom /` или `Item /` с вариантами (`type`, `state`, `size`, `Lock`).
- Дефолтный variant shadcn ломает геометрию (Badge pill vs квадрат 20×20).

Нет:

- `View / …` и chrome окна.
- Обёртка только с `className`.
- Счётчик, tooltip, третья буква бейджа «чтобы было понятнее».

Не делать кирпич «на будущее». Нет в Figma — нет в коде.

---

## Запросы в Figma

Один `get_design_context` на **набор вариантов** (фрейм), не на холст `4191:5772` и не на каждый symbol внутри набора.

Цвета и геометрию брать из Atom/Item, не с кадра `View /`.

---

## Данные

Атом и item **не** вызывают JSON API. Панель передаёт готовые поля и колбэки.

Имена в коде — по UI (`FileStatusBadge`), не по методу API (`WorkdirThumbnailWidget`).

```text
frontend/src/components/ui/           # shadcn
frontend/src/components/<domain>/     # кастомные кирпичи
```

Пути в подписях — rel с `/`. Truncate — CSS из макета.

---

## shadcn/ui

| Делать | Не делать |
|--------|-----------|
| База: Button, Badge, Dialog, Switch, Textarea, DropdownMenu | `variant="destructive"` вместо продуктового `type` |
| Свои ключи cva = property Figma | Один компонент на два атома Figma |
| CSS-переменные атома для hex из макета | Ad-hoc hex в каждом тайле |
| Иконка — экспорт Figma | Lucide «по имени», если глиф не совпал |

Тёмная тема: без dark-варианта в наборе заливки не инвертировать.

---

## Шаблон спеки кирпича

1. Figma name, URL, node.
2. Имя в коде. С чем не путать.
3. Назначение. API не вызывает.
4. Таблица вариантов (property → вид → данные Forester, если есть).
5. Геометрия, токены, типографика.
6. Состояния: только из набора; нет hover в Figma — не выдумывать.
7. База shadcn и запрещённые default variants.
8. Запреты.

---

## Каталог атомов

| Figma | Node | Спека | Код |
|-------|------|-------|-----|
| Atom / Badges / File DFM Status | `4191:5880` | [badge-file-status.md](./badge-file-status.md) | `FileStatusBadge` |
| Atom / Badges / Blender Object Status | `4422:10355` | [badge-object-status.md](./badge-object-status.md) | `ObjectStatusBadge` |
| Atom / File Preview | `4191:6503` | [atoms/file-preview.md](./atoms/file-preview.md) | `FilePreview` |
| Atom / Diff / Text / Unified | `4191:5901` | [atoms/diff-text-unified.md](./atoms/diff-text-unified.md) | `DiffTextUnifiedRow` |
| Atom / Diff / Text / Split | `4191:5926` | [atoms/diff-text-split.md](./atoms/diff-text-split.md) | `DiffTextSplitRow` |
| Atom / Swapper | `4219:12826` | [atoms/swapper.md](./atoms/swapper.md) | **нет** (слот Figma → реальный атом) |
| Atom / Commit / File Item | `4191:5777` | [atoms/commit-file-item.md](./atoms/commit-file-item.md) | `CommitFileItem` |
| Atom / Cards / Commit Project | `4279:11417` | [atoms/card-commit-project.md](./atoms/card-commit-project.md) | `CommitProjectCard` |
| Atom / Cards / Commit File | `4306:3082` | [atoms/card-commit-file.md](./atoms/card-commit-file.md) | `CommitFileCard` |
| Atom / Cards / Stage | `4402:9877` | [atoms/card-stage.md](./atoms/card-stage.md) | `StageCard` |
| Atom / Cards / Create Commit | `4385:9476` | [atoms/card-create-commit.md](./atoms/card-create-commit.md) | `CreateCommitCard` |
| Atom / Cards / Directory | `4309:9126` | [atoms/card-directory.md](./atoms/card-directory.md) | `UncommittedFilesCard` |
| Atom / Cards / Back to file | `4279:11427` | [atoms/card-back-to-file.md](./atoms/card-back-to-file.md) | `BackToFileRow` |
| Atom / Cards / No History File | `4279:11870` | [atoms/card-no-history-file.md](./atoms/card-no-history-file.md) | `NoHistoryFile` |
| Atom / Cards / No History Project | `4382:9003` | [atoms/card-no-history-project.md](./atoms/card-no-history-project.md) | `NoHistoryProject` |

Иконка папки 48px живёт внутри [items/grid-folder.md](./items/grid-folder.md) (`Atom / Icons / 48 / Folder`, `4234:9143`). Отдельный атом-спеки нет, пока нет других размеров в наборе.

---

## Каталог items

| Figma | Node | Спека |
|-------|------|-------|
| Item / Grid View / File | `4191:6507` | [items/grid-file.md](./items/grid-file.md) |
| Item / Grid View / Folder | `4191:6599` | [items/grid-folder.md](./items/grid-folder.md) |
| Item / List View / File | `4334:15450` | [items/list-file.md](./items/list-file.md) |
| Item / List View / Folder | `4334:15300` | [items/list-folder.md](./items/list-folder.md) |
| Item / Card | `4191:5809` | [items/sidebar-card.md](./items/sidebar-card.md) |
| Item / Card Directory | `6004:10960` | [items/sidebar-card-directory.md](./items/sidebar-card-directory.md) — Uncommitted files в Project view, не путать с Card |
| Item / Preview / File Info | `4191:6615` | [items/preview-file-info.md](./items/preview-file-info.md) |
| Item / Preview / File Info - More Files | `4402:10360` | [items/preview-file-info-more.md](./items/preview-file-info-more.md) |
| Item / Folder Action | `4234:9656` | [items/folder-action.md](./items/folder-action.md) |
| Item / Placeholder / Null Repository | `4385:8743` | [items/placeholder-null-repository.md](./items/placeholder-null-repository.md) |
| Item / Commit / Diff / Image | `4282:21006` | [items/commit-diff-image.md](./items/commit-diff-image.md) |
| Item / Commit / Diff / Text Diff | `4290:22243` | [items/commit-diff-text.md](./items/commit-diff-text.md) |
| Item / Commit / Diff / Binary Diff | `4322:4753` | [items/commit-diff-binary.md](./items/commit-diff-binary.md) |
| Item / Panel / Header / Select Branch | `4309:5686` | [items/header-select-branch.md](./items/header-select-branch.md) |
| Item / Panel / Header / Settings | `4335:19965` | [items/header-settings.md](./items/header-settings.md) |
| Item / Panel / Header / Right Side | `4309:9246` | [items/header-right-side.md](./items/header-right-side.md) |
| Item / Panel / Header / Folder Action | `4315:11409` | [items/header-folder-action.md](./items/header-folder-action.md) |
| Item / Panel / Header / File Action | `4318:3832` | [items/header-file-action.md](./items/header-file-action.md) |
| Item / Panel / Header / File Commit Action | `4318:4095` | [items/header-file-commit-action.md](./items/header-file-commit-action.md) |
| Item / Panel / Header / Commit Info | `4322:4537` | [items/header-commit-info.md](./items/header-commit-info.md) |
| Item / Panel / Header / Window | `4423:10574` | [items/header-window.md](./items/header-window.md) |
| Content / File list | `4272:11329` | [items/content-file-list.md](./items/content-file-list.md) |
| Content / View / Text, Binary, Img | `4383:7176` `4383:7549` `4383:7589` | [items/content-view.md](./items/content-view.md) |

`Content / View / …` — область превью внутри панели, **не** `View / Project view / …`.

---

## Popovers и placeholders

| Figma | Node | Спека |
|-------|------|-------|
| Popover (Filters) | `4272:6728` | [popovers/filters.md](./popovers/filters.md) |
| Popover (Sort) | `4272:6727` | [popovers/sort.md](./popovers/sort.md) |
| Popover (File Preview Item) | `4272:6726` | [popovers/file-preview-item.md](./popovers/file-preview-item.md) |
| Popover (File in Commit) | `4272:11286` | [popovers/file-in-commit.md](./popovers/file-in-commit.md) |
| Popover (File in Commit → Copy) | `4272:11287` | [popovers/file-in-commit-copy.md](./popovers/file-in-commit-copy.md) |
| Popover (Commit Card) | `4272:11288` | [popovers/commit-card.md](./popovers/commit-card.md) |
| Content / Placeholder / Folder Null | `4382:8709` | [placeholders/folder-null.md](./placeholders/folder-null.md) |
| Content / Placeholder / Not Select A File | `4382:8020` | [placeholders/not-select-file.md](./placeholders/not-select-file.md) |
| Content / Placeholder / Diff / Binary | `4226:17300` | [placeholders/diff-binary.md](./placeholders/diff-binary.md) |
| Content / Placeholder / Diff / File List | `4309:5577` | [placeholders/diff-file-list.md](./placeholders/diff-file-list.md) |

---

## Панели и диалоги

Колонки: [../panels/architecture.md](../panels/architecture.md).  
Модалки: [../dialogs/architecture.md](../dialogs/architecture.md).
