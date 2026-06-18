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
    
    signal fileSelected(string filePath)
    
    color: theme.contentBackground

    function refreshCommitFiles() {
        commitFilesModel.clear()
        selectedFilePath = ""
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        if (!selectedCommitHash || selectedCommitHash.length === 0) {
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

    ColumnLayout {
        id: commitFilesContent
        anchors.fill: parent
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
                iconSize: 48
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
                iconSize: 48
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
}
