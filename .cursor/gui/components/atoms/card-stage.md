# Stage Card

Карточка стейджа (именованный снимок), не git-commit. Не путать с [Commit Project](./card-commit-project.md).

Figma: [Atom / Cards / Stage](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4402-9877) (`4402:9877`).  
Код: `StageCard`.

Ширина 245 px. Те же description / stats / date, что у commit project.

---

## Слоты

| Слот | Вид |
|------|-----|
| Title | Inter Semi Bold 14/20, пример «Stage №2» |
| More | 16×16 ellipsis-vertical |
| Author | 12/16 `#09090b` |
| Description | 12/16 `#71717a`, 2 строки |
| Stats | `7 files changed`, `+ 12`, `- 12` — как project |
| Date | secondary pill |

**Нет:** merge icon, Head, Tag outline.

Символ `№` в макете — не заменять на `#`, если копирайт не сменят.

---

## Запрещено

- Badge Head на стейдже.
- Путать с Create Commit формой.
