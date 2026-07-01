# Design tokens — shadcn/ui (Zinc light)

Единый справочник цветов для Forester GUI. Источник: [shadcn/ui — The Ultimate UI Kit for Figma (Community)](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/shadcn-ui--The-Ultimate-UI-Kit-for-Figma--Community-).

**Правило для разработки:** в React/Tailwind использовать **только семантические классы shadcn** (`bg-background`, `text-muted-foreground`, …). Hex и Figma-имена — справочно, не хардкодить в компонентах.

**Канонические источники (не дублировать в atom-спеках):**

| Тема | Документ |
|------|----------|
| Цвета, состояния hover/selected | **этот файл** §3–§4 |
| JSON API, UI events | [api-contract.md](./api-contract.md) |
| `item_count` (recursive files) | [architecture.md §4.2](./architecture.md) |
| Multi-repo, `setup.cfg` | [multi-repo.md](./multi-repo.md) |
| Paths (macOS / Windows) | [paths.md](./paths.md) |
| Panel resize (3 columns) | [panel-layout.md](./panel-layout.md) |

**Стек:** Wails + React + shadcn/ui (theme **Zinc**; mode **light** default, **dark** via Settings → [settings-dialog.md §4](./settings-dialog.md)).

---

## 1. Figma → CSS variable → Tailwind

| Figma token | Hex (light) | CSS variable `--*` | Tailwind |
|-------------|-------------|-------------------|----------|
| `background/default` | `#ffffff` | `background` | `bg-background` |
| `background/primary/light` | `#fafafa` | `sidebar` / shell* | `bg-sidebar` |
| `background/primary/default` | `#18181b` | `primary` | `bg-primary` |
| `background/secondary/default` | `#f4f4f5` | `secondary` | `bg-secondary` |
| `background/accent` | `#f4f4f5` | `accent` | `bg-accent` |
| `background/primary/light-hover` | `#f4f4f5` | `accent` | `bg-accent` |
| `background/input` | `#e4e4e7` | `input` | `bg-input` |
| `border/default` | `#e4e4e7` | `border` | `border-border` |
| `border/primary/default` | `#a1a1aa` | `ring` | `border-ring` |
| `foreground/default` | `#09090b` | `foreground` | `text-foreground` |
| `foreground/accent` | `#18181b` | `foreground` | `text-foreground` |
| `foreground/muted` | `#71717a` | `muted-foreground` | `text-muted-foreground` |
| `foreground/secondary/default` | `#3f3f46` | `secondary-foreground` | `text-secondary-foreground` |
| `foreground/primary/default` | `#fafafa` | `primary-foreground` | `text-primary-foreground` |
| `foreground/success/default` | `#047857` | — | `text-emerald-700` |
| `foreground/destructive/default` | `#ef4444` | `destructive` | `text-destructive` |
| `icon/default` | `#09090b` | `foreground` | `text-foreground` |
| `icon/muted` | `#71717a` | `muted-foreground` | `text-muted-foreground` |
| `icon/primary/default` | `#fafafa` | `primary-foreground` | `text-primary-foreground` |

\* **Shell Sidebar** (`#fafafa`): в Figma — `background/primary/light`. В shadcn sidebar extension: `--sidebar-background` ≈ `0 0% 98%`. Если sidebar tokens не подключены — временно `bg-[#fafafa]` через CSS variable `shell` в `globals.css`.

---

## 2. Рекомендуемый `globals.css` (фрагмент)

```css
@layer base {
  :root {
  /* Zinc light — aligned with Figma kit */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 26.1%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5% 64.9%;
  --radius: 0.5rem;
  /* Shell — Figma background/primary/light */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-border: 240 5.9% 90%;
  }
}
```

---

## 3. Компоненты по макетам

**Figma references (shadcn kit, adapted screens):**

| Экран | Node |
|-------|------|
| Sidebar Project view | [4026:4812](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) |
| Project — All files screen | [4090:4628](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4090-4628) |
| Sidebar History | [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547) |
| Content Preview | [4026:4988](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4988) |
| Folder Item | [4026:5059](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5059) |
| File Item | [4026:5023](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5023) |
| Preview thumbnail | [4026:5020](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5020) |
| Folder icon | [4026:5054](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5054) |
| Commit card | [4032:4194](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4032-4194) |
| History Preview — text diff | [4028:5655](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655) |
| History Preview — image diff | [4030:3317](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-3317) |
| History Preview — binary stub | [4031:3754](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4031-3754) |
| History Preview — blend screenshot stub | [4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796) |
| Content Info — single | [4027:5041](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) | Views History или Alert — [info-history-section.md](./info-history-section.md) |
| Content Info — multi | [4037:1898](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898) |
| Content Info — preview single | [4037:707](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-707) |
| Create commit dialog | [4037:1076](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1076) |

