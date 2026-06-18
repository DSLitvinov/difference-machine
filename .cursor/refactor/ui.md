# Difference Machine — Структура и спецификация UI

Документ для создания дизайн-макетов. Все значения извлечены из `sources/difference_machine`.

---

## 1. Обзор приложения

- **Окно**: 1200×800 px (по умолчанию)
- **Компоновка**: ColumnLayout (вертикальная) → SplitView (горизонтальная)
- **Тема**: Светлая/Тёмная (авто из `Qt.application.styleHints.colorScheme`)

---

## 2. Иерархия layout

```
ApplicationWindow
├── MenuBar (высота: 24)
│   ├── Файл
│   ├── Репозиторий
│   ├── Ветка
│   └── Помощь
└── ColumnLayout
    └── SplitView [горизонтальный]
        ├── СЛЕВА: ColumnLayout (preferredWidth: 320, min: 220)
        │   ├── Панель выбора репо (высота: 56)
        │   └── StructProjectPanel (заполняет)
        └── СПРАВА: StackLayout [Обозреватель | Коммиты]
            ├── ViewPanel (просмотр файла) — вкладка 0
            └── ColumnLayout — вкладка 1 (Коммиты)
                ├── BranchSelectorPanel
                └── SplitView [горизонтальный]
                    ├── CommitsListPanel (preferred: 280, min: 180)
                    └── ColumnLayout
                        ├── CommitInfoPanel
                        └── SplitView [горизонтальный]
                            ├── ChangesPanel (preferred: 280, min: 120)
                            └── DiffPanel (заполняет)
```

---

## 3. Цветовая палитра

### 3.1 Светлая тема

| Token | Hex | Назначение |
|-------|-----|------------|
| background | `#ffffff` | Основной фон |
| backgroundSecondary | `#f3f3f3` | Панели, поля ввода, заголовки |
| backgroundTertiary | `#e8e8e8` | Активная вкладка |
| backgroundHover | `#e5e5e5` | Состояние наведения |
| backgroundSelected | `#cce5ff` | Выбранный элемент (светло-синий) |
| textSelected | `#000000` | Текст на выбранном (тёмный) |
| menuBarBackground | `#f0f0f0` | Строка меню |
| tabBarBackground | `#f3f3f3` | Панель вкладок |
| tabBarActiveBackground | `#e8e8e8` | Активная вкладка |
| tabBarActiveIndicator | `#007acc` | Индикатор вкладки |
| divider | `#d0d0d0` | Границы, разделители |
| textPrimary | `#000000` | Основной текст |
| textSecondary | `#333333` | Вторичный текст |
| textTertiary | `#666666` | Третичный текст |
| textDisabled | `#999999` | Неактивный |
| textPlaceholder | `#808080` | Плейсхолдеры |
| scrollBarBackground | `#ffffff` | Дорожка скроллбара |
| scrollBarNormal | `#d0d0d0` | Ползунок скроллбара |
| scrollBarHover | `#b0b0b0` | Ползунок при наведении |
| scrollBarPressed | `#909090` | Ползунок при нажатии |
| metadataPanelBackground | `#f5f5f5` | Панель метаданных |
| accent | `#007acc` | Основной акцент (синий) |
| accentLanguage | `#0066cc` | Акцент языка |
| error | `#cc0000` | Текст ошибки |
| diffAdded | `#22863a` | Git добавлено |
| diffRemoved | `#cb2431` | Git удалено |
| diffModified | `#0366d6` | Git изменено |
| diffDeleted | `#6a737d` | Git удалён |
| buttonPrimaryBg | `#007acc` | Основная кнопка |
| buttonPrimaryBgHover | `#006bb3` | Основная при наведении |
| buttonPrimaryText | `#ffffff` | Текст основной кнопки |
| buttonSecondaryBg | `#e8e8e8` | Вторичная кнопка |
| buttonSecondaryBgHover | `#d8d8d8` | Вторичная при наведении |
| buttonSecondaryBorder | `#d0d0d0` | Граница вторичной |
| buttonSecondaryText | `#000000` | Текст вторичной |
| buttonGhostBg | `transparent` | Прозрачная кнопка |
| buttonGhostBgHover | `#e5e5e5` | Прозрачная при наведении |
| buttonGhostText | `#000000` | Текст прозрачной |
| contextMenuBackground | `#f3f3f3` | Контекстное меню |
| contextMenuBorderColor | `#d0d0d0` | Граница контекстного меню |
| contextMenuTextColor | `#000000` | Текст контекстного меню |
| contextMenuHoverBg | `#e5e5e5` | Контекстное меню при наведении |

