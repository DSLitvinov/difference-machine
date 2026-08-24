# Dialog / Settings

Figma: [Dialog / Settings](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4040-5134) (`4040:5134`).  
Код: `SettingsDialog`. База: shadcn `Dialog`. Кадр набора 1113×1000 на вкладку.

Property: `Tab`.

| Tab | Смысл | Данные |
|-----|--------|--------|
| Profile | автор | `setup.cfg` `[user] name`, `email`. Тот же `name` даёт инициалы аватара в [Header Settings](../components/items/header-settings.md) |
| Repositories | список репо | `~/.dfm/repos.cfg` `[repo] path_N`, `[current repo]` |
| External editors | редакторы | cfg, не JSON API. Тот же список — пункты **Edit in** в [File Info](../panels/file-info.md) |
| Forester | пути CLI / native / addon | [setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc) |
| Tab=Tab5 | **не именовать** Tab5 в UI — взять подпись с node при вёрстке |

Абсолютные native path. Не коммитить secrets. Поля вкладок — `get_design_context` на variant, не выдумывать extra rows.

`Components / Dialog / …` на холсте — не этот диалог.
