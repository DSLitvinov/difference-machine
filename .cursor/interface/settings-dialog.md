# Settings

Глобальные настройки GUI. Открывается кнопкой **Settings** на Rail Sidebar.

**Figma (shadcn kit):** [`4040:5134`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4040-5134) — вкладки Profile · **Appearance** · Repositories · External editors · Forester

**Триггер:** [architecture.md §2.2](./architecture.md) — Rail `Settings` ([`4026:4812`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4812) · [`4026:4547`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4026-4547))

**Конфиг:** `~/.dfm/setup.cfg` — [paths.md §2](./paths.md) · [multi-repo.md](./multi-repo.md)

**Связанные:** [create-commit-dialog.md](./create-commit-dialog.md) · [merge-dialog.md](./merge-dialog.md) · [api-contract.md](./api-contract.md)

---

## 1. Общий layout

Полноэкранная модалка (не compact `Dialog`):

| Token | Значение |
|-------|----------|
| Width | `~1113px` (`max-w-6xl`) |
| Min height | `~1000px` или `min-h-[80vh]` |
| Padding | `px-10 pt-10 pb-16` |
| Radius | `rounded-xl` |
| Shadow | `shadow-md` |

```
┌──────────────────────────────────────────────────────────── [X]
│ Settings
│ Manage repository and your account settings
│ ─────────────────────────────────────────────────────────────
│ ┌─────────────┬──────────────────────────────────────────────┐
│ │ Profile     │  {Tab title}                                 │
│ │ Appearance  │  {Tab description}                           │
│ │ Repositories│  ─────────────────────────────────────────── │
│ │ External …  │  {fields / list rows}                        │
│ │ Forester    │                                              │
│ │             │  [ Add … ]          [ Save … ]               │
│ └─────────────┴──────────────────────────────────────────────┘
```

**shadcn/ui:** `Dialog` (large `DialogContent`), `Separator`, `Button`, `Input`, `Label`, `Select` / `Combobox`, `AlertDialog` (destructive delete)

### 1.1 Левая навигация

| Property | Spec |
|----------|------|
| Width | `184px` |
| Item height | `40px` |
| Active tab | `bg-accent` (`background/primary/light-hover`) |
| Inactive | transparent + `hover:bg-accent/50` |
| Font | `text-sm font-medium` |

```ts
type SettingsTab =
  | 'profile'
  | 'appearance'
  | 'repositories'
  | 'external-editors'
  | 'forester'
```

**Порядок в nav (Figma):** Profile → Appearance → Repositories → External editors → Forester.

### 1.2 Правая панель

Каждая вкладка:

1. **Title** — `text-lg font-semibold`
2. **Description** — `text-sm text-muted-foreground`
3. `Separator`
4. **Body** — поля или list rows
5. **Actions** — primary `Save …` (+ optional secondary `Add …`)

Кнопки Figma «Upgrade …» в реализации → **Save** (см. §8).

---

## 2. Вкладки и маппинг на Forester

| Tab (Figma) | Назначение для Forester | Хранение |
|-------------|-------------------------|----------|
| **Profile** | Имя автора + язык UI | `setup.cfg` `[user]` · `[gui].language` |
| **Appearance** | Тема и шрифт dashboard | `localStorage` + `[gui]` (см. §4) |
| **Repositories** | Список Forester-репозиториев GUI | `[repo]`, `[current repo]` |
| **External editors** | **Open in external application** | `[gui editors]` |
| **Forester** | Backend: CLI, API, addon, Blender merge | `[forester]`, `[api]`, `[addons]`, `[blender]` |

> **Пять вкладок:** Profile — кто и на каком языке; Appearance — как выглядит GUI; Repositories — что версионируем; External editors — чем открываем файлы; Forester — как вызывается движок.

---

## 3. Profile

**Figma subtitle:** «This is how others will see you on the site.»  
**Forester:** имя в коммитах и merge.

| Field | Figma label | Storage | v1 |
|-------|-------------|---------|-----|
| Author name | Username | `[user].name` | **да** — `Input` |
| Email | — | `[user].email` | v1.1 — optional |
| Language | Language | `[gui].language` | v1: `en` only; combobox ready |

### 3.1 Author name

