# Info File Preview — Multi

Атом превью **multiselect** (2+ файлов) в Content Info.

**Figma:** [`4037:1879`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1879) (в составе [`4037:1898`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1898))

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [info-file-preview-tile.md](./info-file-preview-tile.md)

---

## 1. Структура

```
┌────────────────────────┐
│    ┌──┐              │
│    │  │  ┌──┐        │   312×312 outer frame
│    └──┘  └──┘        │
│      [tile] [tile]   │
└────────────────────────┘
```

| Token | Значение |
|-------|----------|
| Outer frame | `312×312`, `border border-border rounded-md`, `relative` |
| Tiles | [info-file-preview-tile.md](./info-file-preview-tile.md) |

---

## 2. Раскладка tiles

| Count | Layout |
|-------|--------|
| **2** | center + one rotated ±15° (как макет) |
| **3** | center + left `-rotate-15` + right `+rotate-15` |
| **4+** | show **3** tiles max; v1.1: `+N` overlay |

Каждый tile — generic **file icon** в макете (не per-type preview в multiselect v1).

### 2.1 v1 simplification

Все tiles используют **file icon** stub [`4037:1843`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4037-1843) — без загрузки N thumbnails (performance).

v1.1: optional thumb for first 3 files by type.

---

## 3. Props

```ts
interface InfoFilePreviewMultiProps {
  paths: string[]
}
```

---

## 4. Corner cases

| Case | Поведение |
|------|-----------|
| 2 files | 2 tiles |
| 20 files | 3 tiles + optional «+17» muted text below frame v1.1 |
| Selection changes | re-layout animation optional (v1: instant) |
