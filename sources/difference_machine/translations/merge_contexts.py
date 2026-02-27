#!/usr/bin/env python3
"""
Merge our translations into the context-based .ts structure from lupdate.
Qt looks up by (context, source); we had only context "MainWindow", so other
panels (BranchSelectorPanel, etc.) never found their translations.
"""
import re
from pathlib import Path

# Built-in Russian translations (source -> Russian) when .ts was overwritten
RU_FALLBACK = {
    "Branch": "Ветка", "Branch:": "Ветка:", "Commits:": "Коммиты:", "HEAD:": "HEAD:",
    "Select Branch...": "Выберите ветку...", "Current": "Текущая", "Create": "Создать",
    "Имя ветки": "Имя ветки", "Введите имя": "Введите имя", "Отмена": "Отмена",
    "Репозиторий недоступен": "Репозиторий недоступен", "Не удалось создать ветку": "Не удалось создать ветку",
    "Search files...": "Поиск файлов...", "Files": "Файлы", "No repository": "Репозиторий не выбран",
    "No changed files": "Нет изменённых файлов", "Changed": "Изменено",
    "Commit info": "Информация о коммите", "Author: -": "Автор: -", "Hash:": "Хеш:",
    "Added:": "Добавлено:", "Removed:": "Удалено:", "lines": "строк",
    "Select a commit to view files": "Выберите коммит для просмотра файлов",
    "This file deleted": "Этот файл удалён", "Loading diff...": "Загрузка различий...",
    "Select a commit to view diff": "Выберите коммит для просмотра различий",
    "Select a file to view diff": "Выберите файл для просмотра различий", "Binary file": "Бинарный файл",
    "No diff available": "Различия недоступны", "Name:": "Имя:", "Path:": "Путь:", "Size:": "Размер:",
    "Modified:": "Изменено:", "Created:": "Создано:", "Blender:": "Blender:", "Compare": "Сравнить",
    "Clear compare": "Очистить сравнение", "Diff": "Различия", "Extended diff": "Расширенные различия",
    "From:": "От:", "vs": "vs", "Added": "Добавлено", "Failed to load image": "Не удалось загрузить изображение",
    "Difference Mode - Highlighted pixels show changes": "Режим различий - Выделенные пиксели показывают изменения",
    "Failed to load diff image": "Не удалось загрузить изображение различий", "Opacity:": "Прозрачность:",
    "Image 1 on Top": "Изображение 1 сверху", "Image 2 on Top": "Изображение 2 сверху",
    "Modified": "Изменено", "Deleted": "Удалено", "New": "Новый", "Unknown": "Неизвестно",
    "Укажите сообщение коммита": "Укажите сообщение коммита", "Выберите файлы для коммита": "Выберите файлы для коммита",
    "Не удалось добавить файлы в staging area": "Не удалось добавить файлы в staging area",
    "Не удалось создать коммит": "Не удалось создать коммит", "Explorer": "Проводник",
    "Commits": "Коммиты", "COMMIT": "КОММИТ", "Message *": "Сообщение *",
    "Enter commit message...": "Введите сообщение коммита...", "Author": "Автор",
    "Optional author name": "Необязательное имя автора", "Email": "Email",
    "Optional email": "Необязательный email", "Tag": "Тег", "Optional tag name": "Необязательное имя тега",
    "Создать коммит": "Создать коммит", "Создать ветку от коммита": "Создать ветку от коммита",
    "Введите имя ветки": "Введите имя ветки", "Создать": "Создать", "Коммит не выбран": "Коммит не выбран",
    "Loading image diff...": "Загрузка различий изображения...", "2-up": "2-вверх",
    "Swipe": "Свайп", "Onion Skin": "Луковая кожа", "Difference": "Различия",
    "W:": "Ш:", "H:": "В:", "Diff:": "Разница:", "B": "Б", "KB": "КБ", "MB": "МБ", "GB": "ГБ",
    "Preview": "Просмотр", "Select a file to view": "Выберите файл для просмотра",
    "Это файлы редактора Blender": "Это файлы редактора Blender",
    "Please open to external editor": "Пожалуйста, откройте во внешнем редакторе",
    "Failed to load GIF": "Не удалось загрузить GIF",
    "Set Blender path in ~/.dfm/setup.cfg": "Укажите путь к Blender в ~/.dfm/setup.cfg",
    "Файл": "Файл", "Язык": "Язык", "Выход": "Выход", "Репозиторий": "Репозиторий", "Открыть": "Открыть",
    "Инициализировать": "Инициализировать", "Удалить старые stash состояния": "Удалить старые stash состояния",
    "Ветка": "Ветка", "Слияние веток": "Слияние веток", "Удалить текущую ветку": "Удалить текущую ветку",
    "Помощь": "Помощь", "О программе": "О программе", "Удалить ветку": "Удалить ветку",
    "Вы уверены, что хотите удалить текущую ветку?": "Вы уверены, что хотите удалить текущую ветку?",
    "Удалить": "Удалить", "Не удалось удалить ветку": "Не удалось удалить ветку", "Ошибка": "Ошибка", "ОК": "ОК",
    "Инициализация репозитория": "Инициализация репозитория",
    "Инициализировать репозиторий в текущем каталоге?": "Инициализировать репозиторий в текущем каталоге?",
    "Каталог не выбран": "Каталог не выбран", "Difference Machine": "Difference Machine", "Версия": "Версия",
    "Ветка для слияния:": "Ветка для слияния:", "Хеш: ": "Хеш: ", "Автор: ": "Автор: ", "Время: ": "Время: ",
    "Сообщение: ": "Сообщение: ", "Файлы для слияния:": "Файлы для слияния:", "Объекты для слияния:": "Объекты для слияния:",
    "Выберите файл в списке слева": "Выберите файл в списке слева", "theirs": "их", "ours": "наши",
    "Conflicts: ": "Конфликты: ", "Resolve automatically": "Разрешить автоматически", "Resolve in Blender": "Разрешить в Blender",
    "Continue merge": "Продолжить слияние", "Выполнить слияние": "Выполнить слияние",
    "MIME:": "MIME:", "Language:": "Язык:", "Lines:": "Строк:", "Encoding:": "Кодировка:", "Resolution:": "Разрешение:",
    "Open in Blender": "Открыть в Blender",
    # Settings dialog
    "Настройки": "Настройки", "Пользователь": "Пользователь", "Редакторы": "Редакторы",
    "Сборщик мусора": "Сборщик мусора", "Имя": "Имя", "Почта": "Почта",
    "Путь к исполняемому файлу Forester": "Путь к исполняемому файлу Forester",
    "Обзор...": "Обзор...", "Путь к Blender": "Путь к Blender",
    "Интервал GC (дней)": "Интервал GC (дней)", "Срок хранения reflog (дней)": "Срок хранения reflog (дней)",
    "Сброс": "Сброс",
}
# English: source -> English (for sources that are Russian, translate to English)
EN_FALLBACK = {
    "Branch": "Branch", "Branch:": "Branch:", "Commits:": "Commits:", "HEAD:": "HEAD:",
    "Select Branch...": "Select Branch...", "Current": "Current", "Create": "Create",
    "Имя ветки": "Branch Name", "Введите имя": "Enter name", "Отмена": "Cancel",
    "Репозиторий недоступен": "Repository not available", "Не удалось создать ветку": "Failed to create branch",
    "Search files...": "Search files...", "Files": "Files", "No repository": "No repository",
    "No changed files": "No changed files", "Changed": "Changed",
    "Commit info": "Commit info", "Author: -": "Author: -", "Hash:": "Hash:",
    "Added:": "Added:", "Removed:": "Removed:", "lines": "lines",
    "Select a commit to view files": "Select a commit to view files",
    "This file deleted": "This file deleted", "Loading diff...": "Loading diff...",
    "Select a commit to view diff": "Select a commit to view diff",
    "Select a file to view diff": "Select a file to view diff", "Binary file": "Binary file",
    "No diff available": "No diff available", "Name:": "Name:", "Path:": "Path:", "Size:": "Size:",
    "Modified:": "Modified:", "Created:": "Created:", "Blender:": "Blender:", "Compare": "Compare",
    "Clear compare": "Clear compare", "Diff": "Diff", "Extended diff": "Extended diff",
    "From:": "From:", "vs": "vs", "Added": "Added", "Failed to load image": "Failed to load image",
    "Difference Mode - Highlighted pixels show changes": "Difference Mode - Highlighted pixels show changes",
    "Failed to load diff image": "Failed to load diff image", "Opacity:": "Opacity:",
    "Image 1 on Top": "Image 1 on Top", "Image 2 on Top": "Image 2 on Top",
    "Modified": "Modified", "Deleted": "Deleted", "New": "New", "Unknown": "Unknown",
    "Укажите сообщение коммита": "Please specify a commit message", "Выберите файлы для коммита": "Select files for commit",
    "Не удалось добавить файлы в staging area": "Failed to add files to staging area",
    "Не удалось создать коммит": "Failed to create commit", "Explorer": "Explorer",
    "Commits": "Commits", "COMMIT": "COMMIT", "Message *": "Message *",
    "Enter commit message...": "Enter commit message...", "Author": "Author",
    "Optional author name": "Optional author name", "Email": "Email",
    "Optional email": "Optional email", "Tag": "Tag", "Optional tag name": "Optional tag name",
    "Создать коммит": "Create Commit", "Создать ветку от коммита": "Create Branch from Commit",
    "Введите имя ветки": "Enter branch name", "Создать": "Create", "Коммит не выбран": "Commit not selected",
    "Loading image diff...": "Loading image diff...", "2-up": "2-up",
    "Swipe": "Swipe", "Onion Skin": "Onion Skin", "Difference": "Difference",
    "W:": "W:", "H:": "H:", "Diff:": "Diff:", "B": "B", "KB": "KB", "MB": "MB", "GB": "GB",
    "Preview": "Preview", "Select a file to view": "Select a file to view",
    "Это файлы редактора Blender": "These are Blender editor files",
    "Please open to external editor": "Please open to external editor",
    "Failed to load GIF": "Failed to load GIF",
    "Set Blender path in ~/.dfm/setup.cfg": "Set Blender path in ~/.dfm/setup.cfg",
    "Файл": "File", "Язык": "Language", "Выход": "Exit", "Репозиторий": "Repository", "Открыть": "Open",
    "Инициализировать": "Initialize", "Удалить старые stash состояния": "Clear old stash states",
    "Ветка": "Branch", "Слияние веток": "Merge Branches", "Удалить текущую ветку": "Delete Current Branch",
    "Помощь": "Help", "О программе": "About", "Удалить ветку": "Delete Branch",
    "Вы уверены, что хотите удалить текущую ветку?": "Are you sure you want to delete the current branch?",
    "Удалить": "Delete", "Не удалось удалить ветку": "Failed to delete branch", "Ошибка": "Error", "ОК": "OK",
    "Инициализация репозитория": "Initialize Repository",
    "Инициализировать репозиторий в текущем каталоге?": "Initialize repository in the current directory?",
    "Каталог не выбран": "Directory not selected", "Difference Machine": "Difference Machine", "Версия": "Version",
    "Ветка для слияния:": "Branch to merge:", "Хеш: ": "Hash: ", "Автор: ": "Author: ", "Время: ": "Time: ",
    "Сообщение: ": "Message: ", "Файлы для слияния:": "Files to merge:", "Объекты для слияния:": "Objects to merge:",
    "Выберите файл в списке слева": "Select a file from the list on the left", "theirs": "theirs", "ours": "ours",
    "Conflicts: ": "Conflicts: ", "Resolve automatically": "Resolve automatically", "Resolve in Blender": "Resolve in Blender",
    "Continue merge": "Continue merge", "Выполнить слияние": "Perform Merge",
    "MIME:": "MIME:", "Language:": "Language:", "Lines:": "Lines:", "Encoding:": "Encoding:", "Resolution:": "Resolution:",
    "Open in Blender": "Open in Blender",
    # Settings dialog
    "Настройки": "Settings", "Пользователь": "User", "Редакторы": "Editors",
    "Сборщик мусора": "Garbage Collector", "Имя": "Name", "Почта": "Email",
    "Путь к исполняемому файлу Forester": "Path to Forester executable",
    "Обзор...": "Browse...", "Путь к Blender": "Path to Blender",
    "Интервал GC (дней)": "GC interval (days)", "Срок хранения reflog (дней)": "Reflog expire (days)",
    "Сброс": "Reset",
}
BLEND_REGISTRY_RU = (
    "Объекты для этого .blend не найдены в реестре.\n"
    "Откройте файл в Blender, выберите коммит (или HEAD) в панели Compare и нажмите «Sync Objects to DB»."
)
BLEND_REGISTRY_EN = (
    "Objects for this .blend file were not found in the registry.\n"
    "Open the file in Blender, select a commit (or HEAD) in the Compare panel and click \"Sync Objects to DB\"."
)
RU_FALLBACK[BLEND_REGISTRY_RU] = BLEND_REGISTRY_RU
EN_FALLBACK[BLEND_REGISTRY_RU] = BLEND_REGISTRY_EN

