# GUI Style Guide для Forester GUI

Этот документ определяет стандарты стилей, отступов и других UI элементов для QML интерфейса Forester GUI.

## Общие принципы

- Стили должны быть согласованными во всех компонентах
- Использовать тему (`Theme`) для всех цветов и стилей
- Следовать принципам VS Code/Obsidian для структуры панелей

## Отступы и размеры

### Размеры элементов

#### Иконки
- **Размер иконок в дереве файлов**: `24px` (iconSize: 24)
- **Размер иконок в других местах**: зависит от контекста, обычно `16px` или `24px`

#### Высота строк
- **Высота строк в дереве файлов**: `28px` (implicitHeight: 28)
- **Высота строк в списках**: зависит от контекста, обычно `22px` - `28px`

#### Spacing между элементами
- **Spacing в RowLayout для дерева файлов**: `6px`
- **Spacing в других RowLayout**: обычно `4px` - `6px`
- **Spacing в ColumnLayout**: обычно `0px` для плотных панелей, `5px` - `10px` для разделенных секций

### Отступы для вложенности

**ВАЖНО**: Не использовать кастомные отступы для вложенности в TreeView. TreeView автоматически обрабатывает отступы через встроенные механизмы Qt.

- **НЕ добавлять** `indentWidth`, `itemDepth`, `calculateDepth` или подобные свойства
- **НЕ добавлять** кастомные `Item` элементы для отступов
- Позволить TreeView использовать стандартные отступы

### Margins и Padding

- **Margins панелей**: обычно `0px` для плотных панелей
- **Margins в StackLayout**: `5px` для контента панелей
- **Padding внутри элементов**: минимальный, обычно `0px` - `4px`

## Цвета и темы

### Использование темы

Всегда использовать `Theme` из `resources.styles 1.0`:

```qml
import resources.styles 1.0

property var theme: Theme {}
```

### Цвета для элементов

- **Фон панелей**: `theme.background`
- **Фон вторичных элементов**: `theme.backgroundSecondary`
- **Фон при наведении**: `theme.backgroundHover`
- **Фон выбранного элемента**: `theme.backgroundSelected`
- **Основной текст**: `theme.textPrimary`
- **Текст выделенного элемента**: `theme.textSelected` (белый `#ffffff`)
- **Вторичный текст**: `theme.textSecondary`
- **Текст placeholder**: `theme.textPlaceholder`
- **Цвет акцента (выделение)**: `theme.accent` (синий `#007acc`)
- **Разделители**: `theme.divider`

## Структура панелей

### StructProjectPanel (Панель структуры проекта)

#### Размеры
- `SplitView.minimumWidth: 100`
- `SplitView.preferredWidth: 300`

#### Элементы
- **Tab bar высота**: `40px`
- **Tab bar margins**: `leftMargin: 10px`, `rightMargin: 10px`
- **Search box высота**: `32px` (если используется)
- **Search box margins**: `leftMargin: 8px`, `rightMargin: 8px`

#### TreeView
- **implicitHeight**: `28px`
- **iconSize**: `24px`
- **spacing в RowLayout**: `6px`
- **НЕ использовать кастомные отступы для вложенности**

### ViewPanel (Панель просмотра)

- Использовать стандартные отступы
- Следовать теме для цветов

## Шрифты

### Размеры шрифтов

- **Основной текст**: `12px` (font.pixelSize: 12)
- **Заголовки**: `13px` - `14px`
- **Мелкий текст**: `10px` - `11px`
- **Placeholder текст**: `12px` - `14px`

### Семейства шрифтов

- **Моноширинный текст (код)**: `"Courier New"` (НЕ использовать `"monospace"`)
- **Обычный текст**: системный шрифт по умолчанию

## Поиск и фильтрация

### Поле поиска

- **Высота**: `32px`
- **Высота TextField**: `24px`
- **Border radius**: `3px`
- **Spacing между элементами**: `6px`

## Иконки

### Пути к иконкам

Всегда использовать `theme.getIconPath()`:

```qml
source: structProjectPanel.theme.getIconPath("folder.svg")
```

### Размеры иконок

- В дереве файлов: `24px`
- В других местах: зависит от контекста

## Интерактивность

### Клики

