import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import components 1.0
import "."

Rectangle {
    id: commitsListPanel
    SplitView.minimumWidth: 120
    SplitView.preferredWidth: 280

    property var theme: Theme {}
    property var repositoryManager: null
    property var branchSelectorPanel: null
    property var overlayItem: null

    property string selectedCommitHash: ""
    property string contextMenuCommitHash: ""
    property string createBranchFromCommitName: ""
    property string createBranchFromCommitError: ""

    signal commitSelected(string commitHash)

    color: theme.contentBackground

    ListModel {
        id: commitsModel
    }

    function refreshCommits() {
        commitsModel.clear()
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        var branchName = ""
        if (branchSelectorPanel && branchSelectorPanel.selectedBranch) {
            branchName = branchSelectorPanel.selectedBranch
        }
        var commits = repositoryManager.getLog(100, branchName)
        if (!commits || commits.length === 0) {
            return
        }
        for (var i = 0; i < commits.length; i++) {
            commitsModel.append(commits[i])
        }
    }

    function openCommitContextMenu(hash, x, y) {
        contextMenuCommitHash = hash
        var parent = (overlayItem && overlayItem.width > 0) ? overlayItem : commitsListPanel
        commitContextMenu.parent = parent
        commitContextMenu.popup(x, y)
    }

    Connections {
        target: repositoryManager
        enabled: repositoryManager !== null
        function onRepositoryChanged() {
            refreshCommits()
        }
    }

    Connections {
        target: branchSelectorPanel
        enabled: branchSelectorPanel !== null
        function onBranchSelectionChanged(branchName) {
            if (repositoryManager && repositoryManager.isRepository) {
                refreshCommits()
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 44
            color: theme.tabBarBackground

            Text {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                anchors.topMargin: 12
                anchors.bottomMargin: 12
                verticalAlignment: Text.AlignVCenter
                text: qsTr("Commits")
                color: theme.textPrimary
                font.pixelSize: theme.fontPixelSizeBody
                font.bold: true
            }

            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: theme.divider
            }
        }

        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ListView {
                id: commitsList
                anchors.fill: parent
                model: commitsModel
                clip: true

                delegate: Rectangle {
                    width: commitsList.width
                    height: 60
                    color: commitMouseArea.containsMouse ? theme.backgroundHover :
                          (commitsListPanel.selectedCommitHash === model.hash ? theme.backgroundSelected : "transparent")

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        anchors.topMargin: 8
                        anchors.bottomMargin: 8
                        spacing: 4

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Text {
                                Layout.fillWidth: true
                                Layout.minimumWidth: 0
                                text: model.message || "(no message)"
                                color: theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSubhead
                                font.bold: true
                                elide: Text.ElideRight
                            }

                            DmButton {
                                id: commitMenuBtn
                                Layout.alignment: Qt.AlignVCenter | Qt.AlignRight
                                theme: commitsListPanel.theme
                                buttonStyle: "icon"
                                iconSource: theme ? theme.getIconPath("more-vert.svg") : ""
                                iconSize: 16
                                opacity: commitMenuBtn.hovered ? 1.0 : 0.6
                                onClicked: {
                                    var overlay = commitsListPanel.overlayItem || commitsListPanel
                                    var pos = commitMenuBtn.mapToItem(overlay, commitMenuBtn.width, commitMenuBtn.height)
                                    commitsListPanel.openCommitContextMenu(model.hash || "", pos.x, pos.y)
                                }
                                DmToolTip {
                                    visible: commitMenuBtn.hovered
                                    text: qsTr("Commit actions")
                                    theme: commitsListPanel.theme
                                }
                            }
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 12

                            Text {
                                text: model.author || qsTr("Unknown")
                                color: theme.textSecondary
                                font.pixelSize: theme.fontPixelSizeSmall
                            }

                            Text {
                                text: model.hash ? model.hash.slice(0, 8) : ""
                                color: theme.textTertiary
                                font.pixelSize: theme.fontPixelSizeSmall
                                font.family: theme.fontMonospace
                            }

                            Item { Layout.fillWidth: true }
                        }
                    }

                    MouseArea {
                        id: commitMouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        acceptedButtons: Qt.LeftButton | Qt.RightButton
                        onClicked: function(mouse) {
                            if (mouse.button === Qt.RightButton) {
                                var overlay = commitsListPanel.overlayItem || commitsListPanel
                                var pos = commitMouseArea.mapToItem(overlay, mouse.x, mouse.y)
                                commitsListPanel.openCommitContextMenu(model.hash || "", pos.x, pos.y)
                            } else if (model.hash) {
                                commitsListPanel.selectedCommitHash = model.hash
                                commitsListPanel.commitSelected(model.hash)
                            }
                        }
                    }

                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 1
                        color: theme.divider
                        opacity: 0.3
                    }
                }
            }
        }
    }

    DmContextMenu {
        id: commitContextMenu
        theme: commitsListPanel.theme
        function triggerAction(action) {
            var hash = contextMenuCommitHash || ""
            if (action === "copy") {
                if (repositoryManager && hash.length > 0)
                    repositoryManager.copyToClipboard(hash)
                return
            }
            if (action === "checkout") {
                if (repositoryManager && hash.length > 0 && repositoryManager.checkoutToCommit(hash)) {
                    refreshCommits()
                    if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                        branchSelectorPanel.refreshBranches()
                }
                return
            }
            if (action === "revert") {
                if (repositoryManager && hash.length > 0 && repositoryManager.revertCommit(hash)) {
                    refreshCommits()
                    if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                        branchSelectorPanel.refreshBranches()
                }
                return
            }
            if (action === "restore") {
                if (repositoryManager && hash.length > 0 && repositoryManager.restoreVersion(hash)) {
                    refreshCommits()
                    if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                        branchSelectorPanel.refreshBranches()
                }
                return
            }
            if (action === "branch") {
                createBranchFromCommitName = ""
                createBranchFromCommitError = ""
                createBranchFromCommitDialog.open()
            }
        }
        MenuItem {
            text: qsTr("Проверить до этого коммита")
            onTriggered: commitContextMenu.triggerAction("checkout")
        }
        MenuItem {
            text: qsTr("Откатить коммит")
            onTriggered: commitContextMenu.triggerAction("revert")
        }
        MenuItem {
            text: qsTr("Restore this version")
            onTriggered: commitContextMenu.triggerAction("restore")
        }
        MenuItem {
            text: qsTr("Создать ветку от коммита")
            onTriggered: commitContextMenu.triggerAction("branch")
        }
        DmMenuSeparator { theme: commitContextMenu.theme }
        MenuItem {
            text: qsTr("Скопировать хеш")
            onTriggered: commitContextMenu.triggerAction("copy")
        }
    }

    Popup {
        id: createBranchFromCommitDialog
        parent: (overlayItem && overlayItem.width > 0) ? overlayItem : commitsListPanel
        anchors.centerIn: parent
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        width: Math.max(280, createBranchFromCommitCol.implicitWidth + 40)
        padding: 20
        background: Rectangle {
            color: theme.tabBarBackground
            border.color: theme.divider
            radius: 6
        }
        contentItem: ColumnLayout {
            Text {
                text: qsTr("Создать ветку от коммита")
                color: theme.textPrimary
                Layout.fillWidth: true
            }
            ColumnLayout {
                id: createBranchFromCommitCol
                spacing: 12
                Layout.fillWidth: true
                TextField {
                    id: createBranchFromCommitNameField
                    Layout.fillWidth: true
                    placeholderText: qsTr("Введите имя ветки")
                    placeholderTextColor: theme.textPlaceholder
                    text: createBranchFromCommitName
                    onTextChanged: {
                        createBranchFromCommitName = text
                        createBranchFromCommitError = ""
                    }
                    color: theme.textPrimary
                    background: Rectangle {
                        color: theme.tabBarBackground
                        border.color: theme.divider
                        border.width: 1
                        radius: theme.radiusMedium
                    }
                }
                Text {
                    visible: createBranchFromCommitError.length > 0
                    text: createBranchFromCommitError
                    color: theme.error
                    font.pixelSize: theme.fontPixelSizeSmall
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Item { Layout.fillWidth: true }
                    DmButton {
                        theme: commitsListPanel.theme
                        buttonStyle: "ghost"
                        text: qsTr("Отмена")
                        onClicked: createBranchFromCommitDialog.close()
                    }
                    DmButton {
                        theme: commitsListPanel.theme
                        buttonStyle: "primary"
                        text: qsTr("Создать")
                        enabled: createBranchFromCommitName.trim().length > 0
                        onClicked: {
                            if (!repositoryManager) {
                                createBranchFromCommitError = qsTr("Репозиторий недоступен")
                                return
                            }
                            var h = contextMenuCommitHash || ""
                            if (h.length === 0) {
                                createBranchFromCommitError = qsTr("Коммит не выбран")
                                return
                            }
                            var ok = repositoryManager.createBranchFromCommit(createBranchFromCommitName.trim(), h)
                            if (ok) {
                                createBranchFromCommitDialog.close()
                                if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                                    branchSelectorPanel.refreshBranches()
                            } else {
                                createBranchFromCommitError = repositoryManager.lastError || qsTr("Не удалось создать ветку")
                            }
                        }
                    }
                }
            }
        }
        onOpened: createBranchFromCommitNameField.forceActiveFocus()
    }
}
