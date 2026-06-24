# Info File Preview — Single

Атом превью **одного файла** в Content Info.

**Figma:** [`4037:707`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-707) (в составе [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041))

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [design-tokens.md](./design-tokens.md) §3.6

---

## 1. Структура

```
┌────────────────────────┐
│                        │
│    312 × 312 preview   │
│         [status]       │
│              [lock]    │
└────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Frame | `312×312`, `border border-border rounded-md` |
| Container | `relative`, centered in panel |

---

## 2. Контент по типу файла

```ts
type InfoPreviewKind = 'image' | 'text' | 'binary' | 'blend'

function classifyInfoPreview(ext: string): InfoPreviewKind {
  if (isImageExt(ext)) return 'image'       // png, jpg, … exr; NOT svg
  if (ext.toLowerCase() === 'blend') return 'blend'
  if (isTextExt(ext)) return 'text'         // incl. svg, code, txt
  return 'binary'
}
```

| Kind | Content |
|------|---------|
| **image** | `<img>` `object-cover`, from `workdir.thumbnail` / direct read |
| **text** | **Text stub** — placeholder icon (generic document); **SVG иллюстрация позже** |
| **binary** | **Binary stub** — другая иконка (`FileQuestion` / archive) |
| **blend** | `workdir.thumbnail` blend preview **или** blend stub если нет thumb |

### 2.1 Text stub (v1)

- Centered icon 48–64px `text-muted-foreground`
- Optional muted label `Text file` (можно без текста)
- **Без** содержимого файла

### 2.2 Binary stub (v1)

- Icon `FileArchive` / `FileBinary` 48–64px
- Отличается от text stub визуально

### 2.3 Blend

- API: `workdir.thumbnail` → `kind: "image"` (PNG) или `placeholder` — см. [api-contract.md §4.3.2](./api-contract.md).
- Источники (backend, без запуска Blender):
  1. OS cache: `~/.thumbnails/{large,normal}/` (Win/macOS) или `$XDG_CACHE_HOME/thumbnails/` (Linux)
  2. Embedded `TEST` chunk в `.blend` (fallback)
- Success: `<img>` `object-contain`, checkerboard if alpha
- Fail: blend-specific stub (`FileArchive` icon)
- **Не путать** с History diff screenshot (`commit.get`) — [decisions.md §7.8](./decisions.md)

### 2.4 Loading / error

| State | UI |
|-------|-----|
| Loading | `Skeleton` 312×312 |
| Error | stub по kind + retry optional |

---

## 3. Badges (overlay)

Позиции как на макете — bottom area, overlapping frame.

| Badge | Условие | Style |
|-------|---------|-------|
| **status** | VCS ≠ clean | `<span>` + `vcsStatusBadgeClass` — `A`/`M`/`D`/`N` ([design-tokens.md §3.5](./design-tokens.md)) |
| **lock** | `lock.list` has entry for file+branch | `bg-secondary` — текст `lock`; tooltip `Locked by {user}` |

- status **скрыт** если clean
- lock **скрыт** если не заблокирован
- Tooltip: full status word / `Locked by {user}`

---

## 4. Props

```ts
interface InfoFilePreviewSingleProps {
  path: string
  vcsStatus?: VcsFileStatus
  lock?: { user: string } | null
  previewUrl?: string | null
  kind: InfoPreviewKind
  loading?: boolean
}
```

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| svg | text stub (не image preview) |
| deleted file on disk | stub + no thumbnail |
| Very large image | downscale in thumbnail API |
| Lock expired | hide lock badge after refresh |
