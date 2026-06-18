import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import FileManager 1.0
import RepositoryManager 1.0
import "panels"
import resources.styles 1.0
import components 1.0

ApplicationWindow {
    id: window
    width: 1200
    height: 800
    visible: true
    title: "Difference Machine"
    
    // Theme instance
    property var theme: Theme {}

    font.family: theme.fontFamilyUI

    function updateMenuWidth(menu) {
        if (!menu) return
        var maxWidth = 0
        for (var i = 0; i < menu.count; i++) {
            var item = menu.itemAt(i)
            if (!item) continue
            var w = item.implicitWidth || 0
            if (item.contentItem && item.contentItem.implicitWidth) {
                w = Math.max(w, item.contentItem.implicitWidth + (item.leftPadding || 0) + (item.rightPadding || 0))
            }
            if (w > maxWidth) maxWidth = w
        }
        if (maxWidth > 0) {
            menu.width = Math.max(maxWidth, 200)
        }
    }

    Component {
        id: comboMenuItemDelegate
        MenuItem {
            id: menuItem
            implicitHeight: window.theme.contextMenuItemHeight
            leftPadding: window.theme.contextMenuTextLeftMargin
            rightPadding: window.theme.contextMenuTextLeftMargin
            topPadding: window.theme.comboItemPaddingV
            bottomPadding: window.theme.comboItemPaddingV
            implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
            contentItem: Text {
                text: menuItem.text
                color: menuItem.enabled ? window.theme.textPrimary : window.theme.textDisabled
                font.family: window.theme.fontFamilyUI
                font.pixelSize: window.theme.contextMenuFontSize
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
            background: Rectangle {
                radius: window.theme.radiusSmall
                color: menuItem.highlighted ? window.theme.contextMenuHoverBg : "transparent"
            }
        }
    }

    Component {
        id: comboMenuSeparator
        MenuSeparator {
            padding: window.theme.contextMenuSeparatorHeight / 2
            contentItem: Rectangle {
                implicitWidth: parent ? parent.width : 0
                implicitHeight: 1
                color: window.theme.contextMenuSeparatorColor
                opacity: window.theme.contextMenuSeparatorOpacity
            }
        }
    }
    
    // Main background color from theme
    color: theme.contentBackground
    
    menuBar: MenuBar {
        id: menuBar
        palette.window: window.theme.menuBarBackground
        palette.windowText: window.theme.textPrimary
        palette.button: window.theme.menuBarBackground
        palette.buttonText: window.theme.textPrimary
        palette.highlight: window.theme.contextMenuHoverBg
        palette.highlightedText: window.theme.textPrimary
        palette.base: window.theme.contextMenuBackground
        palette.text: window.theme.textPrimary
        palette.mid: window.theme.divider
        background: Rectangle {
            color: window.theme.menuBarBackground
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: window.theme.divider
            }
        }
        delegate: MenuBarItem {
            id: menuBarItem
            leftPadding: window.theme.contextMenuTextLeftMargin
            rightPadding: window.theme.contextMenuTextLeftMargin
            topPadding: 4
            bottomPadding: 4
            implicitHeight: window.theme.controlHeightSmall
            implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
            contentItem: Text {
                text: menuBarItem.text
                color: menuBarItem.enabled
                       ? (menuBarItem.highlighted || menuBarItem.opened ? window.theme.textPrimary : window.theme.textSecondary)
                       : window.theme.textDisabled
                font.family: window.theme.fontFamilyUI
                font.pixelSize: window.theme.fontPixelSizeBody
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
            background: Rectangle {
                radius: window.theme.radiusSmall
                color: (menuBarItem.highlighted || menuBarItem.opened)
                       ? window.theme.backgroundHover
                       : "transparent"
            }
        }
        
        Menu {
            title: qsTr("Файл")
            delegate: comboMenuItemDelegate
            padding: window.theme.contextMenuPadding
            palette.window: window.theme.contextMenuBackground
            palette.windowText: window.theme.textPrimary
            palette.highlight: window.theme.contextMenuHoverBg
            palette.highlightedText: window.theme.textPrimary
            palette.text: window.theme.textPrimary
            palette.button: window.theme.contextMenuBackground
            palette.buttonText: window.theme.textPrimary
            palette.base: window.theme.contextMenuBackground
            palette.mid: window.theme.divider
            background: Rectangle {
                color: window.theme.contextMenuBackground
                border.color: window.theme.contextMenuBorderColor
                border.width: 1
                radius: window.theme.contextMenuRadius
            }
            onAboutToShow: updateMenuWidth(this)

            MenuItem {
                text: qsTr("Настройки")
                onTriggered: {
                    settingsDialog.theme = window.theme
                    if (typeof configManager !== "undefined")
                        settingsDialog.configManager = configManager
                    if (typeof translationManager !== "undefined")
                        settingsDialog.translationManager = translationManager
                    if (typeof repositoryManager !== "undefined")
                        settingsDialog.repositoryManager = repositoryManager
                    settingsDialog.open()
                }
            }
            
            MenuSeparator {}
            
            MenuItem {
                text: qsTr("Выход")
                onTriggered: Qt.quit()
            }
        }

        Menu {
            title: qsTr("Репозиторий")
            delegate: comboMenuItemDelegate
            padding: window.theme.contextMenuPadding
            palette.window: window.theme.contextMenuBackground
            palette.windowText: window.theme.textPrimary
            palette.highlight: window.theme.contextMenuHoverBg
            palette.highlightedText: window.theme.textPrimary
            palette.text: window.theme.textPrimary
            palette.button: window.theme.contextMenuBackground
            palette.buttonText: window.theme.textPrimary
            palette.base: window.theme.contextMenuBackground
            palette.mid: window.theme.divider
            background: Rectangle {
                color: window.theme.contextMenuBackground
                border.color: window.theme.contextMenuBorderColor
                border.width: 1
                radius: window.theme.contextMenuRadius
            }
            onAboutToShow: updateMenuWidth(this)
            MenuItem {
                text: qsTr("Открыть")
                onTriggered: fileManager.openDirectoryDialog()
            }
            MenuItem {
                text: qsTr("Show in Explorer")
                enabled: repositoryManager && repositoryManager.currentRepository
                onTriggered: {
                    if (repositoryManager && repositoryManager.revealInFolder) {
                        repositoryManager.revealInFolder(repositoryManager.currentRepository)
                    }
                }
            }
            MenuSeparator {}
            MenuItem {
                text: qsTr("Инициализировать")
                onTriggered: {
                    initRepoError = ""
                    initRepoDialog.open()
                }
            }
            MenuSeparator {}
            MenuItem {
                text: qsTr("Удалить старые stash состояния")
                onTriggered: {
                    if (repositoryManager) {
                        repositoryManager.clearStashStates()
                    }
                }
            }
        }

        Menu {
            title: qsTr("Ветка")
            delegate: comboMenuItemDelegate
            padding: window.theme.contextMenuPadding
            palette.window: window.theme.contextMenuBackground
            palette.windowText: window.theme.textPrimary
            palette.highlight: window.theme.contextMenuHoverBg
            palette.highlightedText: window.theme.textPrimary
            palette.text: window.theme.textPrimary
            palette.button: window.theme.contextMenuBackground
            palette.buttonText: window.theme.textPrimary
            palette.base: window.theme.contextMenuBackground
            palette.mid: window.theme.divider
            background: Rectangle {
                color: window.theme.contextMenuBackground
                border.color: window.theme.contextMenuBorderColor
                border.width: 1
                radius: window.theme.contextMenuRadius
            }
            onAboutToShow: updateMenuWidth(this)
            MenuItem {
                text: qsTr("Слияние веток")
                onTriggered: {
                    mergeBranchDialog.repositoryManager = repositoryManager
                    mergeBranchDialog.open()
                }
            }
            MenuSeparator {}
            MenuItem {
                text: qsTr("Удалить текущую ветку")
                onTriggered: {
                    deleteBranchError = ""
                    deleteBranchDialog.open()
                }
            }
        }
        
        Menu {
            title: qsTr("Помощь")
            delegate: comboMenuItemDelegate
            padding: window.theme.contextMenuPadding
            palette.window: window.theme.contextMenuBackground
            palette.windowText: window.theme.textPrimary
            palette.highlight: window.theme.contextMenuHoverBg
            palette.highlightedText: window.theme.textPrimary
            palette.text: window.theme.textPrimary
            palette.button: window.theme.contextMenuBackground
            palette.buttonText: window.theme.textPrimary
            palette.base: window.theme.contextMenuBackground
            palette.mid: window.theme.divider
            background: Rectangle {
                color: window.theme.contextMenuBackground
                border.color: window.theme.contextMenuBorderColor
                border.width: 1
                radius: window.theme.contextMenuRadius
            }
            onAboutToShow: updateMenuWidth(this)
            MenuItem {
                text: qsTr("О программе")
                onTriggered: aboutDialog.open()
            }
        }
    }
    
    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // 2 панели: слева — выбор репозитория + всё содержимое; справа — просмотр или коммиты+diff
        SplitView {
            id: mainSplitView
            Layout.fillWidth: true
            Layout.fillHeight: true
            orientation: Qt.Horizontal
            handle: DmSplitHandle {
                theme: window.theme
                isVerticalBar: true
            }
            // Левая панель: выбор репозитория (всегда сверху) + ветка (при Изменены) + StructProjectPanel
            ColumnLayout {
                SplitView.preferredWidth: 320
                SplitView.minimumWidth: 220
                spacing: 0
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 56
                    color: theme.sidebarBackground
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: theme.panelOuterMargin
                        anchors.rightMargin: theme.panelOuterMargin
                        anchors.topMargin: theme.panelOuterMargin
                        anchors.bottomMargin: theme.panelOuterMargin
                        spacing: 6
                        DmComboBox {
                            id: repoCombo
                            theme: window.theme
                            Layout.fillWidth: true
                            Layout.preferredHeight: 32
                            editable: false
                            property var recentList: repositoryManager && repositoryManager.recentRepositories ? repositoryManager.recentRepositories : []
                            model: recentList.length > 0 ? [""].concat(recentList) : [""]
                            currentIndex: {
                                if (!repositoryManager) return 0
                                var cur = repositoryManager.currentRepository
                                if (!cur || cur.length === 0) return 0
                                var list = recentList
                                for (var i = 0; i < list.length; i++)
                                    if (list[i] === cur) return i + 1
                                return 0
                            }
                            onActivated: function(index) {
                                if (!repositoryManager) return
                                if (index <= 0) {
                                    repositoryManager.setRepository("")
                                    return
                                }
                                var list = recentList
                                if (index - 1 >= 0 && index - 1 < list.length)
                                    repositoryManager.setRepository(list[index - 1])
                            }
                            delegate: ItemDelegate {
                                width: repoCombo.width
                                height: window.theme.comboItemHeight
                                text: modelData ? String(modelData).replace(/^.*[/\\]/, "") : qsTr("No repository")
                                contentItem: Text {
                                    text: parent.text
                                    elide: Text.ElideMiddle
                                    color: window.theme.textPrimary
                                    font.family: window.theme.fontFamilyUI
                                    font.pixelSize: window.theme.fontPixelSizeBody
                                    verticalAlignment: Text.AlignVCenter
                                    leftPadding: window.theme.comboItemPaddingH
                                    rightPadding: window.theme.comboItemPaddingH
                                    topPadding: window.theme.comboItemPaddingV
                                    bottomPadding: window.theme.comboItemPaddingV
                                }
                                background: Rectangle {
                                    radius: window.theme.radiusSmall
                                    color: parent.highlighted ? window.theme.backgroundSelected : (parent.hovered ? window.theme.backgroundHover : "transparent")
                                }
                            }
                            displayText: {
                                if (repoCombo.currentIndex <= 0 || !repoCombo.model || repoCombo.model.length === 0)
                                    return qsTr("No repository")
                                var path = repoCombo.model[repoCombo.currentIndex]
                                return path && path.length > 0 ? String(path).replace(/^.*[/\\]/, "") : qsTr("No repository")
                            }
                        }
                        DmButton {
                            theme: window.theme
                            buttonStyle: "icon"
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            text: "+"
                            font.pixelSize: 18
                            onClicked: {
                                if (typeof fileManager !== "undefined" && fileManager.openDirectoryDialog)
                                    fileManager.openDirectoryDialog()
                            }
                        }
                    }
                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 1
                        color: theme.divider
                    }
                }
                StructProjectPanel {
                    id: structProjectPanel
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    fileManager: null
                    repositoryManager: null
                }
            }
            StackLayout {
                SplitView.fillWidth: true
                currentIndex: structProjectPanel.currentTabIndex
                ViewPanel {
                    id: viewPanel
                    fileViewer: null
                    repositoryManager: null
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 0
                    BranchSelectorPanel {
                        id: branchSelectorPanel
                        Layout.fillWidth: true
                        theme: window.theme
                        repositoryManager: null
                    }
                    SplitView {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        orientation: Qt.Horizontal
                        handle: DmSplitHandle {
                            theme: window.theme
                            isVerticalBar: true
                        }
                        CommitsListPanel {
                            id: commitsListPanel
                            SplitView.preferredWidth: 280
                            SplitView.minimumWidth: 180
                            theme: window.theme
                            repositoryManager: null
                            branchSelectorPanel: branchSelectorPanel
                        }
                        ColumnLayout {
                            SplitView.fillWidth: true
                            spacing: 0
                            CommitInfoPanel {
                                id: commitInfoPanel
                                Layout.fillWidth: true
                                theme: window.theme
                                repositoryManager: null
                                selectedCommitHash: commitsListPanel.selectedCommitHash
                            }
                            SplitView {
                                Layout.fillWidth: true
                                Layout.fillHeight: true
                                orientation: Qt.Horizontal
                                handle: DmSplitHandle {
                                    theme: window.theme
                                    isVerticalBar: true
                                }
                                ChangesPanel {
                                    id: commitFilesPanel
                                    SplitView.preferredWidth: 280
                                    SplitView.minimumWidth: 120
                                    theme: window.theme
                                    repositoryManager: null
                                    selectedCommitHash: commitsListPanel.selectedCommitHash
                                }
                                DiffPanel {
                                    id: diffPanel
                                    SplitView.fillWidth: true
                                    repositoryManager: null
                                    commitHash: commitFilesPanel.selectedCommitHash
                                    filePath: commitFilesPanel.selectedFilePath
                                    theme: window.theme
                                }
                            }
                        }
                    }
                }
            }
        }

        Component.onCompleted: {
            if (typeof fileManager !== 'undefined') {
                structProjectPanel.fileManager = fileManager
            }
            if (typeof repositoryManager !== 'undefined') {
                commitFilesPanel.repositoryManager = repositoryManager
                commitInfoPanel.repositoryManager = repositoryManager
                structProjectPanel.repositoryManager = repositoryManager
                viewPanel.repositoryManager = repositoryManager
                diffPanel.repositoryManager = repositoryManager
                commitsListPanel.repositoryManager = repositoryManager
            }
            if (typeof fileViewer !== 'undefined') {
                viewPanel.fileViewer = fileViewer
            }
            if (typeof fileManager !== 'undefined' && typeof repositoryManager !== 'undefined') {
                fileManager.directorySelected.connect(function(directory) {
                    repositoryManager.setRepository(directory)
                    repositoryManager.refreshStatus()
                })
            }

            // Connect file selection from structProjectPanel to fileViewer
            structProjectPanel.fileSelected.connect(function(filePath) {
                if (structProjectPanel.currentTabIndex === 0 || structProjectPanel.currentTabIndex === 1) {
                    if (fileViewer) {
                        if (window.theme) {
                            fileViewer.setSyntaxStyle(window.theme.syntaxHighlightStyle)
                        }
                        fileViewer.loadFile(filePath)
                    }
                }
            })

            // After commit created in left panel, refresh commits list in center
            structProjectPanel.commitCreated.connect(function() {
                if (commitsListPanel && typeof commitsListPanel.refreshCommits === "function")
                    commitsListPanel.refreshCommits()
            })
            // Reset file viewer when switching between Explorer and Changed tabs
            var lastTabIndex = structProjectPanel.currentTabIndex
            structProjectPanel.tabChanged.connect(function(newIndex) {
                var wasFileTab = (lastTabIndex === 0 || lastTabIndex === 1)
                var isFileTab = (newIndex === 0 || newIndex === 1)
                if (wasFileTab && isFileTab && newIndex !== lastTabIndex) {
                    if (viewPanel && viewPanel.resetViewer) {
                        viewPanel.resetViewer()
                    }
                }
                lastTabIndex = newIndex
            })

            // Set initial syntax style
            if (window.theme && fileViewer) {
                fileViewer.setSyntaxStyle(window.theme.syntaxHighlightStyle)
            }
            
            // Connect repository manager to branch selector panel
            if (typeof repositoryManager !== 'undefined') {
                branchSelectorPanel.repositoryManager = repositoryManager
            }
            if (typeof branchSelectorPanel !== 'undefined') {
                structProjectPanel.branchSelectorPanel = branchSelectorPanel
            }
            if (typeof window !== 'undefined' && window.contentItem) {
                structProjectPanel.overlayItem = window.contentItem
                commitsListPanel.overlayItem = window.contentItem
            }
        }
    }

    property string deleteBranchError: ""
    property string initRepoError: ""

    Popup {
        id: deleteBranchDialog
        parent: Overlay.overlay
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        anchors.centerIn: parent
        width: Math.max(280, contentCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("Удалить ветку")
                font.bold: true
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: contentCol
                spacing: 12
                Layout.fillWidth: true
                Text {
                    text: qsTr("Вы уверены, что хотите удалить текущую ветку?")
                    wrapMode: Text.WordWrap
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "ghost"
                        text: qsTr("Отмена")
                        onClicked: deleteBranchDialog.close()
                    }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "primary"
                        text: qsTr("Удалить")
                        onClicked: {
                            if (!repositoryManager) {
                                deleteBranchError = qsTr("Репозиторий недоступен")
                                deleteBranchDialog.close()
                                deleteBranchErrorDialog.open()
                                return
                            }
                            var ok = repositoryManager.deleteCurrentBranch()
                            deleteBranchDialog.close()
                            if (!ok) {
                                deleteBranchError = repositoryManager.lastError || qsTr("Не удалось удалить ветку")
                                deleteBranchErrorDialog.open()
                            }
                        }
                    }
                }
            }
        }
    }

    Popup {
        id: deleteBranchErrorDialog
        parent: Overlay.overlay
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        anchors.centerIn: parent
        width: Math.max(280, errCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("Ошибка")
                font.bold: true
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: errCol
                Layout.fillWidth: true
                Text {
                    text: deleteBranchError
                    wrapMode: Text.WordWrap
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "primary"
                        text: qsTr("ОК")
                        onClicked: deleteBranchErrorDialog.close()
                    }
                }
            }
        }
    }

    Popup {
        id: initRepoDialog
        parent: Overlay.overlay
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        anchors.centerIn: parent
        width: Math.max(280, initCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("Инициализация репозитория")
                font.bold: true
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: initCol
                spacing: 12
                Layout.fillWidth: true
                Text {
                    text: qsTr("Инициализировать репозиторий в текущем каталоге?")
                    wrapMode: Text.WordWrap
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "ghost"
                        text: qsTr("Отмена")
                        onClicked: initRepoDialog.close()
                    }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "primary"
                        text: qsTr("ОК")
                        onClicked: {
                            if (!repositoryManager) {
                                initRepoError = qsTr("Репозиторий недоступен")
                                initRepoDialog.close()
                                initRepoErrorDialog.open()
                                return
                            }
                            var targetDir = fileManager ? fileManager.currentDirectory : ""
                            if (!targetDir) {
                                initRepoError = qsTr("Каталог не выбран")
                                initRepoDialog.close()
                                initRepoErrorDialog.open()
                                return
                            }
                            repositoryManager.initRepository(targetDir)
                            initRepoDialog.close()
                            if (repositoryManager.lastError && repositoryManager.lastError.length > 0) {
                                initRepoError = repositoryManager.lastError
                                initRepoErrorDialog.open()
                            }
                        }
                    }
                }
            }
        }
    }

    Popup {
        id: initRepoErrorDialog
        parent: Overlay.overlay
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        anchors.centerIn: parent
        width: Math.max(280, initErrCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("Ошибка")
                font.bold: true
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: initErrCol
                Layout.fillWidth: true
                Text {
                    text: initRepoError
                    wrapMode: Text.WordWrap
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "primary"
                        text: qsTr("ОК")
                        onClicked: initRepoErrorDialog.close()
                    }
                }
            }
        }
    }

    Popup {
        id: aboutDialog
        parent: Overlay.overlay
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        anchors.centerIn: parent
        width: Math.max(280, aboutCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("О программе")
                font.bold: true
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: aboutCol
                spacing: 12
                Layout.fillWidth: true
                Text {
                    text: qsTr("Difference Machine")
                    wrapMode: Text.WordWrap
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    Layout.fillWidth: true
                }
                Text {
                    text: qsTr("Версия") + " " + (typeof appVersion !== "undefined" ? appVersion : "—")
                    wrapMode: Text.WordWrap
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeSmall
                    horizontalAlignment: Text.AlignHCenter
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: window.theme
                        buttonStyle: "primary"
                        text: qsTr("ОК")
                        onClicked: aboutDialog.close()
                    }
                }
            }
        }
    }

    MergeBranchDialog {
        id: mergeBranchDialog
        theme: window.theme
    }

    SettingsDialog {
        id: settingsDialog
        theme: window.theme
    }
}

