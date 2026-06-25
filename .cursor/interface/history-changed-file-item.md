# History Changed File Item — спецификация

Строка **changed file** в списке файлов коммита (**Content Preview → History view**).

**Figma (shadcn kit):** в составе [text diff `4028:5655`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655)

**Стек:** React + shadcn/ui (`Badge`, `Tooltip`, `DropdownMenu`)
**Связанные документы:** [content-preview-history-view.md](./content-preview-history-view.md) · [design-tokens.md](./design-tokens.md) §3.5

---

## 1. Назначение

Одна запись в левой колонке History Preview: status badge + путь. **Single select** — клик выбирает файл и загружает Diff view. Multiselect **нет**.

---

## 2. Размеры и структура

```
┌────────────────────────────────────────┐
│ [A]  assets/textures/new_banner.png    │
└────────────────────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Row padding | `px-3 py-2` |
| Gap badge ↔ path | `8px` (`gap-2`) |
| Badge min size | `20×20` |
| Path | `text-sm`, `truncate`, `flex-1` |
| Row width | `w-full` |

---

## 3. Status badge

Всегда виден (в отличие от [file-preview-item.md](./file-preview-item.md) — там badge optional).

| Code | Meaning | Tailwind |
|------|---------|----------|
| `A` | Added | `bg-emerald-600 text-white` |
| `M` | Modified | `bg-amber-500 text-white` |
| `D` | Deleted | `bg-destructive text-destructive-foreground` |
| `R` | Renamed | `bg-blue-600 text-white` | Когда `diff.name_status` отдаёт rename |

- `Badge` compact, mono letter, `text-xs font-semibold`.
- `Tooltip`: полное слово (`Added`, `Modified`, `Deleted`, `Renamed`).
- В состоянии **Selected** badge **сохраняет** свой цвет (не инвертируется в primary-foreground).

---

## 4. Path display

| `status` | Текст в колонке path |
|----------|----------------------|
| `added`, `modified` | `relative/path.ext` |
| `deleted` | `relative/path.ext` (путь в parent) |
| `renamed` | `old/path → new/path` (middle truncate `…`) |

- Full path в `title` tooltip.
- Unicode paths — UTF-8, без escape.

---

## 5. Состояния (Default · Hover · Selected)

| Property | Default | Hover | Selected |
|----------|---------|-------|----------|
| Background | transparent | `bg-accent` | `bg-primary` |
| Path color | `text-foreground` | `text-foreground` | `text-primary-foreground` |
| Cursor | `pointer` | `pointer` | `pointer` |

Selected + hover: без изменений (остаётся `bg-primary`).

---

## 6. Поведение

| Жест | Действие |
|------|----------|
| Click | `onSelect(file.path)` → обновить Diff view |
| Right-click | Select row + open context menu (§6.1) |
| `↑` / `↓` | prev/next row (когда фокус в списке файлов Preview) |
| Double-click | **не используется** в v1 |

### 6.1 Context menu

Меню открывается по правому клику на строке и не содержит destructive-действий, потому что файл находится внутри исторического commit snapshot.

| Item | Action | Disabled |
|------|--------|----------|
| Show diff | Select file and show Diff view | never |
| Open from commit | `openCommitFile(commitHash, path)` | deleted file |
| Copy path | Copy current repo-relative path | never |
| Copy file name | Copy basename | empty path |
| Copy previous path | Copy `old_path` | only shown for rename |
| Copy status | Copy status label (`Added`, `Modified`, etc.) | never |

Footer: truncated full display path (`old → new` for rename).

---

## 7. Props (TypeScript)

```ts
type ChangedFileStatus = 'added' | 'modified' | 'deleted' | 'renamed'

interface HistoryChangedFileItemProps {
  path: string
  oldPath?: string
  status: ChangedFileStatus
  selected: boolean
  onSelect: (path: string) => void
}
```

---

## 8. Corner cases

| Case | Поведение |
|------|-----------|
| Очень длинный путь | `truncate` + tooltip |
| Rename `old → new` оба длинные | middle ellipsis на path |
| Единственный файл в коммите | Selected по умолчанию (логика родителя) |
| Файл исчез после refresh | родитель сбрасывает selection |
| Emoji в имени | нормальный рендер |

---

## 9. shadcn/ui

| UI | Component |
|----|-----------|
| Badge | `Badge` |
| Tooltip | `Tooltip` + `TooltipTrigger` + `TooltipContent` |
| Context menu | `DropdownMenu` at pointer position |
| Row | `div` / `button` role=`option` в listbox |
