# History Changed File Item — спецификация

Строка **changed file** в списке файлов коммита (**Content Preview → History view**).

**Figma (shadcn kit):** в составе [text diff `4028:5655`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655)

**Стек:** React + shadcn/ui (`Badge`, `Tooltip`)  
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
| `R` | Renamed | `bg-blue-600 text-white` |

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
| `↑` / `↓` | prev/next row (когда фокус в списке файлов Preview) |
| Double-click | **не используется** в v1 |

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
| Row | `div` / `button` role=`option` в listbox |
