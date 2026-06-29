# Info History Section

Секция **History** в Content Info (single file): collapsible header + кнопка **View** для входа в [File History View](./file-history-view.md).

**Видимость:** только при **single file** selection (`selectedFilePaths.length === 1`). При multiselect секция **не рендерится**.

**Figma (актуальный):** [`4085:5098`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4085-5098) — History + **View** в File Viewer layout.

**Устарело в Content Info:** branch/commit pickers, Revert, Compare — перенесены в toolbar [file-history-view.md](./file-history-view.md) (§1.3).

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [file-history-view.md](./file-history-view.md) · [file-viewer.md](./file-viewer.md)

---

## 1. Header

Collapsible; default **expanded**. Title `history.title` (**History**) + chevron (`ChevronUp` / `ChevronDown`).

---

## 2. Action — View

| Token | Значение |
|-------|----------|
| Component | shadcn `Button` `variant="default"` |
| Width | `w-full` |
| Label | `fileHistory.view` — **View** (v1.1 optional: «View history» per Figma) |

### Поведение

```ts
openFileHistory(filePath)
// fileHistoryReturnMode = projectPreviewMode === 'fileViewer' ? 'fileViewer' : 'grid'
// projectPreviewMode = 'fileHistory'
```

| Откуда | После View |
|--------|------------|
| `grid` | Content Info **скрыта**; Back → grid |
| `fileViewer` | Content Info **скрыта**; Back → file viewer ([file-history-view.md §1.2.1](./file-history-view.md)) |

Кнопка **disabled**, если уже открыта история **этого же** файла (`projectPreviewMode === 'fileHistory' && fileHistoryPath === filePath`).

---

## 3. Что не входит в секцию (v1)

| Control | Где |
|---------|-----|
| Branch picker | File History View toolbar |
| Commit picker | File History View toolbar |
| Revert | File History View toolbar |
| Compare | File History View toolbar |

API: `log.get`+`path`, `restore.file`, `compare.extract` — [file-history-view.md §3–§5](./file-history-view.md), [api-contract.md](./api-contract.md).

---

## 4. Props (implementation)

```ts
interface InfoHistorySectionProps {
  filePath: string
}
```

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| Multiselect (2+ files) | секция **не монтируется** |
| File never committed | View открывает File History с empty commit list |
| `fileViewer` + View | `fileHistoryReturnMode = 'fileViewer'`; `fileViewerPath` сохраняется |
| Rail → History | `exitSubPreviewViews()` — viewer и history сброшены |
| Collapsed header | Кнопка View скрыта вместе с body |
