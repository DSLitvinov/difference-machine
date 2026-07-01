# Панель Save Version

**Класс:** `DF_PT_save_version_panel`  
**Расположение:** View3D Sidebar → Difference Machine (`bl_order = 0`)  
**Исходник:** `ui/ui_panels.py`

---

## Poll

`is_repository_initialized(context)` — вверх по дереву от `.blend` найден `.DFM/`.

---

## Layout

```
┌─────────────────────────────┐
│ [✓] Auto Save               │  ← prefs.auto_save_enabled
│ ┌─────────────────────────┐ │
│ │    Save Version         │ │  ← df.save_version (disabled if Auto Save on)
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## Элементы

| Элемент | Binding | Поведение |
|---------|---------|-----------|
| Auto Save | `prefs.auto_save_enabled` | Checkbox; дублирует настройку из Addon Preferences |
| Save Version | `df.save_version` | `scale_y=1.2`, icon `FILE_TICK`; **disabled** когда Auto Save включён |

---

## Оператор `df.save_version`

1. Требует сохранённый `.blend` и инициализированный репо
2. `wm.save_mainfile`
3. `index.add(".")`
4. `commit.create` с message = `YYYY-MM-DD HH:MM:SS`, author = `prefs.default_author`
5. Report INFO с текстом коммита

**Не спрашивает** message/tag у пользователя.

---

## Auto Save (связанное поведение)

- Timer: `check_auto_save_version` каждые 10 с
- Интервал: `prefs.auto_save_interval` минут
- Тот же pipeline что Save Version, без UI feedback (только log)

---

## Пустые / error states

Панель **скрыта** если репо не инициализировано (`poll` false). Инициализация — через **Init Project** в других панелях.
