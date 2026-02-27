import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import RepositoryManager 1.0
import "."

Rectangle {
    id: diffItemImage
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: theme ? theme.background : "#000000"

    property var theme: Theme {}
    property string commitHash: ""
    property string filePath: ""
    property bool isLoading: false
    property string currentImageUrl: ""
    property string commitImageUrl: ""
    property var repositoryManager: null

    ImageDiffViewer {
        id: imageDiffViewer
        anchors.fill: parent
        theme: diffItemImage.theme
        currentImageUrl: diffItemImage.currentImageUrl
        commitImageUrl: diffItemImage.commitImageUrl
        currentLabel: "Deleted"
        commitLabel: "Added"
        repositoryManager: diffItemImage.repositoryManager
        
        Connections {
            target: imageDiffViewer
            function onGenerateDiffRequested(url1, url2) {
                if (repositoryManager && url1 && url2) {
                    var diffUrl = repositoryManager.generateDiffImage(url1, url2)
                    imageDiffViewer.diffImageUrl = diffUrl
                }
            }
        }
    }
    
    // Loading overlay
    Rectangle {
        anchors.fill: parent
        color: theme ? theme.background : "#000000"
        visible: isLoading
        
        Text {
            anchors.centerIn: parent
            text: qsTr("Loading image diff...")
            color: theme ? theme.textSecondary : "#cccccc"
            font.pixelSize: theme.fontPixelSizeBody
        }
    }
    
    // Empty state (only show when no images at all)
    Rectangle {
        anchors.fill: parent
        color: theme ? theme.background : "#000000"
        visible: !isLoading && (!currentImageUrl || currentImageUrl.length === 0) && (!commitImageUrl || commitImageUrl.length === 0)

        StubTemplate {
            anchors.centerIn: parent
            theme: diffItemImage.theme
            iconSource: theme ? theme.getIconPath("file.svg") : ""
            titleText: (!filePath || filePath.length === 0) ? "Select a file to view diff" : "No images to display"
        }
    }
}
