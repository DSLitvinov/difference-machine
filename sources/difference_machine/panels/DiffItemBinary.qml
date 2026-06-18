import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import RepositoryManager 1.0
import "."

Rectangle {
    id: diffItemBinary
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: theme.background

    property var theme: Theme {}
    property string commitHash: ""
    property string filePath: ""
    property bool isLoading: false
    property var repositoryManager: null
    property bool isBlendFile: filePath && filePath.toLowerCase().endsWith(".blend")
    property string displayPath: {
        if (!filePath) return ""
        if (filePath.indexOf("/") === 0) return filePath
        if (repositoryManager && repositoryManager.currentRepository) {
            return repositoryManager.currentRepository + "/" + filePath
        }
        return filePath
    }
    
    function isFileDeleted() {
        if (!filePath || !repositoryManager) {
            return false
        }
        var status = repositoryManager.lastStatus
        if (!status) {
            return false
        }
        var path = String(filePath)
        if (status.staged_deleted_files && status.staged_deleted_files.indexOf(path) !== -1) {
            return true
        }
        if (status.unstaged_deleted_files && status.unstaged_deleted_files.indexOf(path) !== -1) {
            return true
        }
        // Check if file is deleted in commit
        if (commitHash && commitHash.length > 0) {
            var commitFiles = repositoryManager.getCommitFiles(commitHash)
            if (commitFiles) {
                for (var i = 0; i < commitFiles.length; i++) {
                    var file = commitFiles[i]
                    if (file.path === path && file.type === "deleted") {
                        return true
                    }
                }
            }
        }
        return false
    }

    Loader {
        anchors.fill: parent
        sourceComponent: isFileDeleted() ? deletedStubComponent : binaryFileComponent
    }
    
    Component {
        id: deletedStubComponent
        Item {
            anchors.fill: parent
            StubTemplate {
                anchors.centerIn: parent
                theme: diffItemBinary.theme
                iconSource: theme.getIconPath("trash.svg")
                titleText: qsTr("This file deleted")
            }
        }
    }

    Component {
        id: binaryFileComponent
        Item {
            anchors.fill: parent
            StubTemplate {
                anchors.centerIn: parent
                theme: diffItemBinary.theme
                iconSource: isBlendFile ? theme.getIconPath("blender.svg") : theme.getIconPath("file.svg")
                titleText: {
                    if (isLoading) {
                        return qsTr("Loading diff...")
                    } else if (!commitHash || commitHash.length === 0) {
                        return qsTr("Select a commit to view diff")
                    } else if (!filePath || filePath.length === 0) {
                        return qsTr("Select a file to view diff")
                    } else {
                        return qsTr("Binary file")
                    }
                }
                auxiliaryText: (!isLoading && commitHash && commitHash.length > 0 && filePath && filePath.length > 0)
                    ? ("Please open to external editor\n" + displayPath)
                    : ""
                contentMaxWidth: 560
            }
        }
    }
}