def parse_source_to_translation(ts_path):
    """Build dict source -> translation from existing .ts (any context)."""
    text = ts_path.read_text(encoding="utf-8")
    d = {}
    # Split by message blocks
    for m in re.finditer(r"<message>\s*<source>([\s\S]*?)</source>\s*<translation[^>]*>([\s\S]*?)</translation>\s*</message>", text):
        src = m.group(1).strip().replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        trans = m.group(2).strip().replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        if trans and "type=" not in m.group(0):
            d[src] = trans
        elif src:
            d[src] = src  # unfinished: use source
    return d

def escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def main():
    base = Path(__file__).parent
    context_ts = base / "difference_machine_contexts.ts"
    ru_map = parse_source_to_translation(base / "difference_machine_ru.ts")
    en_map = parse_source_to_translation(base / "difference_machine_en.ts")
    # If .ts were overwritten with context structure (empty translations), use built-in dict
    if not ru_map or all(ru_map.get(k) == k for k in list(ru_map)[:5]):
        ru_map = dict(RU_FALLBACK)
    else:
        for k, v in RU_FALLBACK.items():
            ru_map[k] = v
    if not en_map or all(en_map.get(k) == k for k in list(en_map)[:5]):
        en_map = dict(EN_FALLBACK)
    else:
        for k, v in EN_FALLBACK.items():
            en_map[k] = v

    ctx_text = context_ts.read_text(encoding="utf-8")

    def fill(content, trans_map):
        out = []
        i = 0
        pattern = re.compile(
            r"<message>(\s*)(<location[^>]*/>\s*)*<source>([\s\S]*?)</source>(\s*)<translation[^>]*>[\s\S]*?</translation>",
            re.DOTALL
        )
        for m in pattern.finditer(content):
            out.append(content[i:m.start()])
            src = m.group(3).strip().replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
            trans = trans_map.get(src, src)
            locs = m.group(2) or ""
            out.append("<message>")
            out.append(m.group(1))
            out.append(locs)
            out.append("<source>")
            out.append(escape(src))
            out.append("</source>")
            out.append(m.group(4))
            out.append("<translation>")
            out.append(escape(trans))
            out.append("</translation>")
            i = m.end()
        out.append(content[i:])
        return "".join(out)

    for lang, trans_map, name in [("ru", ru_map, "difference_machine_ru.ts"), ("en", en_map, "difference_machine_en.ts")]:
        filled = fill(ctx_text, trans_map)
        filled = re.sub(r'<TS version="2\.1">', f'<TS version="2.1" language="{lang}">', filled, count=1)
        (base / name).write_text(filled, encoding="utf-8")
        print(f"Written {name}")

if __name__ == "__main__":
    main()
