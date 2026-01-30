import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import "image_diff"
import "."

Rectangle {
    id: imageDiffViewer
    
    property var theme: Theme {}
    property string currentImageUrl: ""
    property string commitImageUrl: ""
    property string currentLabel: "Current"
    property string commitLabel: "From Commit"
    property var repositoryManager: null
    
    property int currentMode: 0  // 0: 2-up, 1: Swipe, 2: Onion Skin, 3: Difference
    property string diffImageUrl: ""
    property bool isDeletedImage: (!currentImageUrl || currentImageUrl.length === 0) && (commitImageUrl && commitImageUrl.length > 0)
    
    signal generateDiffRequested(string url1, string url2)
    
    color: theme.background
    
    onCurrentImageUrlChanged: {
        if (currentMode === 3 && currentImageUrl && commitImageUrl) {
            generateDiffRequested(currentImageUrl, commitImageUrl)
        }
    }
    
    onCommitImageUrlChanged: {
        if (currentMode === 3 && currentImageUrl && commitImageUrl) {
            generateDiffRequested(currentImageUrl, commitImageUrl)
        }
    }
    
    onCurrentModeChanged: {
        if (currentMode === 3 && currentImageUrl && commitImageUrl) {
            generateDiffRequested(currentImageUrl, commitImageUrl)
        }
    }
    
    // Helper function to get file size from URL
    function getFileSize(url) {
        if (!url) return 0
        var path = url.toString().replace("file://", "")
        try {
            var file = Qt.resolvedUrl(path)
            // We'll need to get this from Python backend
            return 0
        } catch (e) {
            return 0
        }
    }
    
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        
        // Mode selector buttons
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 40
            color: theme.tabBarBackground
            visible: !imageDiffViewer.isDeletedImage
            
            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 4
                
                MacButton {
                    theme: imageDiffViewer.theme
                    buttonStyle: "secondary"
                    text: qsTr("2-up")
                    checked: imageDiffViewer.currentMode === 0
                    checkable: true
                    onClicked: imageDiffViewer.currentMode = 0
                }
                MacButton {
                    theme: imageDiffViewer.theme
                    buttonStyle: "secondary"
                    text: qsTr("Swipe")
                    checked: imageDiffViewer.currentMode === 1
                    checkable: true
                    onClicked: imageDiffViewer.currentMode = 1
                }
                MacButton {
                    theme: imageDiffViewer.theme
                    buttonStyle: "secondary"
                    text: qsTr("Onion Skin")
                    checked: imageDiffViewer.currentMode === 2
                    checkable: true
                    onClicked: imageDiffViewer.currentMode = 2
                }
                MacButton {
                    theme: imageDiffViewer.theme
                    buttonStyle: "secondary"
                    text: qsTr("Difference")
                    checked: imageDiffViewer.currentMode === 3
                    checkable: true
                    onClicked: imageDiffViewer.currentMode = 3
                }
            }
        }
        
        // Divider
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.divider
            visible: !imageDiffViewer.isDeletedImage
        }
        
        // Mode content
        StackLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: imageDiffViewer.currentMode
            visible: !imageDiffViewer.isDeletedImage
            
            TwoUpMode {
                theme: imageDiffViewer.theme
                image1Url: imageDiffViewer.commitImageUrl  // Old/Deleted (left, red)
                image2Url: imageDiffViewer.currentImageUrl  // New/Added (right, green)
                image1Label: qsTr("Deleted")
                image2Label: qsTr("Added")
            }
            
            SwipeMode {
                theme: imageDiffViewer.theme
                image1Url: imageDiffViewer.commitImageUrl  // Old (background)
                image2Url: imageDiffViewer.currentImageUrl  // New (foreground)
            }
            
            OnionSkinMode {
                theme: imageDiffViewer.theme
                image1Url: imageDiffViewer.commitImageUrl  // Old (background)
                image2Url: imageDiffViewer.currentImageUrl  // New (foreground)
            }
            
            DifferenceMode {
                id: differenceMode
                theme: imageDiffViewer.theme
                diffImageUrl: imageDiffViewer.diffImageUrl
                image1Url: imageDiffViewer.commitImageUrl  // Old
                image2Url: imageDiffViewer.currentImageUrl  // New
                onGenerateDiffImage: function(url1, url2) {
                    imageDiffViewer.generateDiffRequested(url1, url2)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: theme.background
            visible: imageDiffViewer.isDeletedImage

            StubTemplate {
                anchors.centerIn: parent
                theme: imageDiffViewer.theme
                iconSource: theme.getIconPath("trash.svg")
                titleText: qsTr("This file deleted")
            }
        }
    }
}
