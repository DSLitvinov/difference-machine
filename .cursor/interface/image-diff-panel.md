# Image Diff Panel — спецификация

Панель **diff изображений** в Diff view: режимы **Split** и **Overlay**.

**Figma (shadcn kit):** [4030:3317](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-3317)

**Стек:** React + shadcn/ui (`Slider`)  
**Связанные документы:** [diff-view.md](./diff-view.md) · [content-preview-history-view.md](./content-preview-history-view.md) · [design-tokens.md](./design-tokens.md) §3.5

---

## 1. Назначение

Сравнение **parent (before)** и **commit (after)** для растровых файлов. Режим переключается в toolbar [diff-view.md](./diff-view.md).

**Расширения:** `png`, `jpg`, `jpeg`, `gif`, `webp`, `bmp`, `tiff`, `exr`.  
**Не image diff:** `svg` → [text-diff-panel.md](./text-diff-panel.md).  
**Deleted (D):** → [deleted-diff-stub.md](./deleted-diff-stub.md), не эта панель.

---

## 2. Данные

`GetCommitFileBlob(repoPath, parentHash, path)` + `GetCommitFileBlob(repoPath, commitHash, path)`.

```ts
interface ImageDiffPanelProps {
  beforeUrl?: string   // object URL or null
  afterUrl?: string
  status: 'added' | 'modified' | 'renamed'
  layout: 'split' | 'overlay'
  loading: boolean
  error: string | null
  onRetry: () => void
}
```

---

## 3. Mode: Split (default)

Как GitHub Desktop — вертикальный слайдер делит viewport:

```
┌─────────────────┬──┬─────────────────┐
│     Before      │▐│      After      │
│                 │▐│                 │
└─────────────────┴──┴─────────────────┘
```

| Token | Значение |
|-------|----------|
| Viewport | `relative flex-1 min-h-0`, checkerboard bg |
| Images | `object-contain`, max fill |
| Divider | vertical bar `border-ring`, drag handle ~4px hit area |
| Labels | `Before` / `After`, `text-xs text-muted-foreground`, углы |

- Slider position: 0–100% (default 50%).
- Drag обновляет clip-path или width левой/правой половины.

### 3.1 Added (A)

- Before: checkerboard + «No previous version» muted.
- After: image commit.

### 3.2 Modified / Renamed

- Оба blob при наличии.

---

## 4. Mode: Overlay

«Локовая кожа» — opacity верхнего слоя:

```
┌─────────────────────────────────────┐
│  [before - bottom, full opacity]    │
│  [after - top, opacity = slider]    │
├─────────────────────────────────────┤
│  ────●────────────────  opacity      │  horizontal Slider
└─────────────────────────────────────┘
```

| Layer | Source | Style |
|-------|--------|-------|
| Bottom | parent (before) | `position: absolute`, inset 0, `object-contain` |
| Top | commit (after) | `position: absolute`, inset 0, `opacity: sliderValue` |

- Slider: shadcn `Slider` horizontal, bottom of panel.
- 0% → только before; 100% → только after.

---

## 5. Фон и прозрачность

Checkerboard pattern для alpha PNG/WebP:

```css
/* semantic: bg-muted/50 + CSS checkerboard utility */
```

---

## 6. Состояния

| State | UI |
|-------|-----|
| Loading | `Skeleton` square centered |
| Error load blob | «Failed to load image» + Retry |
| One side missing (added) | placeholder на стороне before |

---

## 7. Corner cases

| Case | Поведение |
|------|-----------|
| Очень большое изображение | `object-contain`; downscale в GPU |
| EXR / HDR | v1: показать если OS/WebView поддерживает decode; иначе fallback binary stub |
| Corrupt blob | error state |
| Быстрая смена файла | revoke old object URLs |
| Initial commit | только after |
| Deleted in list | **не** монтировать ImageDiffPanel |

---

## 8. Подкомпоненты (React)

| Component | Responsibility |
|-----------|----------------|
| `ImageDiffSplit.tsx` | vertical slider mode |
| `ImageDiffOverlay.tsx` | opacity overlay mode |
| `ImageDiffPanel.tsx` | layout switch + blob fetch |

---

## 9. shadcn/ui

| UI | Component |
|----|-----------|
| Split divider | custom + `border-ring` |
| Overlay slider | `Slider` |
| Retry | `Button` variant `outline` |
