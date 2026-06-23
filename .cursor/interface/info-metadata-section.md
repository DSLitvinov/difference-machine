# Info Metadata Section

Секция **Metadata** в Content Info (collapsible).

**Figma:** single [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) · multi [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898)

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md)

---

## 1. Header

| Element | Spec |
|---------|------|
| Title | `text-sm font-semibold` — `Metadata` |
| Chevron | `ChevronUp` / `ChevronDown` toggle collapse |
| Default | **expanded** |

---

## 2. Single file rows

Источник v1: **filesystem** (`file.metadata` API).

| Row | Source | Show when |
|-----|--------|-----------|
| **Locked** | `lock.list` → user | value present |
| **Editor** | — | **скрыт** v1 (нет данных) |
| **Modified** | `mtime` FS | always |
| **Dimensions** | image width×height | image only, if readable |
| **Size** | `size` FS | always |
| **Type** | extension / mime | always |
| **Creator** | — | **скрыт** v1 |
| **Created** | `birthtime` or `ctime` FS | if available |

**Правило:** пустые / недоступные поля — **не рендерить** (не показывать «—»).

### 2.1 Row layout

`flex w-full`: label `w-[120px] text-sm`, value `flex-1 text-sm`.

---

## 3. Multiselect rows

Только как на макете [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898):

| Row | Value |
|-----|-------|
| **Size** | Sum of file sizes — `sum size` formatted |
| **Type** | Unique extensions joined — `png, txt` |

---

## 4. Props

```ts
interface InfoMetadataSectionProps {
  mode: 'single' | 'multi'
  metadata?: FileMetadata | null
  multiSummary?: { totalSize: number; extensions: string[] }
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
}

interface FileMetadata {
  path: string
  size: number
  extension: string
  mime?: string
  modifiedAt: number
  createdAt?: number
  width?: number
  height?: number
  lockedBy?: string
}
```

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| Directory selected | N/A — folders not in file selection |
| 0 byte file | Size `0 B` |
| No created time (Linux) | hide Created row |
| blend | Type `blend`; no Dimensions unless thumb meta |
