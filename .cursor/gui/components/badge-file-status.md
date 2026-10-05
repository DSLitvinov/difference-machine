# File Status Badge

Кастомный атом поверх [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge).  
Figma: [Atom / Badges / File DFM Status](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=4191-5880) (`4191:5880`).

Компонент в коде: `FileStatusBadge`.  
Property Figma: `type`.

Не путать с [бейджем объекта Blender](./badge-object-status.md) (слова MERGE / RENAME / DELETE, ширина по контенту).

---

## Назначение

Индикатор статуса **файла** (и `ignored` на папке) в сетке preview, дереве, списке изменений. Не кликабелен сам по себе: hit-target — родитель (тайл, строка).

Атом **не** вызывает API. Панель передаёт уже вычисленный `type`.

---

## Варианты (`type`)

В макете семь значений. Других букв и иконок нет (нет shared/exclusive lock).

| `type` | Знак | Смысл | Данные Forester |
|--------|------|--------|-----------------|
| `appended` | Plus | Добавлен в VCS (есть в index, не было в HEAD) | `status.get.staged_new_files`; `diff.name_status` status `A` |
| `modified` | Pencil | Содержимое изменено | `staged_modified_files` / `unstaged_modified_files`; diff `M` |
| `new` | FilePlus | Неотслеживаемый | `untracked_files` |
| `delete` | Trash | Удалён | `staged_deleted_files` / `unstaged_deleted_files`; diff `D` |
| `rename` | Replace | Переименован | `status.get.renamed_files` (`path` или `old_path`); `diff.name_status` status `R` |
| `ignored` | EyeOff | Попадает в `.dfmignore` | `workdir.entries` / `search` с `include_ignored`: поле `ignored` |
| `lock` | Lock | Файл заблокирован | `lock.list` — есть запись с этим `file_path` |

---

## Внешний вид

Два вида одного атома. Букв A/M/N/D/R/i нет.

| Где | Вид |
|-----|-----|
| Тайл сетки | `iconOnly`: круг 20×20, иконка 12, внизу превью (отступ 8), по горизонтали по центру |
| File Info и строка файла в коммите | pill высотой 20, `rounded-full`, иконка 12 и подпись |

Ряд на превью — горизонталь, `gap` 4, прижат к нижнему краю. **Lock слева**, затем ignored или статус файла. `ignored` вытесняет appended/modified/new/delete/rename.

| `type` | Фон | Знак |
|--------|-----|------|
| `appended` | `#86efac` / `#166534` | Plus, подпись Appended |
| `modified` | `#fdba74` / `#7c2d12` | Pencil, Modified |
| `new` | `#60a5fa` / `#1e3a8a` | FilePlus, New |
| `delete` | `#fca5a5` / `#dc2626` | Trash, Deleted |
| `rename` | `#c084fc` / `#581c87` | Replace, Renamed |
| `ignored` | `#cbd5e1` / `#334155` | EyeOff |
| `lock` | белый, обводка `#d4d4d8`, текст `#18181b` | Lock |

Бейдж объекта внутри `.blend` — отдельный атом. Не сливать его с File Status.

---

## Состояния взаимодействия

В компонентном сете Figma **нет** hover / pressed / disabled / selected. Это статичный индикатор.

| Состояние | Поведение |
|-----------|-----------|
| default | как в таблице вариантов |
| hover / active | не менять заливку, обводку, scale |
| disabled | не вводить отдельный вид; если родитель disabled — opacity родителя, не серый бейдж |
| selected строки | бейдж не инвертируется |
| loading | VCS-letter — пока нет `status.get`; **i** — пока нет `entry.ignored`; lock — пока нет `lock.list`. Не ставить spinner внутрь 20×20 |
| отсутствие статуса | **не рендерить** атом (нет «пустого» квадрата) |

`lock` и статус — разные экземпляры. Если файл и изменён, и залочен, родитель ставит **два** бейджа в один ряд внизу превью: lock слева, статус справа. `ignored` вытесняет VCS-статус.

---

## Приоритет letter

Один path — один letter-бейдж. `ignored` важнее VCS. Дальше `renamed_files` важнее new/delete: `workdir.rename` даёт untracked + deleted, пока path не в index.

1. `entry.ignored` → `ignored` (**i**)
2. иначе `renamed_files` (`path` или `old_path`) → `rename`
3. иначе `staged_new_files` → `appended`
4. иначе `untracked_files` → `new`
5. иначе modified (staged или unstaged) → `modified`
6. иначе deleted (staged или unstaged) → `delete`
7. иначе letter нет

`lock` считается отдельно и не вытесняет letter.

---

## Код

`FileStatusBadge` — `span`, не shadcn `Badge`. `iconOnly` на тайлах сетки. Подпись видна на pill. `aria-label` — то же слово, что на pill. Не добавлять tooltip.

---

## Запрещено

- Вторая буква, подпись «Added», счётчик.
- Pill / высота ≠ 20 / ширина ≠ 20 для этого атома.
- Свои цвета «как в GitHub».
- Два замка (exclusive/shared).
