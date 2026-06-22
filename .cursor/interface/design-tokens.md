# Design tokens — shadcn/ui (Zinc light)

Единый справочник цветов для Forester GUI. Источник: [shadcn/ui — The Ultimate UI Kit for Figma (Community)](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/shadcn-ui--The-Ultimate-UI-Kit-for-Figma--Community-).

**Правило для разработки:** в React/Tailwind использовать **только семантические классы shadcn** (`bg-background`, `text-muted-foreground`, …). Hex и Figma-имена — справочно, не хардкодить в компонентах.

**Стек:** Wails + React + shadcn/ui (theme **Zinc**, mode **light**).

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
| Sidebar History | [4026:4547](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547) |
| Content Preview | [4026:4988](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4988) |
| Folder Item | [4026:5059](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5059) |
| File Item | [4026:5023](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5023) |
| Preview thumbnail | [4026:5020](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5020) |
| Folder icon | [4026:5054](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-5054) |

### 3.1 Sidebar shell

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Shell | `background/primary/light` | `bg-sidebar` |
| Outer border | `border/default` | `border-border` |
| List Container | `background/default` | `bg-background` |
| Header title | `foreground/accent` | `text-foreground font-semibold` |
| Section label «Folders» | `foreground/muted` | `text-muted-foreground text-xs font-semibold` |
| Row label | `foreground/secondary` | `text-secondary-foreground` |
| Row count badge | `foreground/default` | `text-foreground text-xs font-semibold` |
| Selected row | `background/primary/light` | `bg-sidebar` или `bg-accent`† |
| Active rail item | `background/primary/default` | `bg-primary text-primary-foreground` |
| Repo / branch selector | `background/default` + `border/default` | `bg-background border border-border` |
| Switch track OFF | `background/input` | `bg-input` |
| Switch track ON | `background/primary/default` | `bg-primary` |

† Selected sidebar row в Figma `#fafafa`; `bg-accent` = `#f4f4f5`. Предпочтительно **`bg-sidebar`** (`#fafafa`) для pixel-match.

### 3.2 Content Preview

| Элемент | Figma | Tailwind |
|---------|-------|----------|
| Panel background | implicit `background/default` | `bg-background` |
| Toolbar border | `border/default` | `border-border` |
| Breadcrumb title | `foreground/default` | `text-foreground text-lg` |
| Search placeholder | `foreground/muted` | `text-muted-foreground` |
| Search input | `background/default` + `border/default` | `bg-background border-input` |
| Section header h4 | `foreground/default` | `text-foreground` |
| Slider track | `background/secondary/default` | `bg-secondary` |
| Slider thumb/fill | `icon/default` | `bg-foreground` |
| Thumbnail border | `border/default` | `border border-border rounded-md` |
| Marquee overlay | — | `bg-primary/10 border border-ring` |

### 3.3 Folder / File preview items

| State | Figma | Tailwind |
|-------|-------|----------|
| Default | transparent | — |
| Hover | `background/primary/light-hover` | `bg-accent rounded-md` |
| Selected | `background/accent` + `border/primary/default` | `bg-accent border border-ring rounded-md` |
| File name | `foreground/default` | `text-foreground text-xs` |
| Folder count | `foreground/muted` | `text-muted-foreground text-xs` |
| Status badge | `background/primary/default` + `foreground/primary/default` | `bg-primary text-primary-foreground` |

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
| Tag / Head Badge | `background/primary/default` + `foreground/primary/default` | `Badge variant="default"` |

---

## 4. Состояния item — сводка (Tailwind only)

```tsx
// Shared pattern: FolderPreviewItem, FilePreviewItem, FolderTreeRow (sidebar)
const itemStateClasses = {
  default: '',
  hover: 'bg-accent rounded-md',
  selected: 'bg-accent border border-ring rounded-md',
  selectedHover: 'bg-accent border border-ring rounded-md',
} as const

// Sidebar tree row — use bg-sidebar instead of bg-accent for #fafafa match
const sidebarRowStateClasses = {
  default: '',
  hover: 'bg-sidebar rounded-sm',
  selected: 'bg-sidebar rounded-sm',
  selectedHover: 'bg-sidebar rounded-sm',
} as const

// Commit card
const commitCardStateClasses = {
  default: 'bg-background border-border',
  hover: 'bg-background border-ring',
  selected: 'bg-accent border-border',
  selectedHover: 'bg-accent border-ring',
} as const
```

---

## 5. Связанные документы

- [architecture.md](./architecture.md) — layout + §2.4 цвета Sidebar
- [sidebar-project-view.md](./sidebar-project-view.md)
- [sidebar-history-view.md](./sidebar-history-view.md)
- [content-preview-project-view.md](./content-preview-project-view.md)
- [folder-preview-item.md](./folder-preview-item.md)
- [file-preview-item.md](./file-preview-item.md)
- [commit-card.md](./commit-card.md)
