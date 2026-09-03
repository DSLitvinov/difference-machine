# Dialog / файлы workdir и history

База: shadcn Dialog, ширина 451. Код: `FileDialogs.tsx`. Кадров `Dialog / Rename file` / `Dialog / Delete` на холсте нет — тот же shell, что у веток.

Ошибка мутации → **toast**, диалог остаётся открытым (правило [architecture](./architecture.md)). Успех — закрыть.

---

## Rename file

Код: `FileRenameDialog`. API: `workdir.rename` (`path` + `new_name` = только basename, без `/` и `\`).

Источник: [File Preview Item](../components/popovers/file-preview-item.md), [File Action](../components/items/header-file-action.md).

Пустое имя — не вызывать API. После успеха selection переезжает на `new_path`.

---

## Delete in project

Код: `FileDeleteDialog` (title/confirm по умолчанию `Delete in project`). API: `workdir.delete` (корзина ОС, не `os.Remove`).

Источник: тот же popover / header. Destructive. Body в кадре нет.

Не путать с [Delete in history](#delete-in-history) и [Clean repository](./maintenance.md).

---

## Delete in history

Тот же `FileDeleteDialog`, title/confirm = `Delete in history`. API: `commit.delete_file`. Workdir не трогает.

Источник: [File in Commit](../components/popovers/file-in-commit.md) на [View Commit](../views/commit.md). Disabled, если статус строки `D`.
