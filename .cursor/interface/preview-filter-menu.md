# Content Preview — Filter menu (toolbar)

Попап **Filter** в toolbar **Content Preview → Project view**: чеклист типов файлов + **Clean filters**.

**Figma (shadcn kit):** [Filter menu `4096:14305`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/shadcn-ui--The-Ultimate-UI-Kit-for-Figma--Community-?node-id=4096-14305)

**Триггер:** кнопка `Filter` 40×40 в [content-preview-project-view.md §2.1](./content-preview-project-view.md) (`4086:5487`).

**Сортировка по дате** — **не** в этом попапе; только в Sort popover (`ArrowUpAZ`) — [content-preview-project-view.md §6.2](./content-preview-project-view.md).

**Связанные документы:** [content-preview-project-view.md](./content-preview-project-view.md) · [design-tokens.md](./design-tokens.md) · [figma-gui-parity.mdc](../rules/figma-gui-parity.mdc)

---

## 1. Назначение

Сужает секцию **Files** (и Files в search results) по расширению. Не влияет на Folders, **Changed** toggle ([project-view-changed-filter.mdc](../rules/project-view-changed-filter.mdc)), sort mode и global search scope.

---

## 2. Анатомия попапа

```
┌──────────────────────────────┐
│ Filter types                 │  label (header)
├──────────────────────────────┤
│ ☑ [icon] .png                │  scroll area
│ ☑ [icon] .blend              │
│ ☐ [icon] .fbx                │
├──────────────────────────────┤
│       Clean filters          │  footer item
└──────────────────────────────┘
```

| Property | Spec |
|----------|------|
| Компонент | shadcn `DropdownMenu` |
| Width | **`246px`** (`w-[246px]`) |
| Align | `end` |
| Padding | `p-0` на content; header `px-3 py-2`; list `p-1`; footer `p-1` |
| Scroll | только блок типов: `max-h-[240px] overflow-y-auto` |
| Separators | после header и перед footer (`mx-0`) |

Figma node: `4096:14305`.

---

## 3. Header

| Элемент | Spec |
|---------|------|
| Label | `Filter types` — `DropdownMenuLabel`, `text-sm font-semibold`, `px-3 py-2` |
| i18n | `preview.filterTypesLabel` |

---

## 4. Список типов (checkbox)

| # | Колонка | Spec |
|---|---------|------|
| 1 | Checkbox | shadcn indicator слева (`Check` 16), `pl-8` |
| 2 | Kind icon | 16×16, `text-muted-foreground` — [§6](#6-иконки-по-типу-файла) |
| 3 | Label | `.{ext}` или `(no extension)` |

- `checked = true` → тип **виден** в сетке Files.
- `checked = false` → тип в `hiddenExtensions`.
- `onSelect` → `preventDefault()` (меню не закрывается при toggle).
- Порядок: locale-aware по расширению.

### Данные

| Поле | Источник |
|------|----------|
| `availableExtensions` | уникальные расширения в текущем scope |
| `hiddenExtensions` | `Set<string>` — session-only |

Кнопка Filter `disabled`, если `availableExtensions.length === 0`.

---

## 5. Footer — Clean filters

| Property | Spec |
|----------|------|
| Компонент | `DropdownMenuItem`, `justify-center`, `text-sm font-medium` |
| Label | `Clean filters` — i18n `preview.cleanFilters` |
| Disabled | `hiddenExtensions.size === 0` (нечего сбрасывать) |
| Action | `hiddenExtensions = ∅` — все типы снова видимы; **не** меняет `sortMode` |

---

## 6. Иконки по типу файла

Канон: `fileExtensionKind(ext)` + `FileExtensionIcon` (lucide).

| `FileExtensionKind` | Примеры | Lucide |
|---------------------|---------|--------|
| `image` | `png`, `jpg`, `webp`, `exr`, … | `FileImage` |
| `text` | `json`, `md`, `py`, `tsx`, … | `FileCode` |
| `blend` | `blend` | `FileArchive` |
| `mesh3d` | `fbx`, `obj`, `gltf`, … | `Box` |
| `video` | `mp4`, `mov`, … | `FileVideo` |
| `audio` | `wav`, `mp3`, … | `FileAudio` |
| `document` | `pdf`, `doc`, … | `FileText` |
| `none` | `(none)` | `File` |
| `other` | остальное | `FileArchive` |

---

## 7. Кнопка-триггер

| State | Style |
|-------|-------|
| Default | `Button` ghost 40×40, `Filter` 16 |
| Active (`hiddenExtensions.size > 0`) | `border border-ring bg-accent` |
| Disabled | нет файлов в scope |

---

## 8. Компоненты (frontend)

```
components/preview/
  PreviewFilterMenu.tsx    # этот попап
  PreviewToolbar.tsx       # consumer
  FileExtensionIcon.tsx
```

---

## 9. a11y

- Trigger: `title` = `preview.filterTypesLabel`.
- Clean filters: `disabled` когда фильтры не активны.