**Full screens (DFM page, 1434×1120 Project / 1081×1120 History):**

| Screen | Node | Спека |
|--------|------|-------|
| Project / Default | [4040:6507](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4040-6507) | [architecture.md §2.0](./architecture.md) |
| Project / Changed only | `Screen / Project / Changed only` | [content-preview-project-view.md §8](./content-preview-project-view.md) |
| Project / No selection | `Screen / Project / No selection` | [content-info-project-view.md §6.1](./content-info-project-view.md) |
| Project / Multiselect | `Screen / Project / Multiselect` | [info-file-preview-multi.md](./info-file-preview-multi.md) |
| History / Text diff | `Screen / History / Text diff` | [content-preview-history-view.md](./content-preview-history-view.md) |
| History / Image diff | `Screen / History / Image diff` | [image-diff-panel.md](./image-diff-panel.md) |
| History / Empty preview | `Screen / History / Empty preview` | [content-preview-history-view.md §1.2](./content-preview-history-view.md) |
| Dirty branch switch | [4040:8317](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4040-8317) | [dirty-branch-switch-dialog.md](./dirty-branch-switch-dialog.md) |
| Init repository | shadcn `AlertDialog` (no Figma node) | [init-repository-dialog.md](./init-repository-dialog.md) |
| Settings / Appearance | [4040:5530](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4040-5530) | [settings-dialog.md §4](./settings-dialog.md) |

### 3.1 Sidebar shell

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Shell | `background/primary/light` | `bg-sidebar` |
| Outer border | `border/default` | `border-border` |
| List Container | `background/default` | `bg-background` (no side border; shell column owns `border-r`) |
| Header title | `foreground/accent` | `text-foreground font-semibold` |
| Section label «Folders» | `foreground/muted` | `text-muted-foreground text-xs font-semibold` |
| Folders expand/collapse toggle | `Toggle` 32×32 | OFF: `ListTree` 16 · ON: `ListCollapse` 16 + `data-[state=on]:bg-accent` — [sidebar-project-view.md §2.3](./sidebar-project-view.md) |
| **All files** row Selected | `background/primary/light` | `bg-sidebar` |
| Row label | `foreground/secondary` | `text-secondary-foreground` |
| Row count badge | `foreground/default` | `text-foreground text-xs font-semibold` |
| Folder row Hover | `background/primary/light-hover` | см. §4 `treeRowStateClasses.hover` |
| Folder row Selected | `background/accent` | см. §4 `treeRowStateClasses.selected` |
| Active rail item | `background/primary/default` | `bg-primary text-primary-foreground` |
| Repo / branch selector | `background/default` + `border/default` | `bg-background border border-border` |
| Current branch label (Project) | `foreground/muted` | `text-muted-foreground text-xs` + `GitBranch` icon — read-only |
| Switch track OFF | `background/input` | `bg-input` |
| Switch track ON | `background/primary/default` | `bg-primary` |

### 3.2 Content Preview

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Panel background | implicit `background/default` | `bg-background` |
| Toolbar border | `border/default` | `border-border` |
| Breadcrumb title | `foreground/default` | `text-foreground text-lg` (content area, §2.2) |
| Changed toggle (Preview toolbar) | Label `foreground/default` + `Switch` sm | `text-sm font-medium` + shadcn `Switch` — [content-preview-project-view.md §2.1](./content-preview-project-view.md) |
| Toolbar slider zone | `flex-1` centered | Slider `120px` — [content-preview-project-view.md §2.1](./content-preview-project-view.md) |
| Search placeholder | `foreground/muted` | `text-muted-foreground` |
| Search input | `background/default` + `border/default` | `bg-background border-input` |
| Section header h4 | `foreground/default` | `text-foreground` |
| Slider track | `background/secondary/default` | `bg-secondary` |
| Slider thumb/fill | `icon/default` | `bg-foreground` |
| Thumbnail border | `border/default` | `border border-border rounded-md` |
| Marquee overlay | — | `bg-primary/10 border border-ring` |

### 3.3 Folder / File preview items

**Стек:** shadcn `Button` + `Badge` (VCS на файле). `FolderPreviewItem` — `Button variant="outline"`; `FilePreviewItem` — `Button variant="ghost"`.

| State | Figma | Tailwind / shadcn |
|-------|-------|-------------------|
| Default | transparent | `Button variant="ghost"` / `outline` |
| Hover | `background/primary/light-hover` | `hover:bg-accent rounded-md` |
| Selected | `background/accent` + `border/primary/default` | `bg-accent border border-ring rounded-md` |
| File name | `foreground/default` | `text-foreground text-xs` |
| Folder count | `foreground/muted` | `text-muted-foreground text-xs` |
| Status badge | `background/primary/default` + `foreground/primary/default` | `Badge` (default variant) |

### 3.4 Commit card

