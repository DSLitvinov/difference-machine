# Dialog / Settings

Figma: [Dialog / Settings](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4040-5134) (`4040:5134`), Garbage collection [`6056:12410`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6056-12410), Ignored files [`6078:16314`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6078-16314). Вкладки Appearance нет. Не добавлять переключатель Light/Dark. Тема сессии может применяться из cfg, но отдельного контрола в диалоге нет.  
Код: `SettingsDialog`. База: shadcn `Dialog`. Окно **1113×720**, высота фиксированная.

Property: `Tab`.

| Tab | Смысл | Данные |
|-----|--------|--------|
| Profile | автор и язык | `setup.cfg` `[user] name`, `email`. Язык — выпадающий список English / Русский, не сегменты. Тот же `name` даёт инициалы аватара в [Header Settings](../components/items/header-settings.md) |
| Repositories | список репо | `~/.dfm/repos.cfg` `[repo] path_N`, `[current repo]` |
| External editors | редакторы | cfg, не JSON API. Пикер приложений знает ОС: macOS `.app` (`/Applications`), Windows `.exe`, Linux binary. Save обновляет пункты **Edit** / **Edit in** сразу, без перезапуска. Тот же список — [File Info](../panels/file-info.md) |
| Backed (Forester) | пути CLI / native / addon | подпись вкладки `Backed (Forester)`. [setup-cfg-api-path](../../rules/setup-cfg-api-path.mdc) |
| Garbage collection | [`6056:12410`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6056-12410) | `~/.dfm/setup.cfg` `[gc]`. **Delete commits in the reflog (days)** → `enabled` + `reflog.expire.days` (1–3650, default 90). **Delete on a schedule** → `schedule.enabled` + `interval.day` (1–365, default 7) + `schedule.hour` / `schedule.minute` (default 07:00). **Remove now** → `gc.run` (disabled без сессии). **Save** пишет cfg. Тот же `[gc]` у Blender addon. Автозапуск, если `schedule.enabled`, прошло `interval.day` с `last.run`, и локальное время ≥ `schedule.hour`:`schedule.minute` |
| Ignored files and folders | [`6078:16314`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6078-16314) | корневой `.dfmignore`. Текстовое поле с номерами строк (chrome как [Content / View / Text](../components/items/content-view.md)). Открытие вкладки → `workdir.dfmignore.get`. **Save** → `workdir.dfmignore.set` `{content}`. Disabled без сессии. В поле: Undo ⌘Z / Ctrl+Z, Redo ⇧⌘Z / Ctrl+Y. После Save обновить каталог (`workdir.entries`), как после `workdir.ignore` |

Иллюстрации: `assets/{light,dark}/{brand,placeholders,file-types,previews}/` через `asset()` в `themed.ts` (dark fallback → light). Chrome-иконки — Lucide (`currentColor` с родителя).

Кнопка удаления пути (Repositories / Editors): `Button variant="destructive" size="icon"` 40×40, глиф `trash-2` 16×16 **белый** (`#fafafa`) на `#dc2626` — UI kit [`6044:13347`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6044-13347), [Button](../components/architecture.md#button-ui-kit). Не тёмный `foreground` на красной заливке.

Пустой список после Save: сбросить `[current repo]`, закрыть сессию, окно First Start 833×768. `.DFM/` на диске не трогать.

Абсолютные native path. Не коммитить secrets. Поля вкладок — `get_design_context` на variant, не выдумывать extra rows. Garbage collection: variant [`6056:12410`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6056-12410). Ignored files: variant [`6078:16314`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6078-16314).

`Components / Dialog / …` на холсте — не этот диалог.

Ошибка Save / `gc.run` / пикера пути → toast (`onError`), диалог не закрывать. Remove repo from list — не ошибка, пока Save не упал.
