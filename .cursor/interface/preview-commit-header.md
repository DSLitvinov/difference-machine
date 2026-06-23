# Preview Commit Header — спецификация

Блок **заголовка коммита** в **Content Preview → History view** (над split-pane files + diff).

**Не путать с** [commit-card.md](./commit-card.md) — карточка в **Sidebar**; здесь компактный header без description (только title + author + hash).

**Figma (shadcn kit):** в составе [text diff `4028:5655`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655)

**Стек:** React + shadcn/ui (`Badge`, `Button`, `Tooltip`, `Skeleton`)  
**Связанные документы:** [content-preview-history-view.md](./content-preview-history-view.md) · [commit-card.md](./commit-card.md) · [design-tokens.md](./design-tokens.md)

---

## 1. Назначение

Показывает контекст выбранного коммита: merge/Head, title, author, hash, stats. Данные из `commit.get` + `diff.stat` / `diff.name_status` ([api-contract.md](./api-contract.md)).

---

## 2. Размеры и структура

```
┌──────────────────────────────────────────────────────────────┐
│ [⑂] [⎇]  Commit message title                             │
│ Author name                                                   │
│ abc1234…  [Copy]              7 files changed  +12  −12      │
└──────────────────────────────────────────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Container | `px-4 py-3`, `border-b border-border`, `bg-background` |
| Title row gap | `gap-1` |
| Title ↔ author gap | `4px` vertical |
| Stats row | `flex` space-between или trailing group |

---

## 3. Элементы

| # | Элемент | Spec | Условие | Данные |
|---|---------|------|---------|--------|
| 1 | Merge icon | `GitMerge` 16×16 | `parent_hashes.length > 1` | merge commit |
| 2 | Head indicator | `GitBranch` 16×16 + `Tooltip` | `hash ===` tip `currentBranch` | «Branch tip (HEAD)» — **icon only**, без pill ([design-tokens.md §3.4](./design-tokens.md)) |
| 3 | Title | `text-base font-semibold truncate flex-1` | всегда | первая строка `message` |
| 4 | Author | `text-sm text-foreground` | всегда | `commit.author` |
| 5 | Short hash | `text-xs font-mono text-muted-foreground` | всегда | 7–8 символов |
| 6 | Copy button | `Button` ghost, icon `Copy` или label | всегда | clipboard full hash |
| 7 | Stats label | `text-xs text-muted-foreground` | всегда | `{n} files changed` |
| 8 | Added | `text-xs text-emerald-700` | `files_added > 0` | `+{n}` |
| 9 | Removed | `text-xs text-destructive` | `files_removed > 0` | `−{n}` |

### 3.1 Отличия от Commit Card (Sidebar)

| | Commit Card | Preview Commit Header |
|---|-------------|----------------------|
| Description | 2-line clamp (optional) | **нет** (только title) |
| Date / Tag badges | да | **нет** (только Head icon) |
| ⋮ menu | да | **нет** |
| Hash + copy | нет | **да** |

---

## 4. Состояния

| State | UI |
|-------|-----|
| Loading | `Skeleton` на title, author, stats |
| Loaded | полный layout |
| Error | inline `Alert` / banner под title: «Failed to load commit» + Retry |
| No commit selected | компонент **не монтируется** (empty state родителя) |

### 4.1 Copy hash

- Click Copy → `navigator.clipboard.writeText(fullHash)`.
- Toast «Copied» (optional).
- `Cmd/Ctrl+C` при фокусе на кнопке.

---

## 5. Props

```ts
interface PreviewCommitHeaderProps {
  commit: CommitDetail | null
  currentBranch: string
  filesChangedCount: number
  filesAdded: number
  filesRemoved: number
  loading: boolean
  error: string | null
  onRetry?: () => void
}
```

---

## 6. Corner cases

| Case | Поведение |
|------|-----------|
| Пустой `message` | Title fallback: `(no message)` |
| Только subject, без body | Title = subject |
| `files_changed === 0` | `0 files changed`, без +/− |
| Merge без icon data | скрыть merge icon |
| Head на другой ветке | Head icon **не** показывать |
| Очень длинный author | truncate + tooltip |

---

## 7. shadcn/ui

| UI | Component |
|----|-----------|
| Head indicator | `GitBranch` 16×16 + `Tooltip` |
| Copy | `Button` variant `ghost` size `sm` |
| Loading | `Skeleton` |
| Error | `Alert` variant `destructive` |