| Элемент | Figma | Tailwind / shadcn |
|---------|-------|-------------------|
| Card Default bg | `background/default` | `bg-background` |
| Card Selected bg | `background/accent` | `bg-accent` |
| Card border Default | `border/default` | `border-border` |
| Card border Hover | `border/primary/default` | `border-ring` |
| Title / author | `foreground/default` | `text-foreground` |
| Description | `foreground/muted` | `text-muted-foreground` |
| Files changed label | `foreground/muted` | `text-muted-foreground` |
| Added `+N` | `foreground/success/default` | `text-emerald-700` |
| Removed `−N` | `foreground/destructive/default` | `text-destructive` |
| Date Badge | `background/secondary` + `foreground/secondary` | `Badge variant="secondary"` |
| Tag Badge | `background/primary/default` + `foreground/primary/default` | `Badge variant="default"` |
| Head indicator | icon 16×16 | `GitBranch` 16×16 + `Tooltip` «Branch tip (HEAD)» — **icon only**, без pill |

### 3.5 History Preview / Diff view

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Panel background | `background/default` | `bg-background` |
| Commit header border | `border/default` | `border-border` |
| Files list header | `background/accent` | `bg-accent` |
| Selected file row | `background/primary/default` | `bg-primary text-primary-foreground` |
| File row hover | `background/accent` | `hover:bg-accent` |
| Diff toolbar border | `border/default` | `border-border` |
| Diff added line | — | `bg-emerald-500/15 dark:bg-emerald-950/50` |
| Diff added word | — | `bg-emerald-500/45 dark:bg-emerald-600/55` |
| Diff removed line | — | `bg-red-500/15 dark:bg-red-950/50` |
| Diff removed word | — | `bg-red-500/45 dark:bg-red-600/55` |
| Stub / empty text | `foreground/muted` | `text-muted-foreground` |
| Binary stub open button | `background/primary/default` + `foreground/primary/default` | `Button variant="default"` |
| Blend screenshot preview | `border/default` + image | `border border-border rounded-md object-contain max-w-[320px]` |
| Status badge A | success | `bg-emerald-600 text-white` |
| Status badge M | warning | `bg-amber-500 text-white` |
| Status badge D | destructive | `bg-destructive text-destructive-foreground` |
| Status badge N (untracked) | info | `bg-blue-600 text-white` |
| Status badge R | info | `bg-blue-600 text-white` |
| Image diff handle | `border/primary/default` | `border-ring bg-background` |
| Resize divider | `border/default` | `bg-border` |

### 3.8 Dark mode (Appearance)

При `theme = dark` (`class="dark"` на `<html>`) — те же семантические классы; значения из shadcn Zinc dark palette.

| Элемент | Light | Dark (ориентир) |
|---------|-------|-----------------|
| `bg-background` | `#ffffff` | `#09090b` |
| `bg-sidebar` / shell | `#fafafa` | `#18181b` |
| `bg-accent` | `#f4f4f5` | `#27272a` |
| `text-muted-foreground` | `#71717a` | `#a1a1aa` |
| Diff added line | `bg-emerald-50` | `bg-emerald-950/40` |
| Diff removed line | `bg-red-50` | `bg-red-950/40` |

Полный набор — сгенерировать `globals.css` через shadcn dark theme. Настройка: [settings-dialog.md §4](./settings-dialog.md).

### 3.6 Content Info

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Panel | `background/default` | `bg-background border-border` |
| Preview frame | `border/default` | `border border-border rounded-md` |
| Status badge | colorful VCS | `<span>` + `vcsStatusBadgeClass` — [design-tokens.md §3.5](./design-tokens.md); rule `.cursor/rules/status-badge-colors.mdc` |
| Lock badge | `background/secondary` | `Badge variant="secondary"` |
| Section header | `foreground/default` | `text-sm font-semibold` |
| Metadata label | `foreground/default` | `text-sm` |
| Disabled name input | `background/default` + border | `Input disabled` |
| Revert button | accent light | `Button variant="secondary"` |
| Compare button | outline | `Button variant="outline"` |
| Create commit | `background/primary/default` | `Button variant="default"` |

---

## 4. Состояния item — канон (Tailwind)

**Preview grid** (`FolderPreviewItem`, `FilePreviewItem`) — border на selected:

```tsx
export const itemStateClasses = {
  default: '',
  hover: 'bg-accent rounded-md',
  selected: 'bg-accent border border-ring rounded-md',
  selectedHover: 'bg-accent border border-ring rounded-md',
} as const
```

**Sidebar folder tree** (`FolderTreeRow`) — только фон, **без** border (плотный список):

```tsx
export const treeRowStateClasses = {
  default: '',
  hover: 'bg-accent rounded-md',
  selected: 'bg-accent rounded-md',
  selectedHover: 'bg-accent rounded-md',
} as const
```

