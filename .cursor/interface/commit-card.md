# Commit Card — спецификация

Компонент списка коммитов в **Sidebar → History view**.

**Figma (shadcn kit):** [Commit card `4032:4194`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4032-4194) · legacy [4026:4490](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4490)

**Стек:** React + shadcn/ui (`Card`, `Badge`, `Tooltip`, `DropdownMenu`, `Button`)

**Связанные документы:** [sidebar-history-view.md](./sidebar-history-view.md) · [architecture.md](./architecture.md) · [design-tokens.md](./design-tokens.md)

---

## 1. Размеры и контейнер

| Token | Значение |
|-------|----------|
| Width | `269px` (`w-full` в panel 285px − `px-2`) |
| Padding | `12px` (`p-3`) |
| Gap content ↔ ⋮ | `8px` |
| Border radius | `8px` (`rounded-md`) |
| Vertical gap внутри content | `8px` |
| Gap между карточками в списке | `8px` (`space-y-2`) |

---

## 2. Структура (все состояния)

```
┌─────────────────────────────────────────────┐
│ [⑂] [⎇] Commit message               [⋮] │
│ Author                                      │
│ Description: Thank you for the…             │
│ 7 files changed  +12  -12                   │
│ [1 week ago]  [Tag]                         │
└─────────────────────────────────────────────┘
```

### 2.1 Header row

`flex items-center gap-1 w-full`

| # | Элемент | Size | Условие | Данные |
|---|---------|------|---------|--------|
| 1 | **Merge Icon** | 16×16 `GitMerge` | `parent_hashes.length > 1` | merge commit |
| 2 | **Head indicator** | 16×16 `GitBranch` icon | `hash ===` tip `historyBranch` | tooltip: «Branch tip (HEAD)» — **icon only**, без pill |
| 3 | **Title** | `text-sm font-semibold` | всегда | первая строка `message` |
| 4 | **⋮** | 16×16 `MoreVertical` | всегда | context menu §6 |

Title: `flex-1 min-w-0 truncate`.

### 2.2 Author

- `text-xs text-foreground`, full width.
- `commit.author`.

### 2.3 Description

Показывается **только если** в `message` есть body после `\n\n`.

- `text-xs text-muted-foreground`, `h-8`, `line-clamp-2`, `w-full`.
- Текст после `\n\n` в `message`; prefix `Description: ` optional.
- **Скриншот не используется** (убран из макета `4032:4194`).
- Если description пустой — **строка скрыта** целиком.

### 2.4 Files Changed row

`flex items-center gap-1 text-xs w-full` — **отдельная строка** над footer badges.

| Часть | Стиль | Данные |
|-------|-------|--------|
| Label | `text-muted-foreground`, truncate | `{total} files changed` |
| Added | `text-emerald-700` | `+ {files_added}` |
| Removed | `text-destructive` | `− {files_removed}` |

`total = files_added + files_removed` (или отдельное поле API `files_changed`).

Loading: skeleton `— files changed`. Error: скрыть строку.

### 2.5 Footer row (badges)

`flex items-center gap-2 w-full`

| Badge | Default state | Hover / Selected |
|-------|---------------|------------------|
| **Date Badge** | `Badge secondary`, text = relative time | то же + **Tooltip** с absolute date |
| **Tag Badge** | `Badge default` (тёмный), tag name | то же |

- Tag Badge **скрыт** если у коммита нет тега.
- Date Badge всегда виден (если valid `timestamp`).
- Relative: `formatDistanceToNow` (`1 week ago`).
- Tooltip on Date Badge hover: `Jun 22, 2025, 14:30` (locale).

---

## 3. Состояния (Default · Hover · Selected)

### 3.1 Матрица стилей

| Property | Default | Hover | Selected |
|----------|---------|-------|----------|
| **Background** | `bg-background` | `bg-background` | `bg-accent` |
| **Border** | `border-border` | `border-ring` | `border-border` |
| **Shadow** | none | none | none |
| **Cursor** | `pointer` | `pointer` | `pointer` |

> Hover меняет **только border** (`border-ring`). Selected — заливка `bg-accent`, border обычный. См. [design-tokens.md §3.4](./design-tokens.md).

### 3.2 Поведение состояний

```mermaid
stateDiagram-v2
  [*] --> Default
  Default --> Hover: mouseenter
  Hover --> Default: mouseleave
  Default --> Selected: click card
  Hover --> Selected: click card
  Selected --> Hover: mouseenter other card deselects
  Selected --> Default: click outside / ESC
```