### 3.2 Тёмная тема

| Token | Hex | Назначение |
|-------|-----|------------|
| background | `#1e1e1e` | Основной фон |
| backgroundSecondary | `#252526` | Панели |
| backgroundTertiary | `#2d2d30` | Активная вкладка |
| backgroundHover | `#2a2a2a` | Наведение |
| backgroundSelected | `#3a5a7a` | Выбранный (тёмно-синий) |
| textSelected | `#ffffff` | Текст на выбранном |
| menuBarBackground | `#3a3a3a` | Строка меню |
| tabBarBackground | `#252526` | Панель вкладок |
| tabBarActiveBackground | `#2d2d30` | Активная вкладка |
| tabBarActiveIndicator | `#007acc` | Индикатор вкладки |
| divider | `#404040` | Границы |
| textPrimary | `#ffffff` | Основной текст |
| textSecondary | `#aaaaaa` | Вторичный |
| textTertiary | `#888888` | Третичный |
| textDisabled | `#666666` | Неактивный |
| textPlaceholder | `#808080` | Плейсхолдеры |
| scrollBarBackground | `#1e1e1e` | Дорожка скроллбара |
| scrollBarNormal | `#3a3a3a` | Ползунок скроллбара |
| scrollBarHover | `#4a4a4a` | Ползунок при наведении |
| scrollBarPressed | `#555555` | Ползунок при нажатии |
| metadataPanelBackground | `#252525` | Метаданные |
| accent | `#007acc` | Основной акцент |
| accentLanguage | `#66D9EF` | Акцент языка |
| error | `#ff6666` | Ошибка |
| diffAdded | `#22863a` | Git добавлено |
| diffRemoved | `#cb2431` | Git удалено |
| diffModified | `#0366d6` | Git изменено |
| diffDeleted | `#6a737d` | Git удалён |
| buttonPrimaryBg | `#007acc` | Основная |
| buttonPrimaryBgHover | `#006bb3` | Основная при наведении |
| buttonPrimaryText | `#ffffff` | Текст основной |
| buttonSecondaryBg | `#2d2d30` | Вторичная |
| buttonSecondaryBgHover | `#3d3d40` | Вторичная при наведении |
| buttonSecondaryBorder | `#404040` | Граница вторичной |
| buttonSecondaryText | `#ffffff` | Текст вторичной |
| buttonGhostBg | `transparent` | Прозрачная |
| buttonGhostBgHover | `#2a2a2a` | Прозрачная при наведении |
| buttonGhostText | `#ffffff` | Текст прозрачной |
| contextMenuBackground | `#252526` | Контекстное меню |
| contextMenuBorderColor | `#404040` | Граница контекстного меню |
| contextMenuTextColor | `#ffffff` | Текст контекстного меню |
| contextMenuHoverBg | `#2a2a2a` | Контекстное меню при наведении |

---

## 4. Типографика

| Token | Размер (px) | Назначение |
|-------|-------------|------------|
| fontPixelSizeCaption | 10 | Подписи, бейджи |
| fontPixelSizeSmall | 11 | Мелкий текст, метки |
| fontPixelSizeBody | 12 | Основной текст |
| fontPixelSizeSubhead | 13 | Подзаголовки |
| fontPixelSizeTitle | 14 | Заголовки секций |
| fontPixelSizeHeadline | 16 | Крупные заголовки |
| fontMonospace | `"Courier New"` | Код, хеши |

---

## 5. Радиусы скругления

| Token | Значение | Назначение |
|-------|----------|------------|
| radiusSmall | 3 | Мелкие элементы |
| radiusMedium | 4 | Кнопки, поля ввода, меню |
| radiusLarge | 6 | Панели, диалоги |
| radiusBadge | 8 | Бейджи статуса |

---

## 6. Панели (подробно)

### 6.1 Панель выбора репозитория
- **Высота**: 56 px
- **Фон**: backgroundSecondary
- **Отступы**: 12 px со всех сторон
- **Расстояние между элементами**: 6 px
- **Элементы**:
  - ComboBox: высота 32 px, leftPadding 8, радиус 4
  - Кнопка «+»: 32×32 px, плоская

