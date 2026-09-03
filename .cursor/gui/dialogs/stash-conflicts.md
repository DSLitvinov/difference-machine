# Dialog / stash conflicts

Основа: Figma [`Dialog / Error stash`](https://www.figma.com/design/qlwKiMPZblz96VSM2F3DlS/DFM-for-Cursor?node-id=6085-13903), код `StashConflictDialogs.tsx`. Ширина 796, общий Dialog shell и таблица из двух равных колонок.

Диалог имеет два продуктовых варианта. Это не merge веток и не destructive-confirm удаления stash.

| Вариант | Компонент | Когда |
|---------|-----------|-------|
| Рабочая копия ↔ stash | `WorktreeStashConflictDialog` | восстановление stash пересекается с локально изменёнными файлами |
| Stash ↔ stash | `StashStashConflictDialog` | объединение двух stash содержит разные версии одного пути |

## Copy

### Рабочая копия ↔ stash

- Title: **Resolve stash conflicts**
- Description: **Choose which version to keep for each conflicting file before restoring the stash. Double-click a file to compare versions.**
- Левая колонка: **Current files**
- Правая колонка: фактическое имя stash, fallback **Stash**
- Primary: **Restore**

### Stash ↔ stash

- Title: **Resolve stash conflicts**
- Description: **Choose which version to keep for each conflicting file before combining the stashes. Double-click a file to compare versions.**
- Колонки: фактические имена обоих stash, fallback **Stash**
- Primary: **Combine**

Русская локализация следует тому же смыслу: «Разрешить конфликты стэша», «Текущие файлы», «Восстановить», «Объединить».

## Геометрия

- Dialog: 796 px, padding 24, gap 16, radius 8, border + shadow-lg.
- Header: title 18/28 semibold, description 14/20 muted.
- Таблица: border, radius 8, overflow hidden; две колонки по 50%, divider 1 px.
- Заголовок колонки: height 38, background muted, padding 8, text 12/16.
- Строка версии: padding 8×16, text 16/24, длинный path обрезается ellipsis.
- Footer: outline Cancel + primary action, height 40, gap 8.

## Данные и выбор

Один conflict содержит стабильный `id` и по одной версии для каждой стороны:

```ts
type StashConflictFile = {
  id: string
  leftPath: string
  rightPath: string
}
```

Relative paths уже канонические (`/`, без leading slash). UI не преобразует их в абсолютные и не читает диск.

- Каждая строка связывает левую и правую версии одного конфликта.
- Single click / Space на ячейке выбирает эту сторону для конфликта.
- Выбранная ячейка получает Selected (`background/accent`) и `aria-pressed=true`.
- Double click / Enter выбирает эту сторону и открывает сравнение версии, не закрывая диалог.
- Primary disabled, пока не выбрана сторона для каждого конфликта.
- Во время submit обе версии, Cancel, Close и primary disabled.
- Cancel / Close ничего не меняют.
- Ошибка preview/resolve: destructive `AlertBanner` внутри диалога, диалог остаётся открыт. Не дублировать ошибку в toast.

В диалоге нет счётчика, фильтра, badges и дополнительных подсказок вне description: их нет в исходном макете.

## Frontend-контракт

Оба экспортируемых компонента управляют выбором локально и возвращают:

```ts
Record<conflictId, "left" | "right">
```

`onOpenFile(conflict, side)` отвечает только за просмотр/compare. `onResolve(resolutions)` выполняет продуктовую операцию. `error` и `onClearError` управляют `AlertBanner`, как в Merge.

## Backend gap

На 0.8.1 эти компоненты не подключены к `App`:

- `stash.apply` сейчас целиком вызывает `RestoreTreeToWorkdir` и не возвращает conflicts;
- JSON-метода объединения двух stash нет;
- нет метода preview/open для пары worktree↔stash или stash↔stash.

До интеграции backend должен добавить структурированный conflict result, безопасный preview обеих версий и resolve-метод с решениями по `conflictId`. Нельзя открывать диалог парсингом человекочитаемой строки ошибки.
