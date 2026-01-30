import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import ".."

Rectangle {
    id: differenceMode
    color: theme.background
    
    property var theme: Theme {}
    property string diffImageUrl: ""
    property string image1Url: ""
    property string image2Url: ""
    
    function isValidUrl(url) {
        if (url === undefined || url === null) return false
        var str = String(url)
        if (!str || str.length === 0) return false
        if (str === "file://") return false
        var trimmed = str.trim()
        if (trimmed.length === 0) return false
        // Check if it's a valid file:// URL with actual path
        if (trimmed.startsWith("file://")) {
            var path = trimmed.substring(7) // Remove "file://"
            if (!path || path.length === 0) return false
        }
        return true
    }
    
    // Force re-evaluation when URLs change
    property bool _image1UrlValid: isValidUrl(image1Url)
    property bool _image2UrlValid: isValidUrl(image2Url)
    
    property bool hasImage1: _image1UrlValid
    property bool hasImage2: _image2UrlValid
    property bool hasBothImages: hasImage1 && hasImage2
    property bool hasOnlyNewImage: !hasImage1 && hasImage2
    
    // Signal to request diff image generation
    signal generateDiffImage(string url1, string url2)
    
    onImage1UrlChanged: {
        _image1UrlValid = isValidUrl(image1Url)
        if (hasBothImages) {
            generateDiffImage(image1Url, image2Url)
        } else {
            diffImageUrl = ""  // Clear diff image when we don't have both
        }
    }
    
    onImage2UrlChanged: {
        _image2UrlValid = isValidUrl(image2Url)
        if (hasBothImages) {
            generateDiffImage(image1Url, image2Url)
        } else {
            diffImageUrl = ""  // Clear diff image when we don't have both
        }
    }
    
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 12
        
        // Single image view (when no comparison)
        ColumnLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 4
            visible: hasOnlyNewImage
            
            // Label
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 30
                color: theme.tabBarBackground
                
                Text {
                    anchors.left: parent.left
                    anchors.leftMargin: 10
                    anchors.verticalCenter: parent.verticalCenter
                    text: qsTr("Added")
                    color: theme.diffAdded
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.bold: true
                }
            }
            
            // Image
            ScrollView {
                id: singleScrollView
                Layout.fillWidth: true
                Layout.fillHeight: true
                ScrollBar.vertical.policy: ScrollBar.AsNeeded
                ScrollBar.horizontal.policy: ScrollBar.AsNeeded
                
                Item {
                    width: singleScrollView.width
                    height: singleScrollView.height
                    
                    Image {
                        id: singleImage
                        source: image2Url
                        fillMode: Image.PreserveAspectFit
                        width: parent.width
                        height: parent.height
                        asynchronous: true
                    }
                    
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: differenceMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: singleImage.status === Image.Error
                    }
                }
            }
        }
        
        Text {
            Layout.fillWidth: true
            text: qsTr("Difference Mode - Highlighted pixels show changes")
            color: theme.textSecondary
            font.pixelSize: theme.fontPixelSizeSmall
            horizontalAlignment: Text.AlignHCenter
            visible: hasBothImages
        }
        
        // Diff image (only show when both images exist)
        ScrollView {
            id: scrollView
            Layout.fillWidth: true
            Layout.fillHeight: true
            ScrollBar.vertical.policy: ScrollBar.AsNeeded
            ScrollBar.horizontal.policy: ScrollBar.AsNeeded
            visible: hasBothImages
            
            Item {
                width: scrollView.width
                height: scrollView.height
                
                Image {
                    id: diffImage
                    source: diffImageUrl
                    fillMode: Image.PreserveAspectFit
                    width: parent.width
                    height: parent.height
                    asynchronous: true
                }
                
                Text {
                    anchors.centerIn: parent
                    text: diffImageUrl ? "Generating diff..." : "No images to compare"
                    color: theme.textDisabled
                    font.pixelSize: theme.fontPixelSizeBody
                    visible: !diffImageUrl || diffImage.status === Image.Loading
                }
                
                StubTemplate {
                    anchors.centerIn: parent
                    theme: differenceMode.theme
                    titleText: qsTr("Failed to load diff image")
                    auxiliaryText: ""
                    iconSource: theme ? theme.getIconPath("file.svg") : ""
                    visible: diffImage.status === Image.Error
                }
            }
        }
    }
}
