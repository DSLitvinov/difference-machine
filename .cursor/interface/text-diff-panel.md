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

Одна прокручиваемая колонка в стиле **GitHub Desktop**:

```
┌────┬────┬──────────────────────────────┐
│  1 │  1 │  context line                │
│  2 │    │ -removed (word highlight)  │
│    │  2 │ +added   (word highlight)  │
└────┴────┴──────────────────────────────┘
@@ -10,3 +10,4 @@
```

| Element | Style |
|---------|-------|
| Gutter | две колонки номеров (old \| new), `tabular-nums`, `text-muted-foreground` |
| context | нейтральный фон |
| add | `+` prefix, зелёный фон строки + ярче изменённые слова |
| del | `−` prefix, красный фон строки + ярче изменённые слова |
| hunk header | `@@ … @@`, `bg-muted/40`, без `---` / `+++` |
| Font | `font-mono text-xs`, `whitespace-pre` |

**Intraline diff:** как GitHub Desktop — `relativeChanges` на уровне символов; только когда в блоке подряд идущих `+`/`-` строк их количество совпадает.

**Context lines:** API отдаёт unified diff с 3 строками контекста вокруг изменений (как `git diff -U3`).

### 2.2 Split

Две колонки **Parent** | **Commit**, синхронный vertical scroll:

| Column | Header | Content |
|--------|--------|---------|
| Left | `Parent` muted label | deleted + context; intraline highlight на del |
| Right | `Commit` muted label | added + context; intraline highlight на add |

- Разделитель: `border-r border-border`.
- Пустая сторона для pure add/delete — blank line с выравниванием по высоте.
- Изменённые строки (равное число `+` и `-` подряд) — **одна строка** Modified: old слева, new справа.
- Номера строк — одна колонка на панель.

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

### 4.1 Syntax highlight / intraline

**v1:** plain monospace + **word-level intraline diff** на соседних `-`/`+` (как GitHub Desktop).  
**v1.1:** optional syntax highlight по расширению.

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
