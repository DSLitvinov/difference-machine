# View / First Start

Окно первого запуска. Не трёхколоночный app shell.

Figma: [View / First Start](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4382-9252) (`4382:9252`).  
**640×656**.

Обзор экранов: [architecture.md](./architecture.md).

---

## Когда

Пока нет открытого репозитория в `[current repo]` (и, по смыслу макета, пользователь ещё не в app shell).

Не показывать поверх уже открытого проекта. После успешного Create / Open — перейти на экран обзора ([project-browse.md](./project-browse.md)).

---

## Слоты

Не `Item / Panel / Header / Window` в webview. Close — системная кнопка окна ОС (traffic lights / caption), не иконка `x` в вёрстке.

| Зона | Содержание |
|------|------------|
| Hero | `Appicon / 512` 128 + название `Difference Machine` + `Prototype 0.8.1` |
| Create repository | заголовок `Create repository`, пояснение `Create a new Difference Machine repository inside the specified folder`, кнопка `Create` |
| Open repository | заголовок `Open repository`, пояснение `Select the folder containing the repository`, кнопка `Open` |
| Language | `Language`, сегменты `English` / `Русский`, подпись `This is the language that will be used in the application` |

Copy — только из этого node (`get_design_context` на `4382:9252`). Не подменять «Init Forester» и т.п.

---

## Действия

| Контрол | Поведение |
|---------|-----------|
| Create | OS folder picker → `repo.init` (`CallStateless` / сессия на путь) → запись cfg → app shell |
| Open | OS folder picker → `Open` сессии, если это репозиторий; иначе сценарий not-a-repository из [states](../states/architecture.md) |
| Language | локаль UI; persist в cfg/local, если так сделают настройки. Не трогает Forester |
| Close | системная кнопка закрытия окна ОС |

Пути — абсолютные native. После init — [Empty DFM Project](./project-browse.md) если папка пустая, [Empty DFM Folder](./project-browse.md) / [Root Folder](./project-browse.md) если в workdir уже есть файлы (уточнение: открытый вопрос 1–2 в [architecture.md](./architecture.md)).

---

## Запрещено

- Три колонки Project / Content / Info.
- JSON API workdir до появления валидного корня.
- Четвёртая кнопка «Clone», поля автора, путь CLI — их нет на кадре.
