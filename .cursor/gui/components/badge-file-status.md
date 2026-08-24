# File Status Badge

Кастомный атом поверх [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge).  
Figma: [Atom / Badges / File DFM Status](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5880) (`4191:5880`).

Компонент в коде: `FileStatusBadge`.  
Property Figma: `type`.

Не путать с [бейджем объекта Blender](./badge-object-status.md) (слова MERGE / RENAME / DELETE, ширина по контенту).

---

## Назначение

Индикатор статуса **файла** в сетке preview, дереве, списке изменений. Не кликабелен сам по себе: hit-target — родитель (тайл, строка).

Атом **не** вызывает API. Панель передаёт уже вычисленный `type`.

---

## Варианты (`type`)

В макете ровно пять значений. Других букв и иконок нет (нет `R`, нет shared/exclusive lock).

| `type` | Знак | Смысл | Данные Forester |
|--------|------|--------|-----------------|
| `appended` | **A** | Добавлен в VCS (есть в index, не было в HEAD) | `status.get.staged_new_files`; `diff.name_status` status `A` |
| `modified` | **M** | Содержимое изменено | `staged_modified_files` / `unstaged_modified_files`; diff `M` |
| `new` | **N** | Неотслеживаемый | `untracked_files` |
| `delete` | **D** | Удалён | `staged_deleted_files` / `unstaged_deleted_files`; diff `D` |
| `lock` | иконка замка 16×16 | Файл заблокирован | `lock.list` — есть запись с этим `file_path` |

`renamed_files` / diff `R`: в Figma варианта нет. **Не** рисовать «R» и **не** подменять на A/M/D. Пока макет не расширят — у rename нет letter-бейджа (`lock` по-прежнему можно показать).

---

## Внешний вид

Общее для всех `type`:

| Свойство | Значение | Токен Figma |
|----------|----------|-------------|
| Размер | **20×20 px**, квадрат | `size-[20px]` |
| Радиус | 4 px | `Radius/radius-sm` |
| Шрифт буквы | Inter Semi Bold, 12 / 16, letter-spacing 0 | `text-xs/semibold` |
| Выравнивание | flex, center | |
| Текст | uppercase, одна буква, `whitespace-nowrap` | |

### Letter (`appended` \| `modified` \| `new` \| `delete`)

| Свойство | Значение |
|----------|----------|
| Padding | горизонталь 4 px (`Spacing/spacing-xs`); верх 3 px, низ 1 px |
| Обводка | `1px solid rgba(0, 0, 0, 0.08)` |
| Цвет знака | `#fafafa` (`Foreground/Primary/default`) |

| `type` | Фон |
|--------|-----|
| `appended` | `#16a34a` |
| `modified` | `#f97316` |
| `new` | `#2563eb` |
| `delete` | `#dc2626` |

Цвета заливки в макете — абсолютные hex, не semantic `destructive` shadcn. Завести CSS-переменные атома (`--badge-file-appended` …) и не подменять на `bg-green-600` «на глаз», если hex не совпадает.

### `lock`

| Свойство | Значение | Токен |
|----------|----------|--------|
| Фон | `#ffffff` | `Background/default` |
| Обводка | `1px solid #e4e4e7` | `Border/default` |
| Padding вертикаль | 0 | `Padding/padding-none` |
| Иконка | замок, **16×16**, в центре | node icon `4191:5890` |
| Цвет иконки | `#3f3f46` | `Icon/Secondary/default` |

Иконку брать экспортом из Figma (SVG), не рисовать path вручную. Lucide `Lock` — только если глиф совпадает с макетом при 16 px.

---

## Состояния взаимодействия

В компонентном сете Figma **нет** hover / pressed / disabled / selected. Это статичный индикатор.

| Состояние | Поведение |
|-----------|-----------|
| default | как в таблице вариантов |
| hover / active | не менять заливку, обводку, scale |
| disabled | не вводить отдельный вид; если родитель disabled — opacity родителя, не серый бейдж |
| selected строки | бейдж не инвертируется |
| loading | бейдж не показывают, пока нет `status.get` / `lock.list`; не ставить spinner внутрь 20×20 |
| отсутствие статуса | **не рендерить** атом (нет «пустого» квадрата) |

`lock` и letter — разные экземпляры. Если файл и изменён, и залочен, родитель ставит **два** бейджа (порядок — из макета тайла, не выдумывать третий `type`).

---

## Приоритет letter, если path в нескольких списках `status.get`

Один файл — один letter-бейдж:

1. `staged_new_files` → `appended`
2. иначе `untracked_files` → `new`
3. иначе modified (staged или unstaged) → `modified`
4. иначе deleted (staged или unstaged) → `delete`
5. иначе letter нет

`lock` считается отдельно и не вытесняет letter.

---

## shadcn/ui

База: `Badge` + `cva` + `cn`.

Не использовать дефолтные варианты shadcn (`default`, `secondary`, `destructive`, `outline`, `rounded-full`): у них другая геометрия (pill, auto-height, другой padding).

```text
Badge
  → className фиксирует size 20×20, rounded-[4px], p по спеке
  → variant / type = cva map на пять type
```

- `asChild` не нужен.
- Не добавлять `title` / tooltip, если его нет в макете. Для a11y: `aria-label` полным словом (`Added`, `Modified`, `New`, `Deleted`, `Locked`) — видимый текст остаётся A/M/N/D.
- Тёмная тема: пока в Figma нет dark-варианта атома, не перекрашивать hex «инверсией». Тема оболочки не меняет зелёный A на другой смысл.

---

## Запрещено

- Вторая буква, подпись «Added», счётчик.
- Pill / высота ≠ 20 / ширина ≠ 20 для этого атома.
- Свои цвета «как в GitHub».
- Вариант `R` или два замка (exclusive/shared).
