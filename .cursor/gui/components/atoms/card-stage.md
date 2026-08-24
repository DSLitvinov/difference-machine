# Stage Card

Карточка **stash** (именованный снимок workdir). Слой Figma — `Atom / Cards / Stage`; в UI слово **Stash**, не Stage. Не путать с [Commit Project](./card-commit-project.md) и не с `status.get.staged_*`.

Figma: [Atom / Cards / Stage](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4402-9877) (`4402:9877`).  
Код: `StageCard`.

Ширина 245 px. Те же description / stats / date, что у commit project. Атом не вызывает API. Пока нет метода списка stash — карточку не кормить мок-данными. Пустая вкладка: [NoStagesProject](./card-no-stages-project.md).

---

## Слоты

| Слот | Вид |
|------|-----|
| Title | Inter Semi Bold 14/20, пример «Stash №2» |
| More | 16×16 ellipsis-vertical |
| Author | 12/16 `#09090b` |
| Description | 12/16 `#71717a`, 2 строки |
| Stats | `7 files changed`, `+ 12`, `- 12` — как project |
| Date | secondary pill |

**Нет:** merge icon, Head, Tag outline.

Символ `№` в макете — не заменять на `#`, если копирайт не сменят.

---

## Запрещено

- Badge Head на stash-карточке.
- Путать с Create Commit формой.
- Писать **Stage** в UI — только **Stash**.
