# Dialog / обслуживание репозитория

Меню [Repository](../components/items/header-window.md): Verify и Recover в одной группе, Clean — следующая. Кадров на холсте нет. Код: `RepoMaintenanceDialogs.tsx`, Clean — `FileDeleteDialog`.

Ошибки Verify / Recover — **в диалоге**, не toast. Clean — toast (`SessionInfo.error`), диалог закрывается только после успеха.

---

## Verify repository

Код: `VerifyRepositoryDialog`. API: `repo.rebuild`.

Вход: меню Repository; кнопка на [DFM Damaged](../views/project-browse.md).

Показать `commits_found`, `trees_found`, `blobs_found`. Если `damaged` — строка [There are broken objects/refs](../components/placeholders/damaged.md). Close. После вызова — refresh `status.get` (экран Damaged снимается, если HEAD снова читается).

---

## Recover commit

Код: `RecoverCommitDialog`. `reflog.get` (`limit` 100) → список; `exists: false` disabled. `reflog.restore` на выбранный `commit_hash` (снимает `delete`, затем `commit.reset` mixed).

Пустой список / все `exists: false` — copy «нет записей», Recover disabled. Ошибка get или restore — текст в диалоге.

---

## Clean repository

Не метод Forester. `FileDeleteDialog`: title `Do you really want to clean the repository?`, body про удаление `.DFM/`, confirm `Clean repository`.

1. Подтверждение.
2. `jsonapi.Close`.
3. Удалить только `filepath.Join(repoRoot, ".DFM")`. Не `workdir.delete`.
4. UI: `isRepository` нет; Create repository в History. Не вызывать `status.get` / `workdir.*` пока снова не будет `.DFM/`.

Не путать с Remove repo from list (только `repos.cfg`).