- **Одиночный клик по папке**: раскрывает/сворачивает папку
- **Одиночный клик по файлу**: выбирает и открывает файл
- **Двойной клик**: не требуется (одиночный клик достаточен)

### Hover эффекты

- Использовать `theme.backgroundHover` для эффекта наведения
- Использовать `theme.accent` для фона выбранных элементов (синий цвет как в VS Code)
- Использовать `theme.textSelected` для текста выбранных элементов (белый цвет)

## ScrollView

### Настройки прокрутки

```qml
ScrollBar.vertical.policy: ScrollBar.AsNeeded
ScrollBar.horizontal.policy: ScrollBar.AsNeeded
```

### Clip

Всегда использовать `clip: true` для TreeView и других прокручиваемых элементов.

## Примеры

### Правильный TreeViewDelegate

```qml
delegate: TreeViewDelegate {
    id: treeDelegate
    implicitHeight: 28
    
    readonly property int iconSize: 24
    readonly property bool isSelected: !model.isDir && model.path && structProjectPanel.selectedFilePath === model.path
    
    contentItem: RowLayout {
        spacing: 6
        width: treeDelegate.width
        
        // НЕ добавлять кастомные отступы для вложенности!
        
        Image {
            Layout.preferredWidth: treeDelegate.iconSize
            Layout.preferredHeight: treeDelegate.iconSize
            source: structProjectPanel.theme.getIconPath("folder.svg")
        }
        
        Text {
            Layout.fillWidth: true
            text: model.display || ""
            color: treeDelegate.isSelected ? theme.textSelected : theme.textPrimary
            font.pixelSize: 12
        }
    }
    
    background: Rectangle {
        anchors.fill: parent
        width: treeDelegate.width
        color: {
            if (treeDelegate.isSelected) {
                return theme.accent
            } else if (treeDelegate.hovered && isClickable) {
                return theme.backgroundHover
            } else {
                return "transparent"
            }
        }
    }
    
    onClicked: {
        if (model.isDir) {
            treeDelegate.expanded = !treeDelegate.expanded
        } else if (model.path) {
            structProjectPanel.selectedFilePath = model.path
            structProjectPanel.fileSelected(model.path)
        }
    }
}
```

### Неправильный TreeViewDelegate (НЕ ДЕЛАТЬ ТАК)

```qml
// ❌ НЕПРАВИЛЬНО: кастомные отступы для вложенности
delegate: TreeViewDelegate {
    readonly property int indentSize: 8
    readonly property int itemDepth: calculateDepth(model.index)
    readonly property int indentWidth: itemDepth * indentSize
    
    contentItem: RowLayout {
        Item {
            Layout.preferredWidth: indentWidth  // ❌ НЕ ДЕЛАТЬ
        }
        // ...
    }
}
```

## Важные правила

### Запрещено использовать хардкод цветов

❌ **НЕПРАВИЛЬНО:**
```qml
color: "#007acc"  // ❌ Хардкод цвета
color: "#ffffff"  // ❌ Хардкод цвета
```

✅ **ПРАВИЛЬНО:**
```qml
color: theme.accent  // ✅ Использование темы
color: theme.textSelected  // ✅ Использование темы
```

### Отладочные сообщения

- ❌ **НЕ использовать** `print()` в Python коде (кроме критических ошибок с traceback)
- ❌ **НЕ использовать** `console.log()` в QML коде
- ✅ Использовать proper logging через `logging` модуль при необходимости

### Отступы в коде

- Использовать правильные отступы (4 пробела для Python, стандартные для QML)
- Не смешивать табы и пробелы

## Чеклист при изменении стилей

- [ ] Используется ли `Theme` для всех цветов?
- [ ] Нет ли хардкода цветов (`#007acc`, `#ffffff` и т.д.)?
- [ ] Соответствуют ли размеры стандартам (iconSize: 24, implicitHeight: 28)?
- [ ] Используется ли правильный spacing (6px для дерева)?
- [ ] Нет ли кастомных отступов для вложенности в TreeView?
- [ ] Используется ли правильный шрифт для кода ("Courier New")?
- [ ] Правильно ли настроены hover и selected состояния?
- [ ] Используется ли `theme.accent` для выделения и `theme.textSelected` для текста выделенных элементов?
- [ ] Удалены ли все отладочные `print()` и `console.log()`?