### 4.5 Dropdown selector — канон v1.0

**Компонент:** `DropdownSelector` (`sources/gui/frontend/src/components/ui/dropdown-selector.tsx`).

**Стек:** shadcn/ui `Popover` + `Button` + `Label`. **Не** использовать нативный `<select>`.

| Часть | shadcn / Tailwind |
|-------|-------------------|
| **Trigger** | `Button variant="outline"` — `w-full justify-between gap-2 font-medium` |
| **Trigger label** | `truncate` внутри flex; полный текст в `title` |
| **Chevron** | `ChevronDown` `h-4 w-4 text-muted-foreground` справа |
| **Optional icon** | слева (`FolderGit2`, `GitBranch`), `text-muted-foreground` |
| **Panel** | `PopoverContent` — `max-h-56 w-[var(--radix-popover-trigger-width)] p-1` |
| **Item** | `Button variant="ghost"` — `w-full justify-start gap-2`; `Check` у выбранного |
| **Field label** | `Label` `text-xs text-muted-foreground` над trigger |
| **Disabled** | `disabled` на `Button` trigger |

**Специализации:**

| Компонент | База | Отличие |
|-----------|------|---------|
| `RepoSelector` | `Popover` + `Button` (как `DropdownSelector`) | footer «+ Add repository…», иконка `FolderGit2` |
| `InfoHistorySection` | `Button` + `Alert` | Views History при `commitCount > 0`; иначе Alert — [info-history-section.md](./info-history-section.md) |
| `BranchSelector` (History Sidebar) | `DropdownSelector` | checkout on select — [sidebar-history-view.md §2.6](./sidebar-history-view.md) |

**v1.1 (опционально):** shadcn `Command` внутри `Popover` для поиска в длинных списках.

### 4.6 Прочие shadcn-контролы (v1.0)

| Паттерн | shadcn primitive |
|---------|------------------|
| Диалоги (Settings, Create commit) | `Dialog` (`@radix-ui/react-dialog`) |
| Подтверждения (revert, dirty branch) | `ConfirmAlertDialog` → `AlertDialog` |
| Переключатель Changed | `Switch` + `Label` — **Content Preview toolbar** ([content-preview-project-view.md §2.1](./content-preview-project-view.md)) |
| **Toast** | shadcn `Toast` + `Toaster` — **top-right** (`fixed top-0 right-0`); notice auto-dismiss 4s; errors `variant="destructive"`, manual dismiss — [toast.md](./toast.md), [Figma `794:4504`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/shadcn-ui--The-Ultimate-UI-Kit-for-Figma--Community-?node-id=794-4504) |
| **`Alert`** | Inline callout ([Figma `162:2550`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=162-2550)) — preview panels, warnings; **не** для глобальных ошибок |
| Layout toggle (text/image diff) | `ToggleGroup` + `ToggleGroupItem` |
| Opacity slider (image overlay) | `Slider` |
| Commit date chip | `Badge variant="secondary"` |
| Commit card menu | `DropdownMenu` |
| Collapse headers (Metadata, History) | `Button variant="ghost"` |
| Breadcrumb, sort, retry, nav tabs | `Button` |
| Preview grid (`FilePreviewItem`, `FolderPreviewItem`) | `Button` + `Badge` (VCS) |

**Commit card** — отдельный паттерн (card, не grid item):

```tsx
export const commitCardStateClasses = {
  default: 'bg-background border-border',
  hover: 'bg-background border-ring',
  selected: 'bg-accent border-border',
  selectedHover: 'bg-accent border-ring',
} as const
```

---

## 5. Связанные документы

- [architecture.md](./architecture.md) — layout + §2.4 цвета Sidebar
- [panel-layout.md](./panel-layout.md)
- [api-contract.md](./api-contract.md)
- [multi-repo.md](./multi-repo.md)
- [sidebar-project-view.md](./sidebar-project-view.md)
- [sidebar-history-view.md](./sidebar-history-view.md)
- [content-preview-project-view.md](./content-preview-project-view.md)
- [content-preview-history-view.md](./content-preview-history-view.md)
- [preview-commit-header.md](./preview-commit-header.md)
- [history-changed-file-item.md](./history-changed-file-item.md)
- [diff-view.md](./diff-view.md)
- [text-diff-panel.md](./text-diff-panel.md)
- [image-diff-panel.md](./image-diff-panel.md)
- [binary-diff-stub.md](./binary-diff-stub.md)
- [deleted-diff-stub.md](./deleted-diff-stub.md)
- [info-history-section.md](./info-history-section.md)
- [content-info-project-view.md](./content-info-project-view.md)
- [folder-preview-item.md](./folder-preview-item.md)
- [file-preview-item.md](./file-preview-item.md)
- [toast.md](./toast.md)
