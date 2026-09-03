# Dialog / restore, revert, reset, stash

База: `RestoreFileDialog` (`RestoreFileDialog.tsx`), ширина 451. Кадра на холсте нет. Destructive confirm, не `window.confirm`.

Ошибка мутации → **toast**, диалог открыт. Успех — закрыть.

| Действие | Title / confirm | API | Откуда |
|----------|-----------------|-----|--------|
| Restore this version | copy пункта меню | `restore.version` | [Commit Card](../components/popovers/commit-card.md) |
| Revert commit | copy пункта | `commit.revert` | тот же popover |
| Reset branch to commit | copy пункта | `commit.reset` `mode: mixed` | тот же popover |
| Revert **файла** | `Revert` | `restore.file` `paths: [path]` | шапка [commit-diff-*](../components/items/commit-diff-text.md) |
| Delete stash | copy Delete | `stash.drop` | [Stash Card](../components/atoms/card-stage.md) |

`stash.apply` (Restore state) — без confirm и сразу API, пока backend не умеет возвращать структурированные конфликты. После появления conflict/resolve API пересечение с изменённым worktree открывает [Worktree ↔ stash conflicts](./stash-conflicts.md); бесконфликтное восстановление остаётся без диалога.

`compare.extract` (Compare / Clean temporary folder) — без confirm. Ошибка → toast.

Не путать `restore.file` / `restore.version` с [Recover commit](./maintenance.md) (`reflog.restore`).
