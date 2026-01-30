import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: branchSelectorPanel
    Layout.fillWidth: true
    Layout.preferredHeight: branchColumnLayout.implicitHeight
    color: theme.tabBarBackground

    // Theme instance
    property var theme: Theme {}
    property var repositoryManager: null
    property string selectedBranch: ""
    property string currentBranchName: ""
    property string explicitCurrentBranch: ""
    property string createBranchName: ""
    property string createBranchError: ""
    property int selectedBranchCommitCount: 0
    
    // Signal emitted when selected branch changes (to avoid conflict with property handler)
    signal branchSelectionChanged(string branchName)

    function refreshBranches() {
        var previousSelection = selectedBranch
        branchModel.clear()
        if (!repositoryManager || !repositoryManager.currentRepository) {
            currentBranchName = ""
            selectedBranch = ""
            explicitCurrentBranch = ""
            return
        }
        var branches = repositoryManager.getBranches()
        if (!branches || branches.length === 0) {
            currentBranchName = ""
            selectedBranch = ""
            return
        }
        var currentBranch = ""
        for (var i = 0; i < branches.length; i++) {
            branchModel.append(branches[i])
            if (branches[i].is_current) {
                currentBranch = branches[i].name
            }
        }
        currentBranchName = currentBranch
        if (explicitCurrentBranch) {
            var hasExplicit = false
            for (var k = 0; k < branchModel.count; k++) {
                if (branchModel.get(k).name === explicitCurrentBranch) {
                    hasExplicit = true
                    break
                }
            }
            if (!hasExplicit) {
                explicitCurrentBranch = ""
            }
        }
        selectedBranch = ""
        if (previousSelection) {
            for (var j = 0; j < branchModel.count; j++) {
                if (branchModel.get(j).name === previousSelection) {
                    selectedBranch = previousSelection
                    break
                }
            }
        }
        if (!selectedBranch && currentBranch) {
            selectedBranch = currentBranch
        }
        if (!selectedBranch && branches.length > 0) {
            selectedBranch = branches[0].name
        }
        updateSelectedBranchCommitCount()
    }

    function getBranchColor(branchName) {
        if (!branchName) return theme.accent
        var hash = 0
        for (var i = 0; i < branchName.length; i++) {
            hash = branchName.charCodeAt(i) + ((hash << 5) - hash)
        }
        var hue = Math.abs(hash) % 360
        return Qt.hsla(hue / 360, 0.7, 0.5, 1.0)
    }

    function getSelectedBranchCommitHash() {
        if (!selectedBranch || branchModel.count === 0) {
            return ""
        }
        for (var i = 0; i < branchModel.count; i++) {
            if (branchModel.get(i).name === selectedBranch) {
                return branchModel.get(i).commit_hash || ""
            }
        }
        return ""
    }

    function getSelectedBranchIsCurrent() {
        if (!selectedBranch || branchModel.count === 0) {
            return false
        }
        return selectedBranch === explicitCurrentBranch
    }

    function updateSelectedBranchCommitCount() {
        if (!repositoryManager || !repositoryManager.currentRepository || !selectedBranch) {
            selectedBranchCommitCount = 0
            return
        }
        var commits = repositoryManager.getLog(0, selectedBranch)
        selectedBranchCommitCount = commits ? commits.length : 0
    }

    ListModel {
        id: branchModel
    }

    Connections {
        target: repositoryManager
        function onStatusChanged() {
            refreshBranches()
        }
        function onRepositoryChanged() {
            explicitCurrentBranch = ""
            refreshBranches()
        }
    }

    Component.onCompleted: {
        refreshBranches()
    }

    // Periodic refresh of branches list.
    Timer {
        id: branchesRefreshTimer
        interval: 4000
        running: true
        repeat: true
        onTriggered: {
            if (repositoryManager && repositoryManager.currentRepository) {
                refreshBranches()
            }
        }
    }

    onSelectedBranchChanged: {
        updateSelectedBranchCommitCount()
        // Emit a signal to notify other components about branch selection changes
        branchSelectorPanel.branchSelectionChanged(selectedBranch)
    }

    ColumnLayout {
        id: branchColumnLayout
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        spacing: 0

        HeaderPanel {
            id: branchHeader
            Layout.fillWidth: true
            theme: branchSelectorPanel.theme
            contentMargins: 10
            contentSpacing: 6

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

            Text {
                text: qsTr("Branch")
                color: theme.textPrimary
                font.pixelSize: theme.fontPixelSizeTitle
                font.bold: true
            }

            Rectangle {
                id: branchSelectorButton
                Layout.preferredHeight: 24
                Layout.preferredWidth: 180
                color: branchSelectorMouseArea.containsMouse ? theme.backgroundHover : theme.background
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
                visible: repositoryManager && repositoryManager.isRepository

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 8
                    spacing: 6

                    Rectangle {
                        Layout.preferredWidth: 10
                        Layout.preferredHeight: 10
                        radius: theme.radiusBadge / 2
                        color: getBranchColor(selectedBranch)
                    }

                    Text {
                        Layout.fillWidth: true
                        text: selectedBranch
                            ? (selectedBranch + (getSelectedBranchIsCurrent() ? " (" + qsTr("Current") + ")" : ""))
                            : qsTr("Select Branch...")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSmall
                        elide: Text.ElideRight
                    }
                }

                MouseArea {
                    id: branchSelectorMouseArea
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        var pos = branchSelectorButton.mapToItem(branchSelectorPanel, 0, branchSelectorButton.height + 4)
                        var maxX = branchSelectorPanel.width - branchMenuPopup.width - 10
                        branchMenuPopup.x = Math.max(10, Math.min(pos.x, maxX))
                        branchMenuPopup.y = pos.y
                        branchMenuPopup.open()
                    }
                }
            }

            Rectangle {
                id: createBranchButton
                Layout.preferredHeight: 24
                Layout.preferredWidth: 24
                color: createBranchMouseArea.containsMouse ? theme.backgroundHover : theme.background
                border.color: theme.divider
                border.width: 1
                radius: theme.radiusMedium
                visible: repositoryManager && repositoryManager.isRepository

                Text {
                    anchors.centerIn: parent
                    text: "+"
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeTitle
                    font.bold: true
                }

                MouseArea {
                    id: createBranchMouseArea
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        createBranchName = ""
                        createBranchError = ""
                        var p = createBranchButton.mapToItem(branchSelectorPanel, 0, 0)
                        createBranchPopup.x = p.x + (createBranchButton.width - createBranchPopup.width) / 2
                        createBranchPopup.y = p.y + createBranchButton.height + 6
                        createBranchPopup.x = Math.max(8, Math.min(createBranchPopup.x, branchSelectorPanel.width - createBranchPopup.width - 8))
                        createBranchPopup.y = Math.min(createBranchPopup.y, branchSelectorPanel.height - createBranchPopup.height - 8)
                        if (createBranchPopup.y < p.y + createBranchButton.height + 6)
                            createBranchPopup.y = Math.max(8, p.y - createBranchPopup.height - 4)
                        createBranchPopup.open()
                    }
                }
            }

            Item { Layout.fillWidth: true }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            RowLayout {
                spacing: 6

                Text {
                    text: qsTr("Branch:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }

                Text {
                    text: {
                        if (!repositoryManager || !repositoryManager.isRepository) return "-"
                        return selectedBranch
                            ? (selectedBranch + (getSelectedBranchIsCurrent() ? " (" + qsTr("Current") + ")" : ""))
                            : "-"
                    }
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }

                Text {
                    text: qsTr("Commits:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }

                Text {
                    text: {
                        if (!repositoryManager || !repositoryManager.isRepository) return "-"
                        return selectedBranchCommitCount.toString()
                    }
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }
            }

            RowLayout {
                spacing: 6

                Text {
                    text: qsTr("HEAD:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }

                Text {
                    text: {
                        if (!repositoryManager || !repositoryManager.isRepository) return "-"
                        var hash = getSelectedBranchCommitHash()
                        return hash ? hash.slice(0, 8) : "-"
                    }
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }

                MacButton {
                    Layout.preferredHeight: 24
                    Layout.preferredWidth: 24
                    theme: branchSelectorPanel.theme
                    buttonStyle: "ghost"
                    iconSource: theme.getIconPath("edit-copy.svg")
                    visible: repositoryManager && repositoryManager.isRepository && getSelectedBranchCommitHash().length > 0
                    onClicked: {
                        var hash = getSelectedBranchCommitHash()
                        if (hash && repositoryManager) {
                            repositoryManager.copyToClipboard(hash)
                        }
                    }
                }
            }
        }
        }
    }

    Popup {
        id: branchMenuPopup
        x: 10
        y: 160
        width: 250
        height: Math.min(branchModel.count * 32 + 20, 300)
        modal: true
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            border.width: 1
            radius: theme.radiusMedium
        }

        contentItem: ScrollView {
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ListView {
                id: branchMenuList
                anchors.fill: parent
                model: branchModel
                clip: true

                delegate: Rectangle {
                    width: branchMenuList.width
                    height: 32
                    color: branchItemMouseArea.containsMouse ? theme.backgroundHover :
                           (model.name === selectedBranch ? theme.backgroundSelected : "transparent")

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 8

                        Rectangle {
                            Layout.preferredWidth: 12
                            Layout.preferredHeight: 12
                            radius: theme.radiusBadge / 2
                            color: getBranchColor(model.name || "")
                        }

                        Text {
                            Layout.fillWidth: true
                            text: model.name
                            ? (model.name + (model.name === explicitCurrentBranch ? " (" + qsTr("Current") + ")" : ""))
                                : ""
                            color: theme.textPrimary
                            font.pixelSize: theme.fontPixelSizeBody
                            elide: Text.ElideRight
                        }

                        Text {
                        visible: model.name === explicitCurrentBranch
                            text: "•"
                            color: theme.accent
                            font.pixelSize: theme.fontPixelSizeHeadline
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: branchItemMouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var branchName = model.name || ""
                            selectedBranch = branchName
                            if (repositoryManager && repositoryManager.currentRepository && branchName.length > 0 && !model.is_current) {
                                var ok = repositoryManager.switchBranch(branchName, false)
                                if (ok) {
                                    explicitCurrentBranch = branchName
                                }
                            }
                            branchMenuPopup.close()
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

    MacDialog {
        id: createBranchPopup
        centerOnOpen: false  // позиция у кнопки «+»
        theme: branchSelectorPanel.theme
        title: qsTr("Имя ветки")
        minContentWidth: 280

        onOpened: nameField.forceActiveFocus()

        MacTextField {
            id: nameField
            theme: createBranchPopup.theme
            Layout.fillWidth: true
            placeholderText: qsTr("Введите имя")
            text: createBranchName
            onTextChanged: {
                createBranchName = text
                createBranchError = ""
            }
        }

        Text {
            visible: createBranchError.length > 0
            text: createBranchError
            color: createBranchPopup.theme ? createBranchPopup.theme.error : "#cc0000"
            font.pixelSize: createBranchPopup.theme ? createBranchPopup.theme.fontPixelSizeSmall : 11
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            spacing: 8

            Item { Layout.fillWidth: true }

            MacButton {
                theme: createBranchPopup.theme
                buttonStyle: "secondary"
                text: qsTr("Отмена")
                Layout.minimumWidth: 80
                Layout.preferredWidth: 80
                Layout.preferredHeight: 28
                onClicked: createBranchPopup.close()
            }

            MacButton {
                theme: createBranchPopup.theme
                buttonStyle: "primary"
                text: qsTr("Create")
                Layout.minimumWidth: 80
                Layout.preferredWidth: 80
                Layout.preferredHeight: 28
                enabled: createBranchName.trim().length > 0
                onClicked: {
                    if (!repositoryManager) {
                        createBranchError = qsTr("Репозиторий недоступен")
                        return
                    }
                    var ok = repositoryManager.createBranch(createBranchName.trim())
                    if (ok) {
                        createBranchPopup.close()
                    } else {
                        createBranchError = repositoryManager.lastError || qsTr("Не удалось создать ветку")
                    }
                }
            }
        }
    }

}