### 6.2 StructProjectPanel (слева — дерево файлов)
- **SplitView**: preferredWidth 300, minimumWidth 0
- **Константы**: headerRowMargin 12, headerRowSpacing 12, headerRowVerticalMargin 12
- **Сегментный переключатель (Все/Изменены)**:
  - Высота: 32 px
  - Радиус: radiusLarge (6)
  - Фон: tabBarBackground
  - Две равные половины, выбранная: backgroundSelected + textSelected
- **Поле поиска**:
  - Высота: 36 px
  - Отступы: 8 L, 6 R, 6 T/B
  - Радиус: radiusMedium
  - Граница: 1 px divider
  - Иконка очистки «✕»: ширина 20 px, fontPixelSizeSmall
- **Заголовок «Файлы»**:
  - Высота: 44 px
  - Фон: backgroundSecondary
  - Отступы: 12 px
  - Текст: «Файлы», fontPixelSizeSubhead, жирный
- **Строка «Выбрать все»** (видна на вкладке «Изменены»):
  - Высота: 28 px
  - CheckBox + текст «Все»
  - Отступы: 12 L/R, расстояние 6
- **FileTreeView**:
  - Высота строки: 28 px
  - Размер иконки: 24 px
  - Расстояние между строками: 6 px
  - Чекбоксы для папок (трёхсостояние) и файлов
- **Панель коммита** (видна на вкладке «Изменены»):
  - Заголовок: «КОММИТ», высота 44 px, сворачиваемая
  - Отступы формы: 12 L/R, 8 сверху, 12 снизу
  - Расстояние в форме: 8 px
  - Расстояние между полями: 4 px
  - TextArea сообщения: высота 64 px, min 64 px
  - TextField/TextArea: backgroundSecondary, граница 1 px divider, радиус radiusMedium

### 6.3 BranchSelectorPanel
- **Фон**: tabBarBackground
- **HeaderPanel**: contentMargins 12, contentSpacing 6
- **Кнопка ветки**: 180×24 px, радиус radiusMedium
- **Создать ветку «+»**: 24×24 px
- **Элемент списка веток**: высота 36 px, отступы 12

### 6.4 CommitsListPanel
- **SplitView**: preferredWidth 280, minimumWidth 180
- **Заголовок**: «Коммиты», высота 44 px, отступы 12
- **Элемент коммита**: высота 60 px
  - Отступы: 12 L/R, 8 T/B
  - Сообщение: fontPixelSizeSubhead, жирный
  - Автор/хеш: fontPixelSizeSmall, textSecondary/textTertiary

### 6.5 CommitInfoPanel
- **Фон**: tabBarBackground
- **HeaderPanel**: contentMargins 12, contentSpacing 8
- **Сообщение**: fontPixelSizeTitle, жирный
- **Автор**: fontPixelSizeSmall, textSecondary
- **Хеш**: fontMonospace, fontPixelSizeSmall

### 6.6 ChangesPanel (файлы коммита)
- **SplitView**: preferredWidth 280, minimumWidth 120
- **Заголовок**: «Файлы», высота 44 px, отступы 12
- **Список файлов**: ListView с FileListItem

### 6.7 DiffPanel
- **SplitView**: заполняет
- **Содержимое**: просмотр diff (текст, изображение, бинарный)

### 6.8 ViewPanel
- **SplitView**: заполняет
- **Содержимое**: просмотр файла (текст, изображение, gif, заглушка бинарного)

### 6.9 HeaderPanel (базовый)
- **contentMargins**: 12 (по умолчанию)
- **contentSpacing**: 6 (по умолчанию)
- **Фон**: tabBarBackground
- **Нижний разделитель**: 1 px

---

## 7. Элементы управления

### 7.1 TextField
- **Цвет**: textPrimary
- **Плейсхолдер**: textPlaceholder
- **Фон**: Rectangle — backgroundSecondary, граница 1 px divider, радиус radiusMedium

### 7.2 TextArea
- **Как TextField** + inputMethodHints: NoPredictiveText | SensitiveData

### 7.3 Button
- **Основная**: buttonPrimaryBg, при наведении buttonPrimaryBgHover, текст buttonPrimaryText
- **Вторичная**: buttonSecondaryBg, граница buttonSecondaryBorder
- **Прозрачная**: transparent, при наведении buttonGhostBgHover

