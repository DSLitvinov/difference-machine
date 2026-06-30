# Application menu (macOS)

Нативное меню строки меню macOS для Wails GUI. **Не** путать с in-app `DropdownMenu` (⋮ на commit card, repo selector и т.д.).

**Связанные документы:** [architecture.md §2.7](./architecture.md) · [settings-dialog.md](./settings-dialog.md) · [api-contract.md §6](./api-contract.md)

**Реализация:** `sources/gui/menu.go` · `sources/gui/main.go` (`options.App.Menu`, `mac.About`)

**Платформа:** macOS (обязательные роли `AppMenu` / `EditMenu`). Windows/Linux — те же подменю View/Window без системных ролей (v1.1+ при необходимости).

---

## 1. Назначение

| Зона | Ответственность |
|------|-----------------|
| **Application menu** (имя приложения) | About, Services, Hide, Quit — системная роль Wails |
| **View** | Settings, переключение режима, collapse sidebar |
| **Edit** | Cut, Copy, Paste, Undo — системная роль (шорткаты в WebView) |
| **Window** | Minimize, Zoom |

Rail (иконки слева) и Application menu **дублируют** часть действий (Settings, Project/History) — это ожидаемо для macOS HIG.

---

## 2. Структура меню

```
Difference Machine  ▾     ← menu.AppMenu() (системное)
  About Difference Machine
  Services
  Hide Difference Machine
  Hide Others
  Show All
  Quit Difference Machine

View  ▾
  Settings…                    ⌘,
  ─────────────────
  Project View                 ⌘1
  History View                 ⌘2
  ─────────────────
  Toggle Sidebar               ⌘B

Edit  ▾                      ← menu.EditMenu() (системное)
  Undo / Redo / Cut / Copy / Paste / Select All …

Window  ▾
  Minimize                     ⌘M
  Zoom                         ⌃⌘F
```

### 2.1 About

Задаётся в `main.go` → `mac.Options.About`:

| Поле | Значение |
|------|----------|
| Title | `Difference Machine` |
| Message | `Forester GUI for version-controlled 3D workflows.` |

---

## 3. События Go → React

Меню не вызывает Wails bindings напрямую для UI-действий — только `runtime.EventsEmit` и `runtime.Window*`.

| Событие | Payload | Обработчик (frontend) |
|---------|---------|------------------------|
| `gui:open-settings` | — | `AppShell` → `setSettingsOpen(true)` |
| `gui:switch-mode` | `"project"` \| `"history"` | `switchSidebarMode()` — [sidebarModeSwitch.ts](../../sources/gui/frontend/src/lib/sidebarModeSwitch.ts) |
| `gui:toggle-sidebar` | — | `setSidebarCollapsed(!collapsed)` |

Подписка: `EventsOn` в `AppShell.tsx` (mount / unmount cleanup).

Переключение режима через меню **повторяет** логику Rail: сброс file selection; при уходе из History — сброс `selectedCommitHash` ([architecture.md §6.10](./architecture.md)).

---

## 4. Window actions (Go runtime)

| Пункт | API |
|-------|-----|
| Minimize | `runtime.WindowMinimise(ctx)` |
| Zoom | `runtime.WindowToggleMaximise(ctx)` |

Quit — через системный `AppMenu` (Wails), не кастомный handler.

---

## 5. Порядок сборки меню (macOS)

Критично для Wails ([документация](https://wails.io/docs/reference/menus/)):

1. `menu.NewMenu()`
2. `Append(menu.AppMenu())` — **сразу** после `NewMenu`
3. Кастомные подменю (`View`, затем …)
4. `Append(menu.EditMenu())` — **после** кастомных, до `Window`
5. `Window` submenu

Нарушение порядка (например, `EditMenu` сразу после `AppMenu`) даёт неверный порядок **Edit** перед **View**.

---

## 6. Corner cases

| Ситуация | Поведение |
|----------|-----------|
| `⌘,` при открытом Settings | Повторное событие — dialog остаётся open (без toggle) |
| `⌘1` / `⌘2` при уже активном режиме | No-op (`switchSidebarMode`) |
| `⌘B` в поле ввода | Может конфликтовать с bold в contenteditable; приоритет у WebView / Edit menu |
| Нет репозитория | View → Project/History всё равно переключает `sidebarMode` |
| Windows build | `AppMenu` / `EditMenu` не добавляются; View + Window остаются |

---

## 7. Вне scope (v2)

- **File** menu (Add repository, Open…)
- **Help** menu
- Кастомный **Quit** handler (достаточно `AppMenu`)
- Локализация подписей меню

---

## 8. Файлы

| Файл | Роль |
|------|------|
| `sources/gui/menu.go` | `buildApplicationMenu`, константы событий |
| `sources/gui/main.go` | `Menu: buildApplicationMenu(app)` |
| `frontend/src/components/shell/AppShell.tsx` | `EventsOn` listeners |
| `frontend/src/lib/sidebarModeSwitch.ts` | Shared Project ↔ History switch |

---

## 9. Smoke

- [x] View → Settings открывает `SettingsDialog`
- [x] `⌘1` / `⌘2` переключают Project / History (как Rail)
- [x] `⌘B` сворачивает / разворачивает sidebar column
- [x] Edit → Copy/Paste работают в search input и диалогах
- [x] Window → Minimize / Zoom
- [x] About показывает title + message из `mac.About`

Проверено вручную при v2 фазе 1 ([implementation-plan-v2.md](./implementation-plan-v2.md)).
