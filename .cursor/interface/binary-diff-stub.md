# Binary Diff Stub — спецификация

Заглушка **бинарного файла** в Diff view (не текст, не image).

**Figma (shadcn kit):**
- Generic binary: [4031:3754](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4031-3754)
- **`.blend` + screenshot:** [4030:2796](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4030-2796)

**Стек:** React + shadcn/ui (`Button`)  
**Связанные документы:** [diff-view.md](./diff-view.md) · [content-preview-history-view.md](./content-preview-history-view.md) · [design-tokens.md](./design-tokens.md) §3.5

---

## 1. Назначение

Файл нельзя отобразить inline как diff. Пользователь открывает blob **версии коммита** через кнопку и приложение ОС по умолчанию.

Для **`.blend`** — вместо generic-иконки показывается **скриншот коммита** (viewport preview из Blender при коммите), если он доступен.

---

## 2. Варианты layout

### 2.1 Generic binary (default)

Расширение **не** `.blend`, или `.blend` без скриншота.

```
        ┌──────────┐
        │  [icon]  │   48×48
        └──────────┘
  This binary file cannot be displayed
  Open in external application to view

      [ Open in external application ]
```

| # | Элемент | Spec |
|---|---------|------|
| Container | `flex flex-col items-center justify-center gap-3`, `min-h-full`, `px-4` |
| 1 | Icon | `FileQuestion` 48×48, `text-muted-foreground` |
| 2 | Title | `text-sm font-medium text-foreground` — `This binary file cannot be displayed` |
| 3 | Subtitle | `text-sm text-muted-foreground` — `Open in external application to view` |
| 4 | Button | `Button variant="default"` — `Open in external application` |

### 2.2 Blend + screenshot (`4030:2796`)

Расширение **`.blend`** (case-insensitive) **и** есть скриншот коммита.

```
      ┌─────────────────────────┐
      │                         │
      │    [commit screenshot]  │   preview, не icon
      │                         │
      └─────────────────────────┘
  This binary file cannot be displayed
  Open in external application to view

      [ Open in external application ]
```

| # | Элемент | Spec |
|---|---------|------|
| Container | то же §2.1 |
| 1 | **Preview image** | см. §3 — **вместо** `FileQuestion` icon |
| 2–4 | Title, Subtitle, Button | **идентичны** generic variant |

**Отличие от generic:** слот §2.1 #1 — `<img>` скриншота, не lucide icon.

---

## 3. Blend screenshot preview

### 3.1 Источник данных

Скриншот привязан к **коммиту**, не к файлу:

| Поле | Источник |
|------|----------|
| `screenshot_path` | `commit.get` / `log.get` → `.DFM/screenshots/{commit_hash}.png` |
| Загрузка | `GetCommitScreenshot(repoPath, commitHash)` → bytes или file URL |

Скриншот создаётся Blender addon при коммите (viewport capture). См. Forester `Commit.ScreenshotPath`.

### 3.2 Когда показывать preview

```ts
function isBlendPath(path: string): boolean {
  return path.toLowerCase().endsWith('.blend')
}

function showBlendScreenshot(path: string, screenshotUrl?: string): boolean {
  return isBlendPath(path) && Boolean(screenshotUrl)
}
```

| Условие | Preview |
|---------|---------|
| `.blend` + `screenshot_path` exists | **Image preview** §3.3 |
| `.blend` + нет скриншота | Generic icon §2.1 |
| не `.blend` | Generic icon §2.1 |
| status **D** (deleted) | [deleted-diff-stub.md](./deleted-diff-stub.md), не этот компонент |

### 3.3 Стили preview

| Token | Значение |
|-------|----------|
| Size | `max-w-[320px] w-full`, `max-h-[240px]` |
| Fit | `object-contain` |
| Border | `border border-border rounded-md` |
| Background | `bg-muted/30` (letterbox) |
| Loading | `Skeleton` того же размера |
| Broken image | fallback → generic icon §2.1 |

`alt=""` (decorative); `draggable={false}`.

### 3.4 Состояния загрузки скриншота

| State | UI |
|-------|-----|
| Loading | `Skeleton` 320×240 |
| Loaded | `<img src={url}>` |
| Missing / error | fallback generic icon (без toast) |
| Revoke URL | `URL.revokeObjectURL` on unmount / commit change |

---

## 4. Действие кнопки

```ts
OpenCommitFileWithDefaultApp(repoPath, commitHash, fileRel)
```

Flow: extract blob commit tree → temp file → `open` / `xdg-open` / Windows shell.

**Единственное действие открытия — кнопка.** Клик по preview image / title / subtitle **не** открывает файл.

---

## 5. Состояния кнопки

| State | UI |
|-------|-----|
| Default | enabled (status M or A) |
| Loading | `disabled` + spinner on button |
| Disabled | status **D** |
| Error (after click) | toast; button enabled again |

### 5.1 Deleted (D)

- Компонент **не монтируется** — [deleted-diff-stub.md](./deleted-diff-stub.md).

---

## 6. Props

```ts
interface BinaryDiffStubProps {
  path: string
  commitHash: string
  status: 'added' | 'modified' | 'renamed' | 'deleted'
  screenshotUrl?: string | null   // object URL; только для .blend preview
  screenshotLoading?: boolean
  onOpen: () => Promise<void>
}
```

Родитель (`DiffView`) загружает скриншот при `isBlendPath(path)` через `GetCommitScreenshot`.

---

## 7. Corner cases

| Case | Поведение |
|------|-----------|
| `.blend` + screenshot OK | Preview image §3 |
| `.blend` + старый коммит без screenshot | Generic icon |
| `.blend1`, `.blend2` (backup) | Generic icon (не `.blend`) |
| Renamed `old.blend → new.blend` | Preview если screenshot есть |
| Added `.blend` | Preview commit screenshot |
| Modified `.blend` | Preview **after** (commit) screenshot |
| Нет OS handler | toast |
| Temp file fail on open | toast |
| Быстрая смена файла | abort screenshot fetch; revoke URL |

---

## 8. shadcn/ui

| UI | Component |
|----|-----------|
| Open CTA | `Button` variant `default` |
| Loading button | `Loader2` animate-spin |
| Screenshot loading | `Skeleton` |
| Preview frame | `img` + `border-border rounded-md` |
