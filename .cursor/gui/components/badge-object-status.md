# Object Status Badge

Кастомный атом поверх [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge).  
Figma: [Atom / Badges / Blender Object Status](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4422-10355) (`4422:10355`).

Компонент в коде: `ObjectStatusBadge`.  
Property Figma: `type`.

Не путать с [бейджем статуса файла](./badge-file-status.md) (квадрат 20×20, буквы A/M/N/D).

---

## Назначение

Индикатор тега **объекта внутри `.blend`** в merge-диалоге и списках manifest. Текст — полное слово, ширина по контенту.

Атом **не** вызывает API. Панель передаёт `type` из `object.get` / `object.list_by_file` → поле `tags`.

Теги пишет аддон Mark To и GUI merge-сценарий через `object.tag.add` / `object.tag.remove`. Значения тегов в store — строки `MERGE`, `RENAME`, `DELETE` (как в аддоне).

---

## Варианты (`type`)

В макете ровно три значения.

| `type` | Подпись | Фон | Ширина в макете | Тег Forester |
|--------|---------|-----|-----------------|--------------|
| `merge` | **MERGE** | `#16a34a` | 51×20 | `MERGE` |
| `rename` | **RENAME** | `#a855f7` | 59×20 | `RENAME` |
| `delete` | **DELETE** | `#dc2626` | 54×20 | `DELETE` |

Ширину **не фиксировать** в px: hug content + паддинги. Цифры из кадра — контроль регрессии, не `w-[51px]`.

DELETE и MERGE на одном объекте конфликтуют (бизнес-правило Mark To). GUI не рисует оба на одной строке как «норма»; если API всё же вернул оба — показать как есть, не прятать молча и не смешивать цвета.

---

## Внешний вид

| Свойство | Значение | Токен Figma |
|----------|----------|-------------|
| Высота | **20 px** | |
| Ширина | по тексту | |
| Радиус | 4 px | `Radius/radius-sm` |
| Padding | верх 3 px, низ 1 px, горизонталь 4 px | `Spacing/spacing-xs` |
| Обводка | `1px solid rgba(0, 0, 0, 0.08)` | |
| Шрифт | Inter Semi Bold, 12 / 16, letter-spacing 0 | `text-xs/semibold` |
| Текст | uppercase, как в таблице, `whitespace-nowrap` | |
| Цвет текста | `#fafafa` | `Foreground/Primary/default` |
| Выравнивание | flex, center | |

Подпись только из макета: `MERGE` / `RENAME` / `DELETE`. Не локализовать, не писать `Merge`, не добавлять иконку.

Заливки — hex из макета, не `bg-primary` / `bg-destructive` shadcn (destructive ≠ `#dc2626` гарантированно). Вынести в переменные атома (`--badge-object-merge` …).

---

## Состояния взаимодействия

В Figma нет hover / pressed / disabled / selected у этого атома.

| Состояние | Поведение |
|-----------|-----------|
| default | заливка + слово по `type` |
| hover / active | без restyle |
| disabled | нет отдельного варианта; disabled родителя |
| loading | не показывать бейдж до прихода `tags` |
| нет тега | **не рендерить** (нет outline-заглушки «untagged») |
| несколько тегов | несколько экземпляров в ряд, gap из макета родителя |

Атом не переключает тег по клику. Смена MERGE/RENAME/DELETE — действие панели/диалога (`object.tag.*`), затем новый `type` снаружи.

---

## shadcn/ui

База: `Badge` + `cva` + `cn`.

Отличия от дефолтного Badge:

- высота 20 px, не auto + `py-0.5`;
- `rounded-[4px]`, не `rounded-full` и не `rounded-md` (8 px);
- padding как в таблице;
- три собственных `type`, не `default | secondary | destructive | outline`.

`FileStatusBadge` и `ObjectStatusBadge` — **два** cva, не один компонент с «если буква то квадрат». Общая только типографика 12/600 и радиус 4.

A11y: видимый текст уже полное слово; `aria-label` не дублировать, если не требуется контекст («object Cube tagged DELETE»). Не добавлять tooltip.

Тёмная тема: без dark-варианта в Figma заливки не инвертировать.

---

## Запрещено

- Буквы A/M/N/D на этом атоме.
- Иконки, точки, «Mark to».
- Свои цвета purple/green «примерно».
- Четвёртый тег (`KEEP`, `CONFLICT`, …) без нового варианта в Figma.