- Placeholder: `Your name`
- Used by: Create commit, Merge dialog, `commit.create` author field
- Validation: empty → warn «Author name recommended»; save allowed with confirm

### 3.2 Language

Figma: combobox + hint «This is the language that will be used in the dashboard.»

| v1 | `en` only — combobox disabled or single option |
| v2 | `en`, `ru`, … + i18n bundles |

**Primary action:** `Save profile` → write `[user]` + `[gui].language` → toast «Profile saved».

---

## 4. Appearance

**Figma:** [`4040:5530`](https://www.figma.com/design/Vhp8g306WGBcjSzL4lnl23/?node-id=4040-5530) (вкладка внутри `4040:5134`)

**Subtitle:** «Customize the appearance of the app. Automatically switch between day and night themes.»

Визуальные настройки GUI — не влияют на Forester CLI / репозитории. Канон токенов: [design-tokens.md](./design-tokens.md).

### 4.1 Font

| Property | Spec |
|----------|------|
| Label | `Font` |
| Control | `Select` / `Combobox` |
| Hint | «Set the font you want to use in the dashboard.» |
| Max width | `348px` (Figma) |

| Option | v1 | Реализация |
|--------|-----|------------|
| **Inter** | default, единственный | `--font-sans` в `globals.css` |

v1.1: system-ui stack без смены шрифта. v2: доп. шрифты из allowlist.

### 4.2 Theme

| Property | Spec |
|----------|------|
| Section label | `Theme` |
| Hint | «Select the theme for the dashboard.» |
| Layout | `flex gap-6 flex-wrap` — preview cards |

#### Theme preview card (`ThemePreviewCard`)

```
┌─────────────────┐     ┌─────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │     │ ░░░░░░░░░░░░░░░ │
│ (skeleton UI)   │     │ (dark skeleton) │
└─────────────────┘     └─────────────────┘
      Light                   Dark
```

| Property | Light card | Dark card |
|----------|------------|-----------|
| Outer border | `border-2` — selected: `border-ring` (`#a1a1aa`); default: `border-border` (`#d4d4d8`) |
| Inner preview bg | `#e4e4e7` shell + white rows | `#09090b` shell + `#27272a` rows |
| Skeleton pills | light gray on white | `#52525b` on muted |
| Label | `text-sm text-muted-foreground` centered |

**Interaction:** click card → `selectedTheme`; selected card gets `border-ring`. Live preview on select (до Save) — optional v1.1.

| Value | v1 | Описание |
|-------|-----|----------|
| `light` | **да** | shadcn Zinc light — [design-tokens.md](./design-tokens.md) |
| `dark` | **да** | shadcn Zinc dark — `class="dark"` на `<html>` |
| `system` | v1.1 | `prefers-color-scheme`; subtitle Figma про auto day/night |

```ts
// apply on save
document.documentElement.classList.toggle('dark', theme === 'dark')
// system v1.1: matchMedia('(prefers-color-scheme: dark)')
```

### 4.3 Storage

```ini
# ~/.dfm/setup.cfg — optional sync (portable)
[gui]
theme = light
font = inter
language = en
```

```ts
// localStorage — primary for instant apply
'dfm.gui.theme'   // 'light' | 'dark' | 'system'
'dfm.gui.font'    // 'inter'
```

Load order: `localStorage` → fallback `[gui]` in cfg → defaults (`light`, `inter`).

### 4.4 Actions

**Primary:** `Save appearance` → persist → `applyAppearance()` → toast «Appearance saved».

Не путать с Figma «Update Preferences» — в коде **Save appearance**.

---

## 5. Repositories

**Figma subtitle:** «Manage your repository list.»  
Канон управления списком — **здесь**; Sidebar dropdown — быстрый switch + Add ([multi-repo.md](./multi-repo.md) §3).

### 5.1 List row

```
┌──────────────────────────────────────┐ [ Select ] [ 🗑 ]
│ /Users/me/projects/scene-a             │
└──────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Path input | read-only display abs path (native OS); `truncate` + tooltip |
| **Select** | `Button outline` — native folder picker → replace row path; если нет `.DFM` → [init-repository-dialog.md](./init-repository-dialog.md) |
| **Trash** | `Button destructive` 40×40 — `AlertDialog` «Remove from list?» |
| Row validation | Path must be valid Forester repo (`.DFM` exists) on save |

### 5.2 Actions

| Button | Style | Action |
|--------|-------|--------|
| **Add repository** | `secondary` / light bg | folder picker → append `path_N`; init dialog если не repo |
| **Save list** | `default` primary | persist `[repo]`; dedupe `SamePath`; refresh Sidebar |

### 5.3 Правила

- Remove из списка **не удаляет** файлы на диске
- Если удалён **текущий** репо → `[current repo]` → первый в списке или empty
- Dedupe: [paths.md §3](./paths.md) `SamePath`
- Порядок: `path_1`, `path_2`, … по UI order

---

## 6. External editors

**Figma subtitle:** «Manage your editors.»

Приложения для **Edit in:** в context menu файлов Project view и для явного открытия через `workdir.open` с `editor`.

**Статус:** вкладка **активна** (не disabled). Список в context menu синхронизируется через `appStore.externalEditorPaths` — обновляется при редактировании полей на вкладке (live) и после **Save list**.

### 6.1 Поля на вкладке

Порядок сверху вниз:

| Block | Label | cfg | Picker |
|-------|-------|-----|--------|
| Blender | **Blender executable** | `[blender].path` | file (optional) |
| Blender | **Blender addon** | `[addons].diffmachine_path` | folder (optional) |
| — | `Separator` | — | — |
| List | External applications | `[gui editors].path_N` | list rows §6.2 |

Optional path rows: `Label` + `Input` + **Select** + **Trash** (красная icon button, как в Repositories — **не** текстовая кнопка Clear).

### 6.2 Секция `setup.cfg`

```ini
[blender]
path = /usr/bin/blender

[addons]
diffmachine_path = /opt/difference_machine

[gui editors]
path_1 = /usr/local/bin/code
path_2 = /Applications/Blender.app/Contents/MacOS/Blender
```

| Key | Значение |
|-----|----------|
| `path_N` | Abs path к executable (native OS) |

### 6.3 List row (applications)

Тот же паттерн что Repositories §5.1: path + **Select** (file picker для `.app`/`.exe`) + **Trash**.

| Button | Action |
|--------|--------|
| **Add application** | append empty row → Select |
| **Save list** | persist `[gui editors]` + `[blender]` + `[addons]` (Blender paths) |

### 6.4 Список в context menu

```ts
// resolveExternalEditorPaths(editors, blenderPath):
// 1. [gui editors] paths (order preserved)
// 2. prepend [blender].path if set and not already in list
```

Источник: `appStore.externalEditorPaths` — обновляется из Settings dialog (`useEffect` на `editors` + `blenderPath` while open) и при старте приложения.

Submenu label: **Edit in** (без двоеточия), иконка `Settings` (шестерёнка) слева.

### 6.5 `workdir.open` routing

```ts
// Double-click: workdir.open { path }           → OS default
// Context menu Edit in: workdir.open { path, editor }
```

Extension→editor map — **v2 backlog**; v1: пользователь выбирает редактор из списка вручную.

---

## 7. Forester (backend)

**Figma subtitle:** «Manage your repository backend» *(исправлено с typo «you repository»)*.

Пути к toolchain — GUI вызывает Forester через Wails → `jsonapi` → binary из `[forester].path`.

### 7.1 Поля (labeled rows)

| Label | cfg | Required | Picker |
|-------|-----|----------|--------|
| **Config file** | path to `setup.cfg` | — | read-only |
| **Forester CLI** | `[forester].path` | да | file → `forester` / `forester.exe` |

> **Blender executable** и **Blender addon** перенесены на вкладку **External editors** (§6).

Отложено на v2: **API library** (`[api].path`), **Merge apply script** (`[blender].merge_apply_script`).

### 7.2 Validation on save

| Check | Error |
|-------|-------|
| `[forester].path` missing | inline «Forester CLI required» |
| Binary not executable | toast |
| Path not found | inline on row |
| Addon path not a directory | inline |

**Test connection** (v1.1): кнопка «Verify» → `forester --version` subprocess.

**Primary action:** `Save settings` → atomic write cfg sections → toast «Forester settings saved».

---

## 8. Save model

| Tab | Save scope | Close on success |
|-----|------------|------------------|
| Profile | `[user]`, `[gui].language` | stay open |
| Appearance | `localStorage` + `[gui].theme`, `[gui].font` | stay open |
| Repositories | `[repo]` + maybe `[current repo]` | stay open |
| External editors | `[gui editors]` + `[blender]` + `[addons]` | stay open |
| Forester | `[forester].path` | stay open |

- **Per-tab Save** — как в Figma (не один global Save)
- Dirty state per tab → enable только активную Save
- ESC / X: если dirty → `AlertDialog` «Discard changes?»

```mermaid
sequenceDiagram
  participant UI as SettingsPage
  participant W as Wails
  participant C as setup.cfg

  UI->>W: settings.get()
  W->>C: read ~/.dfm/setup.cfg
  W-->>UI: SettingsSnapshot

  UI->>W: settings.save({ tab, patch })
  W->>W: validate paths (CanonicalAbsPath)
  W->>C: merge-write sections
  W-->>UI: ok
  UI->>UI: toast, refresh app shell
```

---

## 9. Wails API

| Method | Назначение |
|--------|------------|
| `settings.get` | full snapshot for all tabs |
| `settings.save` | `{ tab, data }` partial write |
| `settings.pickPath` | `{ kind: 'file' \| 'folder' \| 'repo' }` → native dialog |

```ts
interface SettingsSnapshot {
  user: { name: string; email?: string }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    font: 'inter'
  }
  language: string                 // [gui].language
  repos: string[]
  currentRepo: string | null
  editors: string[]
  forester: {
    cliPath: string
    apiPath?: string
    addonPath?: string
    blenderPath?: string
    mergeScriptPath?: string
  }
}
```

`settings.save({ tab: 'appearance', data })` → write storage + вызов `applyAppearance` в frontend.

---

## 10. Corner cases

| Case | Поведение |
|------|-----------|
| `setup.cfg` missing | create minimal on first save |
| Invalid repo path in list | block Save list; highlight row |
| Add non-repo folder | [init-repository-dialog.md](./init-repository-dialog.md) → **Create** before Save list |
| Remove last repo | allow; app → empty state |
| Forester path wrong after save | next API call fails → banner «Forester unavailable» + link Settings |
| Concurrent CLI `config --global` | v1: last-write-wins |
| Open settings during merge | allowed |
| Sidebar collapsed | Rail Settings works |
| Windows paths with spaces | quotes in INI on write |
| Select picker cancelled | no change to row |
| Trash current repo while open | switch to first remaining or empty |
| Theme switch while Settings open | preview applies to modal + app shell |
| Invalid theme in cfg | fallback `light` |
| Dark theme + diff panels | use dark diff colors — [design-tokens.md §3.8](./design-tokens.md) |
| Font change mid-session | re-mount root or CSS var swap; no reload v1.1 |

---

## 11. MVP scope (v1)

| Tab | v1 |
|-----|-----|
| Profile | **Author name** + Language (`en` only) |
| Appearance | **Theme** Light/Dark cards + **Font** Inter (read-only) |
| Repositories | **full list** add/remove/save |
| External editors | **full**: Blender paths + app list; live sync to context menu |
| Forester | **Forester CLI** only (+ read-only config path) |

Отложено: `system` theme, extra fonts, email, API lib picker, merge script, extension→editor map, Verify button.

---

## 12. Компоненты (React)

```
frontend/src/components/settings/
  SettingsDialog.tsx
  SettingsPathRow.tsx          # SettingsPathListRow + SettingsLabeledPathRow (Trash on optional clear)
  ThemePreviewCard.tsx
```

`externalEditorPaths` — `appStore` + `resolveExternalEditorPaths()` в `wails/settings.ts` (не отдельный tab component file).

---

## 13. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Layout | Full-width modal по Figma `4040:5134` |
| 2 | Appearance vs Profile | Language → Profile; theme/font → Appearance |
| 3 | Theme UI | Preview cards Light/Dark — Figma `4040:5611` |
| 4 | Theme storage | `localStorage` primary; `[gui]` в cfg для sync |
| 5 | Repositories CRUD | Settings — канон списка |
| 6 | Figma «Upgrade …» | → **Save profile / Save appearance / Save list / …** |
| 7 | Forester tab | Labeled backend fields |
| 8 | cfg source | `~/.dfm/setup.cfg` + `localStorage` для appearance |
