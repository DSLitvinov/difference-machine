import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import FileManager 1.0
import RepositoryManager 1.0
import "panels"
import resources.styles 1.0

ApplicationWindow {
    id: window
    width: 1200
    height: 800
    visible: true
    title: "Difference Machine"
    
    // Theme instance
    property var theme: Theme {}

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
            implicitHeight: 28
            leftPadding: 10
            rightPadding: 10
            implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
            contentItem: Text {
                text: menuItem.text
                color: menuItem.highlighted ? theme.textSelected : theme.textPrimary
                font.pixelSize: theme.fontPixelSizeSmall
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
                leftPadding: 8
                rightPadding: 8
            }
            background: Rectangle {
                color: menuItem.highlighted ? theme.backgroundSelected : "transparent"
            }
        }
    }

    Component {
        id: comboMenuSeparator
        MenuSeparator {
            contentItem: Rectangle {
                height: 1
                color: theme.divider
                opacity: 0.6
            }
        }
    }
    
    // Main background color from theme
    color: theme.background
    
    menuBar: MenuBar {
        id: menuBar
        background: Rectangle {
            color: theme.menuBarBackground
        }
        delegate: MenuBarItem {
            id: menuBarItem
            leftPadding: 10
            rightPadding: 10
            implicitHeight: 24
            implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
            contentItem: Text {
                text: menuBarItem.text
                color: menuBarItem.highlighted ? theme.textSelected : theme.textPrimary
                font.pixelSize: theme.fontPixelSizeSmall
                verticalAlignment: Text.AlignVCenter
                elide: Text.ElideRight
            }
            background: Rectangle {
                color: menuBarItem.highlighted ? theme.backgroundSelected : "transparent"
            }
        }
        
        Menu {
            title: qsTr("Файл")
            delegate: comboMenuItemDelegate
            padding: 4
            background: Rectangle {
                color: theme.backgroundSecondary
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
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
            padding: 4
            background: Rectangle {
                color: theme.backgroundSecondary
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
            }
            onAboutToShow: updateMenuWidth(this)
            MenuItem {
                text: qsTr("Открыть")
                onTriggered: fileManager.openDirectoryDialog()
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
            padding: 4
            background: Rectangle {
                color: theme.backgroundSecondary
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
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
            padding: 4
            background: Rectangle {
                color: theme.backgroundSecondary
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
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
        
        BranchSelectorPanel {
            id: branchSelectorPanel
            Layout.fillWidth: true
            repositoryManager: null
        }
        
        SplitView {
            id: splitView
            Layout.fillWidth: true
            Layout.fillHeight: true
            orientation: Qt.Horizontal

            handle: Rectangle {
                implicitWidth: 1
                implicitHeight: 1
                color: theme.divider
                opacity: SplitHandle.hovered || SplitHandle.pressed ? 0.9 : 0.6
            }
        
        // Structure/Project panel (left)
        StructProjectPanel {
            id: structProjectPanel
            fileManager: null
            repositoryManager: null
        }
        
        // Commit files panel (middle) - visible when Commits tab is active
        ChangesPanel {
            id: commitFilesPanel
            repositoryManager: null
            visible: structProjectPanel.currentTabIndex === 2
            SplitView.preferredWidth: visible ? 300 : 0
        }
        
        // Right panel: file preview or diff view (Commits tab)
        StackLayout {
            id: rightPanelStack
            SplitView.preferredWidth: 500
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: structProjectPanel.currentTabIndex === 2 ? 1 : 0

            // File preview (Explorer/Changed tabs)
            ViewPanel {
                id: viewPanel
                fileViewer: null
                repositoryManager: null
            }

            // Diff view (Commits tab)
            DiffPanel {
                id: diffPanel
                repositoryManager: null
                commitHash: commitFilesPanel.selectedCommitHash
                filePath: commitFilesPanel.selectedFilePath
                theme: window.theme
            }
        }
        
        Component.onCompleted: {
            if (typeof fileManager !== 'undefined') {
                structProjectPanel.fileManager = fileManager
            }
            if (typeof repositoryManager !== 'undefined') {
                commitFilesPanel.repositoryManager = repositoryManager
                structProjectPanel.repositoryManager = repositoryManager
                viewPanel.repositoryManager = repositoryManager
                diffPanel.repositoryManager = repositoryManager
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
                // Handle file selection from Explorer (tab 0) or Changed (tab 1) tabs
                if (structProjectPanel.currentTabIndex === 0 || structProjectPanel.currentTabIndex === 1) {
                    if (fileViewer) {
                        if (window.theme) {
                            fileViewer.setSyntaxStyle(window.theme.syntaxHighlightStyle)
                        }
                        fileViewer.loadFile(filePath)
                    }
                }
            })
            
            // Connect commit selection from structProjectPanel to commitFilesPanel
            structProjectPanel.commitSelected.connect(function(commitHash) {
                commitFilesPanel.selectedCommitHash = commitHash
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
            // Connect branch selector panel to struct project panel
            if (typeof branchSelectorPanel !== 'undefined') {
                structProjectPanel.branchSelectorPanel = branchSelectorPanel
            }
            if (typeof window !== 'undefined' && window.contentItem) {
                structProjectPanel.overlayItem = window.contentItem
            }
        }
        }
    }

    property string deleteBranchError: ""
    property string initRepoError: ""

    MacDialog {
        id: deleteBranchDialog
        theme: window.theme
        title: qsTr("Удалить ветку")

        Text {
            text: qsTr("Вы уверены, что хотите удалить текущую ветку?")
            wrapMode: Text.WordWrap
            color: window.theme.textPrimary
            font.pixelSize: window.theme.fontPixelSizeBody
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Item { Layout.fillWidth: true }
            MacButton {
                theme: window.theme
                buttonStyle: "secondary"
                text: qsTr("Отмена")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: deleteBranchDialog.close()
            }
            MacButton {
                theme: window.theme
                buttonStyle: "primary"
                text: qsTr("Удалить")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
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

    MacDialog {
        id: deleteBranchErrorDialog
        theme: window.theme
        title: qsTr("Ошибка")

        Text {
            text: deleteBranchError
            wrapMode: Text.WordWrap
            color: window.theme.textPrimary
            font.pixelSize: window.theme.fontPixelSizeBody
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            Item { Layout.fillWidth: true }
            MacButton {
                theme: window.theme
                buttonStyle: "primary"
                text: qsTr("ОК")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: deleteBranchErrorDialog.close()
            }
        }
    }

    MacDialog {
        id: initRepoDialog
        theme: window.theme
        title: qsTr("Инициализация репозитория")

        Text {
            text: qsTr("Инициализировать репозиторий в текущем каталоге?")
            wrapMode: Text.WordWrap
            color: window.theme.textPrimary
            font.pixelSize: window.theme.fontPixelSizeBody
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Item { Layout.fillWidth: true }
            MacButton {
                theme: window.theme
                buttonStyle: "secondary"
                text: qsTr("Отмена")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: initRepoDialog.close()
            }
            MacButton {
                theme: window.theme
                buttonStyle: "primary"
                text: qsTr("ОК")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
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

    MacDialog {
        id: initRepoErrorDialog
        theme: window.theme
        title: qsTr("Ошибка")

        Text {
            text: initRepoError
            wrapMode: Text.WordWrap
            color: window.theme.textPrimary
            font.pixelSize: window.theme.fontPixelSizeBody
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            Item { Layout.fillWidth: true }
            MacButton {
                theme: window.theme
                buttonStyle: "primary"
                text: qsTr("ОК")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: initRepoErrorDialog.close()
            }
        }
    }

    MacDialog {
        id: aboutDialog
        theme: window.theme
        title: qsTr("О программе")

        Text {
            text: qsTr("Difference Machine")
            wrapMode: Text.WordWrap
            color: window.theme.textPrimary
            font.pixelSize: window.theme.fontPixelSizeBody
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
        }
        Text {
            text: qsTr("Версия") + " " + (typeof appVersion !== "undefined" ? appVersion : "—")
            wrapMode: Text.WordWrap
            color: window.theme.textSecondary
            font.pixelSize: window.theme.fontPixelSizeSmall
            horizontalAlignment: Text.AlignHCenter
            Layout.fillWidth: true
        }
        Item { Layout.fillHeight: true }
        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Item { Layout.fillWidth: true }
            MacButton {
                theme: window.theme
                buttonStyle: "primary"
                text: qsTr("ОК")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: aboutDialog.close()
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

