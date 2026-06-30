# Info History Section

Секция **History** в Content Info (single file): collapsible header + **Views History** (если есть коммиты) или **Alert** «нет истории» (если файл ни разу не коммитился).

**Видимость:** только при **single file** selection (`selectedFilePaths.length === 1`). При multiselect секция **не рендерится**.

**Figma (с историей):** [`4085:5098`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4085-5098) — History + **Views History** в File Viewer layout.

**Figma (без истории):** [`4027:5041`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4027-5041) — Alert «No history of changes»; кнопка **Views History** **скрыта**.

**Устарело в Content Info:** branch/commit pickers, Revert, Compare — перенесены в toolbar [file-history-view.md](./file-history-view.md) (§1.3).

**Связанные документы:** [content-info-project-view.md](./content-info-project-view.md) · [file-history-view.md](./file-history-view.md) · [file-viewer.md](./file-viewer.md)

---

## 1. Header

Collapsible; default **expanded**. Title `history.title` (**History**) + chevron (`ChevronUp` / `ChevronDown`).

---

## 2. Body — два состояния

Источник данных: `log.get { branch: currentBranch, path: filePath, max_count: 500 }` — **тот же запрос**, что в `ContentInfoPanel` для Metadata (editor/creator). Результат передаётся в секцию как `commitCount`; **отдельный fetch в секции не делать**.

| `commitCount` | `historyLoading` | UI |
|---------------|------------------|-----|
| `null` | `true` | body пустой (ни кнопка, ни alert — без flash) |
| `0` | `false` | **Alert** «нет истории»; кнопка **скрыта** |
| `> 0` | `false` | кнопка **Views History**; Alert **скрыт** |

### 2.1 Action — Views History (`commitCount > 0`)

| Token | Значение |
|-------|----------|
| Component | shadcn `Button` `variant="default"` |
| Width | `w-full` |
| Label | `fileHistory.view` — **Views History** |

```ts
openFileHistory(filePath)
// fileHistoryReturnMode = projectPreviewMode === 'fileViewer' ? 'fileViewer' : 'grid'
// projectPreviewMode = 'fileHistory'
```

| Откуда | После View |
|--------|------------|
| `grid` | Content Info **скрыта**; Back → grid |
| `fileViewer` | Content Info **скрыта**; Back → file viewer ([file-history-view.md §1.2.1](./file-history-view.md)) |

Кнопка **не рендерится**, если уже открыта история **этого же** файла — вместо неё пользователь в File History View; при возврате Back снова видна кнопка.

### 2.2 Empty state — Alert (`commitCount === 0`)

| Token | Значение |
|-------|----------|
| Component | shadcn `Alert` (default variant) |
| Icon | `Info` (`lucide-react`), `h-5 w-5` |
| Title | `fileHistory.noHistoryTitle` — **No history of changes** (`text-base font-medium`) |
| Description | `fileHistory.noHistoryDescription` — **The file is not added to any commit** (`text-muted-foreground`) |
| Layout | `flex flex-col gap-2` между кнопкой и alert (когда оба видны — только один из двух) |

**Figma:** [`4086:5420`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4086-5420) (Alert внутри `4027:5041`).

**Не делать:** disabled-кнопку View для never-committed файла; не открывать File History View с пустым commit list из Content Info.

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
  commitCount: number | null   // null = loading / unknown
  historyLoading: boolean
}
```

`ContentInfoPanel` держит `fileCommitCount`; сбрасывает в `null` при смене файла и в начале load; инвалидирует вместе с `previewGeneration` и `currentBranch`.

---

## 5. Corner cases

| Case | Поведение |
|------|-----------|
| Multiselect (2+ files) | секция **не монтируется** |
| File never committed (`commitCount === 0`) | **Views History** скрыта; Alert «нет истории» |
| Loading / смена файла | `commitCount === null` — body пустой до ответа `log.get` |
| `log.get` error | `commitCount` остаётся `null`; body пустой (ошибка в `appStore.setError`) |
| `fileViewer` + View | `fileHistoryReturnMode = 'fileViewer'`; `fileViewerPath` сохраняется |
| Rail → History | `exitSubPreviewViews()` — viewer и history сброшены |
| Collapsed header | Body (кнопка и Alert) скрыты вместе |
| Первый коммит после создания | После `previewGeneration` bump — `commitCount > 0`, показать кнопку |