### 7.4 CheckBox
- **Стандартный Qt** CheckBox, трёхсостояние для «выбрать все»

### 7.5 ComboBox
- **Высота**: 32 px
- **Фон**: background, граница divider, радиус 4
- **Меню**: min width 200, фон backgroundSecondary, граница divider, радиус radiusMedium, padding 4

### 7.6 MenuItem
- **Высота**: 28 px
- **Отступы**: 10 L/R, 8 контент
- **Шрифт**: fontPixelSizeSmall
- **Выделенный**: backgroundSelected, textSelected

### 7.7 MenuBarItem
- **Высота**: 24 px
- **Отступы**: 10 L/R

### 7.8 Ручка SplitView
- **Ширина**: 1 px
- **Цвет**: divider, прозрачность 0.6 (0.9 при наведении/нажатии)

### 7.9 ScrollBar
- **Вертикальный**: policy AsNeeded, implicitWidth 8
- **Фон**: scrollBarBackground, радиус 4
- **Ползунок**: scrollBarNormal, при наведении scrollBarHover, при нажатии scrollBarPressed, радиус 4

---

## 8. Контекстное меню

- **Фон**: contextMenuBackground
- **Граница**: 1 px contextMenuBorderColor
- **Радиус**: contextMenuRadius (4)
- **Отступы**: 4 px
- **Высота элемента**: 28 px
- **Высота разделителя**: 8 px
- **Отступ текста слева**: 8 px
- **Размер шрифта**: 11 px
- **Мин. ширина**: 200 px

---

## 9. Диалоги и всплывающие окна

### 9.1 Диалог настроек
- **Размер**: 720×480 px
- **Фон**: background, граница divider, радиус radiusLarge
- **Заголовок**: высота 56 px, заголовок fontPixelSizeTitle, кнопка закрытия 24×24
- **Левая панель**: ширина 200 px, backgroundSecondary
- **Элемент секции**: высота 36 px, радиус radiusMedium
- **Правая панель**: заполняет, отступы 16

### 9.2 Диалог удаления ветки
- **Ширина**: max(280, contentWidth + 40)
- **Отступы**: 20
- **Фон**: backgroundSecondary, граница divider, радиус 6

### 9.3 Всплывающее окно создания ветки
- **Фон**: backgroundSecondary, граница divider, радиус 6

### 9.4 Меню (выпадающее)
- **Отступы**: 4
- **Фон**: backgroundSecondary, граница divider, радиус radiusMedium
- **Ширина**: max(200, content)

---

## 10. Иконки

- **Пути**: `theme.getIconPath(iconName)` → `../resources/icons/{DarkTheme|LightTheme}/{iconName}`
- **Иконки дерева файлов**: 24×24 px
- **Формат**: SVG

---

## 11. Сводка отступов

| Контекст | Значение |
|----------|----------|
| Отступы панелей | 12 px |
| Вертикальный отступ заголовка | 12 px |
| Расстояние в заголовке | 12 px |
| Высота сегментного переключателя | 32 px |
| Высота поля поиска | 36 px |
| Расстояние в форме | 8 px |
| Расстояние между полями формы | 4 px |
| Расстояние между строками дерева | 6 px |
| Высота строки дерева | 28 px |
| Расстояние между кнопками | 8 px |
| Отступы меню | 4 px |
| Отступы диалога | 20 px |

---

## 12. Ссылка на структуру файлов

```
sources/difference_machine/
├── MainWindow.qml          # Корневая компоновка
├── panels/
│   ├── StructProjectPanel.qml   # Слева: файлы + коммит
│   ├── FileTreeView.qml         # Дерево с чекбоксами
│   ├── BranchSelectorPanel.qml
│   ├── CommitsListPanel.qml
│   ├── CommitInfoPanel.qml
│   ├── ChangesPanel.qml
│   ├── DiffPanel.qml
│   ├── ViewPanel.qml
│   ├── HeaderPanel.qml         # Базовый заголовок
│   ├── FileListItem.qml
│   ├── SettingsDialog.qml
│   ├── MergeBranchDialog.qml
│   └── ...
├── resources/styles/
│   ├── Theme.qml         # Переключатель темы
│   ├── LightTheme.qml
│   └── DarkTheme.qml
└── file_viewer/
    ├── text_viewer.qml
    ├── image_viewer.qml
    └── ...
```
