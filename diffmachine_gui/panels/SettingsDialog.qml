import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import QtQuick.Dialogs 6.6
import resources.styles 1.0
import "."

/**
 * Settings dialog: left panel = sections, right panel = settings for selected section.
 * Changes are saved to ~/.dfm/setup.cfg automatically when fields change.
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
                            { key: "gc", label: qsTr("Сборщик мусора") }
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
                            MacTextField {
                                theme: settingsDialog.theme
                                Layout.fillWidth: true
                                text: configManager ? configManager.userName : ""
                                onTextChanged: {
                                    if (configManager) {
                                        configManager.userName = text
                                        configManager.saveConfig()
                                    }
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
                            MacTextField {
                                theme: settingsDialog.theme
                                Layout.fillWidth: true
                                text: configManager ? configManager.userEmail : ""
                                onTextChanged: {
                                    if (configManager) {
                                        configManager.userEmail = text
                                        configManager.saveConfig()
                                    }
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
                                MacTextField {
                                    theme: settingsDialog.theme
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.foresterPath : ""
                                    onTextChanged: {
                                        if (configManager) {
                                            configManager.foresterPath = text
                                            configManager.saveConfig()
                                        }
                                    }
                                }
                                MacButton {
                                    theme: settingsDialog.theme
                                    text: qsTr("Обзор...")
                                    buttonStyle: "secondary"
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
                                MacTextField {
                                    theme: settingsDialog.theme
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.blenderPath : ""
                                    onTextChanged: {
                                        if (configManager) {
                                            configManager.blenderPath = text
                                            configManager.saveConfig()
                                        }
                                    }
                                }
                                MacButton {
                                    theme: settingsDialog.theme
                                    text: qsTr("Обзор...")
                                    buttonStyle: "secondary"
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
                                MacTextField {
                                    theme: settingsDialog.theme
                                    Layout.fillWidth: true
                                    text: configManager ? configManager.addonPath : ""
                                    onTextChanged: {
                                        if (configManager) {
                                            configManager.addonPath = text
                                            configManager.saveConfig()
                                        }
                                    }
                                }
                                MacButton {
                                    theme: settingsDialog.theme
                                    text: qsTr("Обзор...")
                                    buttonStyle: "secondary"
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
                                    if (configManager) {
                                        configManager.gcIntervalDays = value
                                        configManager.saveConfig()
                                    }
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
                                    if (configManager) {
                                        configManager.gcReflogExpireDays = value
                                        configManager.saveConfig()
                                    }
                                }
                                Layout.preferredWidth: 120
                            }
                        }
                    }
                }
            }
        }

        // Footer: Сброс left, Закрыть right (unified GUI style)
        RowLayout {
            Layout.fillWidth: true
            Layout.topMargin: 12
            Layout.bottomMargin: 4
            spacing: 8
            Item { Layout.fillWidth: true }
            MacButton {
                theme: settingsDialog.theme
                text: qsTr("Сброс")
                buttonStyle: "secondary"
                onClicked: {
                    if (configManager) configManager.resetConfig()
                }
            }
            MacButton {
                theme: settingsDialog.theme
                text: qsTr("Закрыть")
                buttonStyle: "secondary"
                onClicked: settingsDialog.close()
            }
        }
    }

    onRejected: close()
}
