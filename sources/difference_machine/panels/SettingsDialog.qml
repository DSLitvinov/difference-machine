import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import QtQuick.Dialogs 6.6
import resources.styles 1.0
import "."

/**
 * Settings dialog: left panel = sections, right panel = settings for selected section.
 * Changes are applied only when user clicks Apply (no auto-save).
 */
Dialog {
    id: settingsDialog
    modal: true
    title: qsTr("Настройки")
    width: 720
    height: 480

    property var theme: Theme {}
    property var configManager: null
    property var translationManager: null
    property var repositoryManager: null
    property int currentSectionIndex: 0
    property var availableLanguages: []

    onAboutToShow: {
        if (configManager) configManager.loadConfig()
        if (translationManager) availableLanguages = translationManager.getAvailableLanguages()
    }
    onOpened: {
        if (parent && parent.width !== undefined && parent.height !== undefined) {
            x = Math.round((parent.width - width) / 2)
            y = Math.round((parent.height - height) / 2)
        }
    }

    background: Rectangle {
        color: theme.background
        border.color: theme.divider
        border.width: 1
        radius: theme.radiusLarge
    }

    header: RowLayout {
        implicitHeight: 56
        spacing: 12
        Text {
            text: settingsDialog.title
            font.pixelSize: theme.fontPixelSizeTitle
            font.bold: true
            color: theme.textPrimary
            Layout.fillWidth: true
            Layout.leftMargin: 12
            Layout.topMargin: 12
            Layout.bottomMargin: 12
        }
        Rectangle {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            Layout.rightMargin: 12
            Layout.topMargin: 12
            Layout.bottomMargin: 12
            radius: 12
            color: closeBtnMouseArea.containsMouse ? theme.backgroundHover : "transparent"
            Text {
                anchors.centerIn: parent
                text: "×"
                font.pixelSize: 18
                font.family: "Arial"
                color: theme.textSecondary
            }
            MouseArea {
                id: closeBtnMouseArea
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: settingsDialog.close()
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 0

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            // Left panel: sections list
            Rectangle {
                Layout.preferredWidth: 200
                Layout.fillHeight: true
                color: theme.backgroundSecondary

                Rectangle {
                    width: 1
                    anchors.top: parent.top
                    anchors.bottom: parent.bottom
                    anchors.right: parent.right
                    color: theme.divider
                }

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 4

                    Text {
                        text: qsTr("Поиск...")
                        visible: false
                    }

                    Repeater {
                        model: [
                            { key: "language", label: qsTr("Язык") },
                            { key: "user", label: qsTr("Пользователь") },
                            { key: "forester", label: "Forester" },
                            { key: "editors", label: qsTr("Редакторы") },
                            { key: "addons", label: qsTr("Аддоны") },
                            { key: "gc", label: qsTr("Сборщик мусора") },
                            { key: "repositories", label: qsTr("Репозитории") }
                        ]
                        delegate: Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 36
                            radius: theme.radiusMedium
                            color: settingsDialog.currentSectionIndex === index ? theme.backgroundSelected : "transparent"
                            border.width: 0

                            Text {
                                anchors.left: parent.left
                                anchors.leftMargin: 12
                                anchors.verticalCenter: parent.verticalCenter
                                text: model.modelData.label
                                color: settingsDialog.currentSectionIndex === index ? theme.textSelected : theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeBody
                            }

                            MouseArea {
                                anchors.fill: parent
                                onClicked: settingsDialog.currentSectionIndex = index
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }
            }

            Item {
                Layout.preferredWidth: 1
                Layout.fillHeight: true
            }

            // Right panel: settings content
            StackLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.leftMargin: 16
                Layout.rightMargin: 16
                Layout.topMargin: 8
                Layout.bottomMargin: 8
                currentIndex: settingsDialog.currentSectionIndex

                // Section: Language
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle {
                        implicitWidth: 8
                        radius: 4
                        color: theme.scrollBarNormal
                    }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Язык")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4
                            Repeater {
                                model: settingsDialog.availableLanguages
                                delegate: Rectangle {
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 36
                                    radius: theme.radiusMedium
                                    color: (translationManager && translationManager.currentLanguage === modelData.code) ? theme.backgroundSelected : (langMouseArea.containsMouse ? theme.backgroundHover : "transparent")

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.leftMargin: 12
                                        anchors.rightMargin: 12
                                        spacing: 8
                                        Text {
                                            text: modelData.name
                                            font.pixelSize: theme.fontPixelSizeBody
                                            color: theme.textPrimary
                                        }
                                        Item { Layout.fillWidth: true }
                                        Text {
                                            text: (translationManager && translationManager.currentLanguage === modelData.code) ? "✓" : ""
                                            font.pixelSize: theme.fontPixelSizeBody
                                            color: theme.textPrimary
                                            visible: translationManager && translationManager.currentLanguage === modelData.code
                                        }
                                    }
                                    MouseArea {
                                        id: langMouseArea
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        onClicked: {
                                            if (translationManager) translationManager.setLanguage(modelData.code)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section: User
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Пользователь")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Имя")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            TextField {
                                Layout.fillWidth: true
                                text: configManager ? configManager.userName : ""
                                onTextChanged: {
                                    if (configManager) configManager.userName = text
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Почта")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            TextField {
                                Layout.fillWidth: true
                                text: configManager ? configManager.userEmail : ""
                                onTextChanged: {
                                    if (configManager) configManager.userEmail = text
                                }
                            }
                        }
                    }
                }

                // Section: Forester
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: "Forester"
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Путь к исполняемому файлу Forester")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                TextField {
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.foresterPath : ""
                                    onTextChanged: {
                                        if (configManager) configManager.foresterPath = text
                                    }
                                }
                                Button {
                                    text: qsTr("Обзор...")
                                    flat: true
                                    onClicked: {
                                        if (configManager) {
                                            var p = configManager.openFileDialogForForester()
                                            if (p) {}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section: Editors (Blender)
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Редакторы")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Путь к Blender")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                TextField {
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.blenderPath : ""
                                    onTextChanged: {
                                        if (configManager) configManager.blenderPath = text
                                    }
                                }
                                Button {
                                    text: qsTr("Обзор...")
                                    flat: true
                                    onClicked: {
                                        if (configManager) {
                                            configManager.openFileDialogForBlender()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section: Addons
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Аддоны")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Путь к аддону Diffmachine")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                TextField {
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.addonPath : ""
                                    onTextChanged: {
                                        if (configManager) configManager.addonPath = text
                                    }
                                }
                                Button {
                                    text: qsTr("Обзор...")
                                    flat: true
                                    onClicked: {
                                        if (configManager) {
                                            configManager.openDirDialogForAddon()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section: GC
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Сборщик мусора")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Интервал GC (дней)")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            SpinBox {
                                from: 1
                                to: 365
                                value: configManager ? configManager.gcIntervalDays : 90
                                onValueModified: {
                                    if (configManager) configManager.gcIntervalDays = value
                                }
                                Layout.preferredWidth: 120
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 8
                            Text {
                                text: qsTr("Срок хранения reflog (дней)")
                                font.pixelSize: theme.fontPixelSizeSmall
                                color: theme.textTertiary
                            }
                            SpinBox {
                                from: 1
                                to: 365
                                value: configManager ? configManager.gcReflogExpireDays : 90
                                onValueModified: {
                                    if (configManager) configManager.gcReflogExpireDays = value
                                }
                                Layout.preferredWidth: 120
                            }
                        }
                    }
                }

                // Section: Repositories (list + delete, writes repo_list.cfg)
                ScrollView {
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.vertical.implicitWidth: 8
                    ScrollBar.vertical.background: Rectangle { color: theme.scrollBarBackground; radius: 4 }
                    ScrollBar.vertical.contentItem: Rectangle { implicitWidth: 8; radius: 4; color: theme.scrollBarNormal }
                    contentWidth: availableWidth - 20
                    clip: true

                    ColumnLayout {
                        width: parent.width
                        spacing: 16

                        Text {
                            text: qsTr("Репозитории")
                            font.pixelSize: theme.fontPixelSizeTitle
                            font.bold: true
                            color: theme.textPrimary
                        }

                        Text {
                            text: qsTr("Список сохранённых репозиториев (~/.dfm/repo_list.cfg). Удаление убирает запись из файла.")
                            font.pixelSize: theme.fontPixelSizeSmall
                            color: theme.textTertiary
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6
                            Repeater {
                                model: repositoryManager ? repositoryManager.recentRepositories : []
                                delegate: Rectangle {
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 40
                                    radius: theme.radiusMedium
                                    color: repoRowMouseArea.containsMouse ? theme.backgroundHover : theme.backgroundSecondary

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.leftMargin: 12
                                        anchors.rightMargin: 8
                                        spacing: 8
                                        Text {
                                            text: modelData ? String(modelData).replace(/^.*[/\\]/, "") : ""
                                            font.pixelSize: theme.fontPixelSizeBody
                                            color: theme.textPrimary
                                            elide: Text.ElideMiddle
                                            Layout.fillWidth: true
                                        }
                                        Button {
                                            text: qsTr("Удалить")
                                            flat: true
                                            implicitHeight: 28
                                            onClicked: {
                                                if (repositoryManager && modelData)
                                                    repositoryManager.removeRecentRepository(modelData)
                                            }
                                        }
                                    }
                                    MouseArea {
                                        id: repoRowMouseArea
                                        anchors.fill: parent
                                        hoverEnabled: true
                                    }
                                }
                            }

                            Text {
                                text: qsTr("Нет сохранённых репозиториев")
                                font.pixelSize: theme.fontPixelSizeBody
                                color: theme.textTertiary
                                visible: !repositoryManager || !repositoryManager.recentRepositories || repositoryManager.recentRepositories.length === 0
                            }
                        }
                    }
                }
            }
        }

        // Footer: Сброс left, Apply right (unified GUI style)
        RowLayout {
            Layout.fillWidth: true
            Layout.topMargin: 12
            Layout.bottomMargin: 4
            spacing: 8
            Item { Layout.fillWidth: true }
            Button {
                text: qsTr("Сброс")
                flat: true
                onClicked: {
                    if (configManager) configManager.resetConfig()
                }
            }
            Button {
                text: qsTr("Применить")
                onClicked: {
                    if (configManager) configManager.saveConfig()
                }
            }
        }
    }

    onRejected: close()
}
