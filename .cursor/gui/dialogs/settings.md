# Dialog / Settings

Figma: [Dialog / Settings](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4040-5134) (`4040:5134`), Appearance tab [`6044:13232`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6044-13232).  
Код: `SettingsDialog`. База: shadcn `Dialog`. Окно **1113×720**, высота фиксированная.

Property: `Tab`.

| Tab | Смысл | Данные |
|-----|--------|--------|
| Profile | автор | `setup.cfg` `[user] name`, `email`. Тот же `name` даёт инициалы аватара в [Header Settings](../components/items/header-settings.md) |
| Appearance | Light / Dark | `setup.cfg` `[ui] theme` (`light` \| `dark`). Save → `SetTheme` + `html.dark` + native window theme |
| Repositories | список репо | `~/.dfm/repos.cfg` `[repo] path_N`, `[current repo]` |
| External editors | редакторы | cfg, не JSON API. Тот же список — пункты **Edit** / **Edit in** в [File Info](../panels/file-info.md) |
| Forester | пути CLI / native / addon | [setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc) |

Иллюстрации: `assets/light/illustrations/` и `assets/dark/illustrations/` через `asset()` в `themed.ts` (dark fallback → light). Chrome-иконки — Lucide (`currentColor`).

Абсолютные native path. Не коммитить secrets. Поля вкладок — `get_design_context` на variant, не выдумывать extra rows.

`Components / Dialog / …` на холсте — не этот диалог.