| Правило | Деталь |
|---------|--------|
| **Один selected** | В списке только одна карточка `selectedCommitHash` |
| **Hover** | Только под курсором; selected card может одновременно не hover |
| **Hover + Selected** | `bg-accent border-ring` |
| **Keyboard** | `↑↓` move focus ring; `Enter` → Selected |
| **⋮ hover** | Не снимает selected; `stopPropagation` на menu trigger |

### 3.3 Tailwind / shadcn mapping

См. [design-tokens.md §4](./design-tokens.md) — `commitCardStateClasses`.

Transition: `transition-colors duration-150` на border и background.

### 3.4 Focus (a11y)

- Card focusable: `tabIndex={0}` или roving tabindex в списке.
- Focus visible: `ring-2 ring-ring ring-offset-2` (не путать с Selected).
- Selected ≠ focus: selected — данные; focus — keyboard navigation.

---

## 4. Данные (`CommitCardData`)

```ts
interface CommitCardData {
  hash: string
  author: string
  message: string
  timestamp: number
  parent_hashes: string[]
  tags?: string[]
  files_added?: number
  files_removed?: number
  files_changed?: number   // optional total label
  is_head: boolean         // derived
  is_merge: boolean        // derived
}
```

### 4.1 Парсинг message

```ts
function parseCommitMessage(message: string) {
  const [head, ...rest] = message.split(/\n\n+/, 2)
  return {
    title: head.split('\n')[0].trim(),
    description: rest[0]?.trim() ?? null,
  }
}
```

### 4.2 API

| Поле | Источник |
|------|----------|
| base | `log.get` |
| `tags` | extend `log.get` or `tag.list` |
| `files_*` | extend `log.get` or `commit.stats` |

---

## 5. Взаимодействие

| Жест | Действие |
|------|----------|
| Click card (not ⋮) | `onSelectionChange({ kind: 'commit', hash, branch })` |
| Click ⋮ | Open `DropdownMenu`, `e.stopPropagation()` |
| Click Date Badge | No-op (tooltip only) |
| Double-click card | v2: open Preview fullscreen |

---

## 6. Context menu (⋮)

`DropdownMenuContent` `align="end"` `side="bottom"`

| Item | API | Disabled when |
|------|-----|---------------|
| View in Preview | selection | — |
| Compare with working tree | `compare.extract` | — |
| Restore this version | `restore.version` | confirm |
| Revert commit | `commit.revert` | `is_head` |
| Reset to this commit | `commit.reset` | submenu |
| Copy hash | clipboard | — |
| Copy message | clipboard | — |

Destructive items → `AlertDialog` before execute.

---

## 7. Corner cases

| Case | UI |
|------|-----|
| No description | Скрыть строку description |
| No tag | Hide Tag Badge |
| No files stats | Hide Files Changed row |
| `timestamp` invalid | Date Badge `—`, no tooltip |
| Long title | truncate + `title` attr |
| Long tag name | truncate 12 chars + tooltip |
| Merge commit | Show Merge Icon |
| HEAD commit | Show Head indicator; disable Revert |
| List loading | `CommitCardSkeleton` × 3 |
| Empty log | Parent empty state, no cards |

---

## 8. Компоненты (файлы)

```
components/sidebar/history/
  CommitCard.tsx           # layout + state classes
  CommitCardStats.tsx      # Files Changed row
  CommitCardBadges.tsx     # Date + Tag
  CommitCardMenu.tsx       # ⋮ DropdownMenu
  CommitCardSkeleton.tsx
```

### Props

```ts
interface CommitCardProps {
  data: CommitCardData
  state: 'default' | 'hover' | 'selected' | 'selected-hover'
  onSelect: () => void
  onMenuAction: (action: CommitMenuAction) => void
}
```

---

## 9. Changelog vs предыдущая спека

| Изменение | Деталь |
|-----------|--------|
| Screenshot | **Удалён** — макет [4032:4194](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4032-4194) |
| Files Changed | Вынесен в **отдельную строку** с label `N files changed` |
| Footer | Только Date + Tag badges (без +/-) |
| States | Явно описаны Default / Hover / Selected |
| Hash badge | Удалён |
| Head indicator | **Icon only** (`GitBranch`) — без pill; [design-tokens.md §3.4](./design-tokens.md) |
