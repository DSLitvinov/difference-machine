import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import "."

Rectangle {
    id: metadataPanel

    property var theme: Theme {}
    property var repositoryManager: null
    property string commitHash: ""
    property string filePath: ""
    property var fileMetadata: ({})
    property bool isBlendFile: filePath && filePath.toLowerCase().endsWith(".blend")

    color: theme.metadataPanelBackground
    implicitHeight: filePath && filePath.length > 0 ? contentColumn.implicitHeight + 20 : 0
    height: implicitHeight
    visible: filePath && filePath.length > 0

    function fileNameFromPath(path) {
        if (!path) return ""
        var parts = String(path).split("/")
        return parts.length > 0 ? parts[parts.length - 1] : String(path)
    }

    function refreshMetadata() {
        if (repositoryManager && repositoryManager.getWorkingFileMetadata && filePath) {
            var meta = repositoryManager.getWorkingFileMetadata(filePath)
            fileMetadata = meta || {}
        } else {
            fileMetadata = {}
        }
    }

    onFilePathChanged: refreshMetadata()
    onRepositoryManagerChanged: refreshMetadata()

    Component.onCompleted: {
        refreshMetadata()
    }

    Rectangle {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 1
        color: theme.divider
    }

    Column {
        id: contentColumn
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: 10
        spacing: 6

        Row {
            spacing: 10
            Text {
                text: qsTr("Name:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                width: 80
            }
            Text {
                text: fileMetadata.name ? fileMetadata.name : fileNameFromPath(filePath)
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
                elide: Text.ElideMiddle
            }
        }

        Row {
            spacing: 10
            Text {
                text: qsTr("Path:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                width: 80
            }
            Text {
                text: fileMetadata.path ? fileMetadata.path : filePath
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
                elide: Text.ElideMiddle
            }
        }

        Row {
            spacing: 20
            Text {
                text: qsTr("Size:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }
            Text {
                text: fileMetadata.size_formatted ? fileMetadata.size_formatted : "-"
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Text {
                text: qsTr("Modified:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }
            Text {
                text: fileMetadata.modified_date ? fileMetadata.modified_date : "-"
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Text {
                text: qsTr("Created:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }
            Text {
                text: fileMetadata.created_date ? fileMetadata.created_date : "-"
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }
        }

        Row {
            spacing: 10
            visible: isBlendFile
            Text {
                text: qsTr("Blender:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                width: 80
            }

            Button {
                text: qsTr("Compare")
                enabled: repositoryManager && commitHash && commitHash.length > 0 && isBlendFile
                onClicked: {
                    if (repositoryManager && repositoryManager.compareCommitFile) {
                        repositoryManager.compareCommitFile(commitHash, filePath)
                    }
                }
            }

            Button {
                text: qsTr("Clear compare")
                flat: true
                visible: repositoryManager && repositoryManager.compareActive && isBlendFile
                onClicked: {
                    if (repositoryManager && repositoryManager.clearCompare) {
                        repositoryManager.clearCompare()
                    }
                }
            }
        }
    }
}
