# Info File Preview — Single

Атом превью **одного файла** в Content Info и (вариант `expanded`) в [File Viewer](./file-viewer.md).

**Figma:** [`4037:707`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-707) (compact, Content Info) · viewer area [`4084:7698`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4084-7698)

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [file-viewer.md](./file-viewer.md) · [design-tokens.md](./design-tokens.md) §3.6

---

## 1. Варианты (`variant`)

| Variant | Где | Frame | Badges |
|---------|-----|-------|--------|
| `compact` (default) | Content Info | `h-[200px]`, `max-w-[312px]`, centered | status + lock |
| `expanded` | File Viewer center | `h-full min-h-[200px] w-full` | **скрыты** (badges только в Content Info) |

```ts
interface InfoFilePreviewSingleProps {
  path: string
  vcsStatus: VcsFileStatus | null
  lockUser: string | null
  kind: InfoPreviewKind
  loading?: boolean
  variant?: 'compact' | 'expanded'
}
```

Загрузка: `useWorkdirPreview` + [workdirPreviewCache](../../rules/virtual-scroll-preview-ux.mdc).

---

## 2. Структура (compact)

```
┌────────────────────────┐
│                        │
│    preview 312×200     │
│         [status]       │
│              [lock]    │
└────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Frame | `border border-border rounded-md bg-muted/30` |
| Container | `relative`, centered in panel (`mx-auto` для compact) |

---

## 3. Контент по типу файла

```ts
type InfoPreviewKind = 'image' | 'text' | 'binary' | 'blend'
```

| Kind | Content |
|------|---------|
| **image** | `<img>` — compact: `object-cover`; expanded: `object-contain` |
| **text** | `<pre>` snippet из `useWorkdirPreview` (truncated API); compact: `text-[11px]`; expanded: `text-sm` |
| **binary** | Centered stub icon (`FileArchive`) |
| **blend** | `<img>` `object-contain` или blend stub |

Классификация: `classifyInfoPreview(path)` — [content-info-project-view.md §1.3](./content-info-project-view.md).

### 3.1 Blend

- API: `workdir.thumbnail` — [api-contract.md §4.3.2](./api-contract.md)
- Fail: blend-specific stub (`FileArchive` icon, 48px compact / 64px expanded)

### 3.2 Loading

| State | UI |
|-------|-----|
| Loading metadata | `Loader2` spinner |
| Loading preview | spinner до `previewUrl` / `textPreview` |

### 3.3 Deleted (VCS)

`vcsStatus === 'deleted' | 'staged-deleted'` → preview не грузится (`path` null в hook); `opacity-50` на img если показан stub.

---

## 4. Badges (overlay, `compact` only)

| Badge | Условие | Style |
|-------|---------|-------|
| **status** | VCS ≠ clean | `vcsStatusBadgeClass` — `A`/`M`/`D`/`N` |
| **lock** | `lockUser` set | `bg-secondary` — `info.lock`; tooltip `info.lockedBy` |

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| svg | text kind — snippet в pre |
| deleted file on disk | stub + no thumbnail |
| Very large image | downscale in thumbnail API |
| File Viewer resize | expanded reflow; cache сохраняется |
| Lock expired | hide lock badge after refresh |
