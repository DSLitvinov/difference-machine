# Info File Preview — Tile

Атом **одной плитки** в multiselect stack.

**Figma:** [`4037:1843`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1843)

**Связанные документы:** [info-file-preview-multi.md](./info-file-preview-multi.md)

---

## 1. Размеры

| Token | Значение |
|-------|----------|
| Outer padding | `~9px` |
| Tile | `~110×110` (`109.714px` в Figma) |
| Border | `2.286px border-border` |
| Radius | `~18px` (`rounded-2xl`) |
| Icon | `File` lucide `~55×55` centered |
| Background | `bg-background` |

---

## 2. Состояния

v1: только **default** (icon). Нет hover/selected на tile — selection управляется в Preview grid.

---

## 3. Props

```ts
interface InfoFilePreviewTileProps {
  className?: string
  rotation?: number    // degrees, e.g. -15, 0, 15
  style?: React.CSSProperties  // absolute position in parent
}
```
