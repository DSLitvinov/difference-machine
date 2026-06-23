# Paths — macOS / Windows

Канон работы с путями в Forester GUI. Atom-спеки (**multi-repo**, **architecture**, Preview, Content Info) ссылаются сюда, не дублируют правила.

**Стек:** Go (`path/filepath`) + Wails + React.

---

## 1. Два уровня

| Уровень | Примеры | Разделитель | Где |
|---------|---------|-------------|-----|
| **Relative** (внутри репо) | `assets/scene.blend`, `src/app.tsx` | **всегда `/`** | JSON API, VCS (`status.get`), UI списков, `PreviewSelection`, tree `path` |
| **Absolute** (ФС / cfg) | `/Users/me/proj`, `C:\Projects\repo` | **нативный ОС** | `repoPath`, `setup.cfg`, `OpenWithDefaultApp`, `os.Stat` |

Forester backend уже нормализует relative через `filepath.ToSlash` — GUI **не** конвертирует их в `\` на Windows.

---

## 2. Global config — расположение

| ОС | Путь пользователя | Резолв в Go |
|----|-------------------|-------------|
| **macOS** | `~/.dfm/setup.cfg` | `filepath.Join(os.UserHomeDir(), ".dfm", "setup.cfg")` |
| **Windows** | `%USERPROFILE%\.dfm\setup.cfg` | то же |

В документации `~/.dfm` = **home + `.dfm`** на любой платформе.

---

## 3. Absolute paths — канонизация

Перед записью в cfg, в app state и в сравнении путей:

```go
func CanonicalAbsPath(path string) (string, error) {
    abs, err := filepath.Abs(path)
    if err != nil {
        return "", err
    }
    return filepath.Clean(abs), nil
}
```

| Правило | Деталь |
|---------|--------|
| Формат в `setup.cfg` | **Нативный** после `CanonicalAbsPath` (macOS `/…`, Windows `C:\…`) |
| Пробелы | INI в кавычках: `path = "C:\My Projects\repo"` |
| Чтение из cfg | Trim + unquote → `CanonicalAbsPath` перед `os.Stat` |
| Dedupe (`AddKnownRepo`) | `SamePath(a, b)` — см. §5 |
| Symlinks | v1: **не** `EvalSymlinks`; v1.1 optional |

**Не** хранить relative пути репозиториев в `[current repo]` / `[repo]`.

---

## 4. Relative paths — канонизация

```go
func CanonicalRelPath(path string) string {
    p := filepath.ToSlash(strings.TrimSpace(path))
    p = strings.TrimPrefix(p, "./")
    return strings.Trim(p, "/") // '' = repo root segment in tree APIs
}
```

| Контекст | Формат |
|----------|--------|
| Файл в корне | `readme.txt` (без ведущего `/`) |
| Вложенный | `assets/textures/albedo.png` |
| Папка в tree API | `assets/References` или `''` для root |
| Rename в History | `old/path → new/path` (оба relative, `/`) |

Сегменты breadcrumb / `filesForPreview` — делить по `/`, не по `filepath.Separator`.

---

## 5. Сравнение путей (`SamePath`)

```go
func SamePath(a, b string) bool {
    ca, err1 := CanonicalAbsPath(a)
    cb, err2 := CanonicalAbsPath(b)
    if err1 != nil || err2 != nil {
        return false
    }
    if runtime.GOOS == "windows" {
        return strings.EqualFold(ca, cb)
    }
    return ca == cb
}
```

Использовать для: dedupe в `[repo]`, lookup per-repo prefs в `localStorage`.

---

## 6. Файловые операции (Go backend)

| Операция | Код |
|----------|-----|
| Join repo + relative file | `filepath.Join(repoRoot, filepath.FromSlash(fileRel))` |
| Проверка «внутри репо» | `filepath.Rel(repoRoot, absTarget)` — ошибка или `..` prefix → reject |
| Открытие в ОС | abs path нативный; см. §7 |

---

## 7. Открытие файла в приложении ОС

См. [content-preview-project-view.md §4.4](./content-preview-project-view.md).

| ОС | Механизм |
|----|----------|
| **macOS** | `open <absPath>` |
| **Windows** | `ShellExecute` / ассоциированный handler |
| **Linux** | `xdg-open <absPath>` |

`fileRel` в API — relative с `/`; перед вызовом ОС — `Join` + native abs.

---

## 8. Отображение в UI

| Место | Что показывать |
|-------|----------------|
| Repo selector label | `basename(repoPath)` |
| Tooltip полного пути репо | **Нативный** abs (как в ОС) |
| Файлы / папки / diff / History | **Relative** с `/` |
| Content Info file name | `basename`; tooltip = relative path |
| Unicode | UTF-8; без escape в UI |

---

## 9. Примеры `setup.cfg`

### 9.1 macOS

```ini
[current repo]
path = /Users/me/projects/scene-a

[repo]
path_1 = /Users/me/projects/scene-a
path_2 = "/Users/me/My Projects/scene-b"

[forester]
path = /opt/DiffMachine/bin/forester
```

### 9.2 Windows

```ini
[current repo]
path = C:\Users\me\projects\scene-a

[repo]
path_1 = C:\Users\me\projects\scene-a
path_2 = "C:\Users\me\My Projects\scene-b"

[forester]
path = C:\DiffMachine\bin\forester.exe
```

Тот же репозиторий в UI: label `scene-a` на обеих ОС; relative файлы в Preview: `assets/hero.blend`.

---

## 10. `localStorage` (per-repo prefs)

Ключи вида `dfm.sidebar.showChangedOnly::<repoKey>`.

`repoKey` = **канонический abs** из §3 (после `CanonicalAbsPath`). На Windows при чтении/записи использовать тот же `SamePath` для поиска существующего ключа.

---

## 11. Corner cases

| Ситуация | Поведение |
|----------|-----------|
| `\` в relative API | Backend/UI нормализуют в `/` при приёме |
| `C:/mix/slashes` в cfg на Windows | `CanonicalAbsPath` → `C:\mix\slashes` |
| UNC `\\server\share\repo` | Допустимый abs на Windows; кавычки в INI |
| Регистр буквы диска (`c:\` vs `C:\`) | `SamePath` → equal на Windows |
| Путь в cfg с trailing `\` | `filepath.Clean` убирает |
| Перенос cfg macOS → Windows | Пути в `[repo]` невалидны до Re-add; relative в репо не зависят от ОС |
| Path traversal (`../etc`) | Backend reject до FS/OS |

---

## 12. Решения (закрытые)

| # | Тема | Решение |
|---|------|---------|
| 1 | Relative в API/UI | Всегда `/` |
| 2 | Absolute в cfg | Нативный ОС после `CanonicalAbsPath` |
| 3 | Config file | `UserHomeDir()/.dfm/setup.cfg` |
| 4 | Dedupe repos | `SamePath` (case-insensitive на Windows) |
| 5 | FS join | `FromSlash(rel)` + `Join(repoRoot, …)` |
