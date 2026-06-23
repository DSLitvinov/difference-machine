# Text Diff Panel — спецификация

Панель **текстового diff** в Diff view (**Content Preview → History**). Включает `svg` (не image diff).

**Figma (shadcn kit):** [4028:5655](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655)

**Стек:** React + shadcn/ui (`ScrollArea`)  
**Связанные документы:** [diff-view.md](./diff-view.md) · [content-preview-history-view.md](./content-preview-history-view.md) · [design-tokens.md](./design-tokens.md) §3.5

---

## 1. Назначение

Отображает diff **commit vs first parent** для текстовых файлов. Режимы **Unified** (default) и **Split** переключаются в toolbar [diff-view.md](./diff-view.md).

---

## 2. Режимы

### 2.1 Unified (default)

Одна прокручиваемая колонка:

```
@@ -10,3 +10,4 @@
 context line
-removed line
+added line
 context line
```

| Line kind | Prefix | Style |
|-----------|--------|-------|
| context | space | default bg |
| add | `+` | `bg-emerald-50 text-emerald-900` |
| del | `−` | `bg-red-50 text-red-900` |
| hunk header | `@@` | `text-muted-foreground font-mono` |

- Font: `font-mono text-xs` или `text-sm`.
- `ScrollArea` vertical.

### 2.2 Split

Две колонки **Parent** | **Commit**, синхронный vertical scroll:

| Column | Header | Content |
|--------|--------|---------|
| Left | `Parent` muted label | deleted + context from old |
| Right | `Commit` muted label | added + context from new |

- Разделитель: `border-r border-border`.
- Пустая сторона для pure add/delete hunks — placeholder lines или blank.

---

## 3. Данные

Источник: `diff.text` ([api-contract.md §3.3](./api-contract.md), [content-preview-history-view.md §5](./content-preview-history-view.md)).

```ts
interface TextDiffResult {
  unified: string
  hunks: DiffHunk[]
  is_too_large: boolean
}

interface DiffHunk {
  old_start: number
  old_lines: number
  new_start: number
  new_lines: number
  lines: Array<{ kind: 'context' | 'add' | 'del'; text: string }>
}
```

---

## 4. Состояния

| State | UI |
|-------|-----|
| Loading | `Skeleton` lines |
| Empty diff (rename only) | centered `text-muted-foreground`: «No content changes» |
| Too large | warning banner + «Show anyway» / truncated preview |
| Error | делегируется родителю `DiffView` |

### 4.1 Syntax highlight

**v1:** plain monospace, без подсветки.  
**v1.1:** optional highlight по расширению.

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| Initial commit (no parent) | все строки как `add` |
| Renamed (R), content changed | diff new path vs parent old mapping |
| Renamed, content identical | empty state §4 |
| `is_binary: true` от API | **не рендерить** — родитель показывает binary stub |
| CRLF / UTF-8 | preserve; no corrupt display |
| >50k lines | `is_too_large` gate |
| Tab characters | render as-is in mono |

---

## 6. Props

```ts
interface TextDiffPanelProps {
  diff: TextDiffResult | null
  layout: 'unified' | 'split'
  loading: boolean
}
```

---

## 7. shadcn/ui

| UI | Component |
|----|-----------|
| Scroll | `ScrollArea` |
| Warning | `Alert` |
| Show anyway | `Button` variant `outline` |
