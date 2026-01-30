import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: commitFilesPanel
    SplitView.minimumWidth: 100
    SplitView.preferredWidth: 300
    
    // Theme instance
    property var theme: Theme {}
    property var repositoryManager: null
    property string selectedCommitHash: ""
    property string selectedFilePath: ""
    
    // Commit info properties
    property string commitMessage: "Commit info"
    property string commitAuthor: ""
    property string commitHash: ""
    property int commitAddedLines: 0
    property int commitRemovedLines: 0
    
    signal fileSelected(string filePath)
    
    color: theme.background

    function refreshCommitFiles() {
        commitFilesModel.clear()
        selectedFilePath = ""
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        if (!selectedCommitHash || selectedCommitHash.length === 0) {
            commitMessage = "Commit info"
            commitAuthor = ""
            commitHash = ""
            commitAddedLines = 0
            commitRemovedLines = 0
            return
        }
        var files = repositoryManager.getCommitFiles(selectedCommitHash)
        if (!files) {
            return
        }
        if (files.length === 0) {
            return
        }
        for (var i = 0; i < files.length; i++) {
            var file = files[i]
            commitFilesModel.append({
                "path": file.path || "",
                "hash": file.hash || "",
                "type": file.type || ""
            })
        }
        Qt.callLater(selectFirstCommitFile)
    }

    function selectFirstCommitFile() {
        if (!commitFilesModel || commitFilesModel.count === 0) {
            selectedFilePath = ""
            return
        }
        var first = commitFilesModel.get(0)
        if (first && first.path) {
            selectedFilePath = first.path
            fileSelected(first.path)
        } else {
            selectedFilePath = ""
        }
    }
    
    function refreshCommitInfo() {
        if (!repositoryManager || !selectedCommitHash) {
            commitMessage = "Commit info"
            commitAuthor = ""
            commitHash = ""
            commitAddedLines = 0
            commitRemovedLines = 0
            return
        }
        var info = repositoryManager.getCommitInfo(selectedCommitHash)
        if (info) {
            commitMessage = info.message || "Commit info"
            commitAuthor = info.author || ""
            commitHash = info.hash || ""
            commitAddedLines = info.added_lines || 0
            commitRemovedLines = info.removed_lines || 0
        } else {
            commitMessage = "Commit info"
            commitAuthor = ""
            commitHash = ""
            commitAddedLines = 0
            commitRemovedLines = 0
        }
    }
    
    function copyHashToClipboard() {
        if (commitHash && repositoryManager) {
            repositoryManager.copyToClipboard(commitHash)
        }
    }

    ListModel {
        id: commitFilesModel
    }

    Connections {
        target: repositoryManager
        function onRepositoryChanged() {
            refreshCommitFiles()
        }
    }

    onSelectedCommitHashChanged: {
        refreshCommitFiles()
        Qt.callLater(refreshCommitInfo)
    }

    onVisibleChanged: {
        if (visible) {
            Qt.callLater(selectFirstCommitFile)
        }
    }

    Component.onCompleted: {
        if (selectedCommitHash) {
            refreshCommitFiles()
        }
    }

    HeaderPanel {
        id: commitFilesHeader
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        theme: commitFilesPanel.theme
        contentMargins: 10
        contentSpacing: 8

        // Commit message (header)
        Text {
            Layout.fillWidth: true
            text: commitMessage && commitMessage.length > 0 ? commitMessage : qsTr("Commit info")
            color: theme.textPrimary
            font.pixelSize: theme.fontPixelSizeTitle
            font.bold: true
            wrapMode: Text.Wrap
            maximumLineCount: 2
            elide: Text.ElideRight
        }

        // Author
        Text {
            Layout.fillWidth: true
            text: commitAuthor && commitAuthor.length > 0 ? commitAuthor : qsTr("Author: -")
            color: theme.textSecondary
            font.pixelSize: theme.fontPixelSizeSmall
        }

        // Hash and copy button
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: qsTr("Hash:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitHash ? commitHash.substring(0, 8) : "-"
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            MacButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                theme: commitFilesPanel.theme
                buttonStyle: "ghost"
                iconSource: theme.getIconPath("edit-copy.svg")
                visible: commitHash && commitHash.length > 0
                onClicked: copyHashToClipboard()
            }

            Item { Layout.fillWidth: true }
        }

        // Statistics (+ and - lines)
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: qsTr("Added:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitAddedLines > 0 ? (commitAddedLines + " " + qsTr("lines")) : "-"
                color: commitAddedLines > 0 ? theme.diffAdded : theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Text {
                text: qsTr("Removed:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitRemovedLines > 0 ? (commitRemovedLines + " " + qsTr("lines")) : "-"
                color: commitRemovedLines > 0 ? theme.diffRemoved : theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Item { Layout.fillWidth: true }
        }
    }

    ColumnLayout {
        id: commitFilesContent
        anchors.top: commitFilesHeader.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        spacing: 0

        Item {
            visible: !repositoryManager || !repositoryManager.isRepository
            Layout.fillWidth: true
            Layout.fillHeight: true
            StubTemplate {
                anchors.centerIn: parent
                theme: commitFilesPanel.theme
                titleText: qsTr("No repository")
                auxiliaryText: ""
                iconSource: theme ? theme.getIconPath("folder.svg") : ""
            }
        }

        Item {
            visible: repositoryManager && repositoryManager.isRepository && (!selectedCommitHash || selectedCommitHash.length === 0)
            Layout.fillWidth: true
            Layout.fillHeight: true
            StubTemplate {
                anchors.centerIn: parent
                theme: commitFilesPanel.theme
                titleText: qsTr("Select a commit to view files")
                auxiliaryText: ""
                iconSource: theme ? theme.getIconPath("file.svg") : ""
            }
        }

        ScrollView {
            visible: repositoryManager && repositoryManager.isRepository && selectedCommitHash && selectedCommitHash.length > 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ListView {
                id: commitFilesList
                anchors.fill: parent
                model: commitFilesModel
                clip: true

                delegate: Rectangle {
                    width: commitFilesList.width
                    height: 28
                    color: commitFileMouseArea.containsMouse ? theme.backgroundHover :
                          (commitFilesPanel.selectedFilePath === model.path ? theme.backgroundSelected : "transparent")

                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 12
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.right: parent.right
                        anchors.rightMargin: 12
                        text: model.path || ""
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSubhead
                        elide: Text.ElideMiddle
                    }

                    MouseArea {
                        id: commitFileMouseArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (model.path) {
                                commitFilesPanel.selectedFilePath = model.path
                                commitFilesPanel.fileSelected(model.path)
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

    // Vertical divider lines on both sides
    Rectangle {
        anchors.left: parent.left
        width: 1
        height: parent.height
        color: theme.divider
    }
    Rectangle {
        anchors.right: parent.right
        width: 1
        height: parent.height
        color: theme.divider
    }
}
