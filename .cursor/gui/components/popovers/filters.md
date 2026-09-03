# Popover Filters

Figma: [Popover (Filters)](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4272-6728) (`4272:6728`).  
Код: `FiltersMenu`. База: shadcn `DropdownMenu` + `DropdownMenuCheckboxItem`. Ширина **200 px**, radius 8, border `#e4e4e7`, shadow-md, py 4.

---

## Пункты

Нет заголовков секций (`View`, `Filter by type`) — в макете только пункты и separator.

Checkbox `Only changed` / `Только измененные`, иконка pencil. **Вкл.**: сетка = все dirty path проекта (`status.get` + `workdir.entries_by_paths`), не текущая папка. Пункт disabled, если dirty файлов нет. Не мутация Forester.

Checkbox `View ignored` / `Показать игнорируемые`, иконка eye. **Вкл.**: `workdir.entries` / `search` с `include_ignored: true`; игнорируемые файлы и папки видны с бейджем `ignored` (**i**). **Выкл.** (default): пути из `.dfmignore` скрыты, как раньше.

Separator. Список расширений — **файлы текущей папки** (`workdir.entries` / результаты search в этой папке), не фиксированный набор из макета. Copy: `.ext` в нижнем регистре (как в Figma `.jpeg`, не `JPEG`). Иконка 16: image / text / blend / binary по типу файла. Несколько пунктов можно включить сразу; выбранные — галочка shadcn `ItemIndicator`.

Separator. Затем destructive: `trash-2` + `Clean filters`, цвет `#ef4444` — снимает галочки типов, `Only changed` и `View ignored`.

Не добавлять «All files». Фильтр по типу — UI панели, без API. **View ignored** — `include_ignored` на `workdir.entries` / `search`.
