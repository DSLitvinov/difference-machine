# Image Diff Panel — спецификация

Панель **diff изображений** в Diff view: режимы **2-up**, **Swipe** и **Overlay**.

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

`blob.get` ×2: parent hash + commit hash ([api-contract.md §3.4](./api-contract.md)).

```ts
interface ImageDiffPanelProps {
  beforeUrl?: string   // object URL or null
  afterUrl?: string
  status: 'added' | 'modified' | 'renamed'
  layout: '2up' | 'swipe' | 'overlay'
  loading: boolean
  error: string | null
  onRetry: () => void
}
```

---

## 3. Mode: 2-up (default)

**2-up (рядом)** — обе версии бок о бок; удобно оценить общий вид и размер. При разных размерах `object-contain` в каждой половине показывает это наглядно (как GitHub Desktop).

```
┌─────────────────┬─────────────────┐
│     Before      │      After      │
│  object-contain │ object-contain  │
└─────────────────┴─────────────────┘
```

| Token | Значение |
|-------|----------|
| Layout | `flex`, две равные колонки, `divide-x` |
| Каждая панель | checkerboard + label + `object-contain` |
| Added (A) | Before: placeholder; After: image |

---

## 4. Mode: Swipe

**Swipe (прокрутка)** — попиксельное сравнение «было — стало»: оба кадра в одной позиции, разделитель сдвигает границу обрезки верхнего слоя. Паттерн как в [слайдере «было — стало»](https://thecode.media/slider-2/).

```
┌─────────────────────────────────────┐
│ After (clip)  │▐│  Before (full)    │
│  [верхний]    │▐│  [нижний слой]    │
└─────────────────────────────────────┘
         ↑ draggable divider
```

| Слой | Источник | Поведение |
|------|----------|-----------|
| **Нижний** | parent (before) | `absolute inset-0`, `object-contain`, на всю область |
| **Верхний** | commit (after) | `overflow: hidden`, ширина = позиция слайдера; `img` той же ширины, что контейнер (pixel-align) |
| **Разделитель** | — | вертикальная линия + круглая ручка, `cursor-col-resize` |

| Token | Значение |
|-------|----------|
| Viewport | `relative`, checkerboard bg, `overflow: hidden` |
| Slider position | 0–100% (default 50%) |
| Labels | `After` слева, `Before` справа — `text-xs`, полупрозрачный фон |
| Ввод | drag ручки; клик по области → переместить разделитель; touch |

Слева от разделителя — **after**, справа — **before** (просвечивает нижний слой).

### 4.1 Added (A)

- Before: checkerboard + «No previous version» muted.
- After: image commit (полный слой слева при position > 0).

### 4.2 Modified / Renamed

- Оба blob при наличии; пиксели совмещены через одинаковый `object-contain` и ширину `img` = ширина контейнера.

---

## 5. Mode: Overlay

«Наложение» — opacity верхнего слоя:

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

## 6. Фон и прозрачность

Checkerboard pattern для alpha PNG/WebP:

```css
/* semantic: bg-muted/50 + CSS checkerboard utility */
```

---

## 7. Состояния

| State | UI |
|-------|-----|
| Loading | `Skeleton` square centered |
| Error load blob | «Failed to load image» + Retry |
| One side missing (added) | placeholder на стороне before |

---

## 8. Corner cases

| Case | Поведение |
|------|-----------|
| Очень большое изображение | `object-contain`; downscale в GPU |
| EXR / HDR | v1: показать если OS/WebView поддерживает decode; иначе fallback binary stub |
| Corrupt blob | error state |
| Быстрая смена файла | revoke old object URLs |
| Initial commit | только after |
| Deleted in list | **не** монтировать ImageDiffPanel |
| Legacy localStorage `split` | трактуется как `swipe` |
| Нет сохранённого layout | default `2up` |

---

## 9. Подкомпоненты (React)

| Component | Responsibility |
|-----------|----------------|
| `ImageDiffTwoUp` | side-by-side mode (default) |
| `ImageDiffSwipe` | stacked swipe divider mode |
| `ImageDiffOverlay` | opacity overlay mode |
| `ImageDiffPanel.tsx` | layout switch |

---

## 10. shadcn/ui

| UI | Component |
|----|-----------|
| Swipe divider | custom + `border-ring` + round handle |
| Overlay slider | `Slider` |
| Retry | `Button` variant `outline` |
