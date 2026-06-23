# Panel layout — resize (3 колонки)

Канон ширин и ограничений **Sidebar**, **Content Preview**, **Content Info** в режиме **Project view**. Atom-спеки ссылаются сюда.

**Связанные документы:** [architecture.md §2](./architecture.md) · [content-info-project-view.md](./content-info-project-view.md) · [content-preview-project-view.md](./content-preview-project-view.md)

---

## 1. Колонки

```
Project view (client width = W):
┌────────────────┬──────────────────────────────┬────────────────┐
│ Sidebar        │ Content Preview              │ Content Info   │
│ min 334        │ min 747                      │ min 354        │
│ ◀──handle──▶   │ ◀──────────handle──────────▶ │                │
└────────────────┴──────────────────────────────┴────────────────┘
```

| Панель | Состав | Min width |
|--------|--------|-----------|
| **Sidebar** | Rail (48px fixed) + main panel (дерево / коммиты) | **334px** (вся левая колонка) |
| **Content Preview** | Центральная панель | **747px** |
| **Content Info** | Правая панель (только Project view) | **354px** |

**History view:** Content Info **скрыта** — две колонки: Sidebar + Preview (`W = sidebar + preview`).

---

## 2. Max width — вычисление

`max` каждой панели **не фиксирован** — выводится из min соседних и текущей ширины окна `W` (client area, без chrome ОС).

### 2.1 Project view (3 панели)

Постоянное ограничение:

```text
sidebar + preview + info = W
```

| Панель | Min | Max |
|--------|-----|-----|
| Sidebar | 334 | `W − 747 − 354` = **`W − 1101`** |
| Content Preview | 747 | `W − 334 − 354` = **`W − 688`** |
| Content Info | 354 | `W − 334 − 747` = **`W − 1081`** |

Если вычисленный `max < min` → окно **уже минимума** (см. §5).

### 2.2 History view (2 панели)

```text
sidebar + preview = W
```

| Панель | Min | Max |
|--------|-----|-----|
| Sidebar | 334 | **`W − 747`** |
| Content Preview | 747 | **`W − 334`** |

При переключении Project ↔ History: ширины Sidebar и Preview **сохраняются**; Content Info unmount — её ширина остаётся в state для возврата в Project.

### 2.3 TypeScript helpers

```ts
const SIDEBAR_MIN = 334
const PREVIEW_MIN = 747
const INFO_MIN = 354

function projectLayoutBounds(W: number) {
  return {
    sidebar: { min: SIDEBAR_MIN, max: W - PREVIEW_MIN - INFO_MIN },
    preview: { min: PREVIEW_MIN, max: W - SIDEBAR_MIN - INFO_MIN },
    info: { min: INFO_MIN, max: W - SIDEBAR_MIN - PREVIEW_MIN },
  }
}

function historyLayoutBounds(W: number) {
  return {
    sidebar: { min: SIDEBAR_MIN, max: W - PREVIEW_MIN },
    preview: { min: PREVIEW_MIN, max: W - SIDEBAR_MIN },
  }
}

function clamp(width: number, min: number, max: number): number {
  return Math.min(Math.max(width, min), Math.max(min, max))
}
```

---

## 3. Resize handles

| Handle | Между | Поведение drag |
|--------|-------|----------------|
| **H1** | Sidebar \| Content Preview | Меняет `sidebarWidth`; `previewWidth` компенсирует (Info фикс на момент drag) |
| **H2** | Content Preview \| Content Info | Меняет `infoWidth`; `previewWidth` компенсирует (Sidebar фикс) |

- Hit area: **4px** (визуально `w-px bg-border` + расширенная зона).
- Double-click на H1/H2 — **v1.1** (reset to defaults); в v1 не обязательно.
- Курсор: `col-resize`.
- Sidebar **collapse** → колонка **48px** (только Rail); H1 скрыт; saved `sidebarWidth` восстанавливается при expand.

---

## 4. Defaults и персистентность

| Панель | Default (первый запуск) | Storage key |
|--------|-------------------------|-------------|
| Sidebar | **334px** | `dfm.layout.sidebarWidth` |
| Content Preview | **остаток** `W − 334 − 354` | `dfm.layout.previewWidth` (optional; иначе flex) |
| Content Info | **354px** | `dfm.layout.infoWidth` |

При загрузке: прочитать сохранённые ширины → **clamp** к §2 для текущего `W` → если сумма ≠ `W`, скорректировать **Preview** (flex-поглотитель).

Рекомендация: хранить `sidebarWidth` + `infoWidth`; `previewWidth = W − sidebar − info`.

---

## 5. Corner cases

| Ситуация | Поведение |
|----------|-----------|
| `W < 1435` (Project) | **Enforce** min window 1435×… (Wails `SetMinSize`) |
| `W < 1081` (History) | **Enforce** min window 1081×… |
| Sidebar collapsed (Project) | min `W`: **48 + 747 + 354 = 1149** |
| Sidebar collapsed (History) | min `W`: **48 + 747 = 795** |
| Resize окна ОС | Пересчитать max; clamp сохранённые ширины; Preview забирает delta |
| History mode | Info panel width не меняется в layout, только в persisted state |
| Sidebar collapsed | Preview + Info делят `W − railCollapsedWidth` (v1: collapsed = только Rail 48px; **Settings** остаётся на Rail) |
| Очень широкий монитор | Max растёт линейно с `W`; нет искусственного cap в v1 |

**Минимальная ширина окна (v1):**

| Режим | Min `W` |
|-------|---------|
| Project view | **1435px** (= 334 + 747 + 354) |
| History view | **1081px** (= 334 + 747) |

---

## 6. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Sidebar min | **334px** |
| 2 | Content Preview min | **747px** |
| 3 | Content Info min | **354px** |
| 4 | Max | Вычисляется из `W` и min соседних панелей |
| 5 | Handles | Два: Sidebar\|Preview, Preview\|Info |
| 6 | History | Info скрыта; bounds §2.2 |
| 7 | Min window | **Enforce** (Wails `SetMinSize`) |
| 8 | Collapse | 48px Rail; min W см. §5 |
