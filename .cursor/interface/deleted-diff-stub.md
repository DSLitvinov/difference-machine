# Deleted Diff Stub — спецификация

Заглушка для **удалённого файла** (status `D`) в Diff view.

**Figma (shadcn kit):** в составе [text diff `4028:5655`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4028-5655) (deleted row + empty diff)

**Стек:** React + shadcn/ui  
**Связанные документы:** [diff-view.md](./diff-view.md) · [history-changed-file-item.md](./history-changed-file-item.md) · [content-preview-history-view.md](./content-preview-history-view.md)

---

## 1. Назначение

Файл присутствовал в parent, удалён в commit. Inline diff не показывается — информирующая заглушка без действий открытия в v1.

---

## 2. Структура

```
        ┌──────────┐
        │  [FileX] │   48×48 muted
        └──────────┘
         File was deleted
    path/to/deleted/file.bin
  This file no longer exists in this commit
```

| # | Элемент | Spec |
|---|---------|------|
| Container | `flex flex-col items-center justify-center gap-2`, `min-h-full`, `px-4` |
| 1 | Icon | `FileX` 48×48, `text-muted-foreground` |
| 2 | Title | `text-sm font-medium text-foreground` — **File was deleted** |
| 3 | Path | `text-sm font-mono text-muted-foreground truncate max-w-full` |
| 4 | Subtitle | `text-sm text-muted-foreground` — `This file no longer exists in this commit` |

**Кнопки нет** в v1.

---

## 3. Связь со списком

В [history-changed-file-item.md](./history-changed-file-item.md) строка с badge `D` и path. Клик по строке → эта заглушка в Diff view (не image/text/binary panel).

---

## 4. Props

```ts
interface DeletedDiffStubProps {
  path: string
}
```

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| Длинный path | truncate + tooltip full path |
| Deleted image | **всегда** deleted stub, не image diff |
| Deleted text | deleted stub, не unified diff «all lines removed» |
| Unicode path | UTF-8 display |

### 5.1 Будущее (v2, не в scope)

- Опционально: preview parent blob для изображений «before only».
- Опционально: unified diff «all lines deleted» для text.

---

## 6. shadcn/ui

| UI | Component |
|----|-----------|
| Icon | lucide `FileX` |
| Layout | centered `flex flex-col` |
