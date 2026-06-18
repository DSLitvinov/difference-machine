import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import components 1.0
import ".."

Rectangle {
    id: onionSkinMode
    color: theme.background
    
    property var theme: Theme {}
    property string image1Url: ""
    property string image2Url: ""
    property real opacityValue: 0.5  // 0.0 to 1.0
    property bool image1OnTop: true
    
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
    
    onImage1UrlChanged: {
        _image1UrlValid = isValidUrl(image1Url)
    }
    onImage2UrlChanged: {
        _image2UrlValid = isValidUrl(image2Url)
    }
    
    property bool hasImage1: _image1UrlValid
    property bool hasImage2: _image2UrlValid
    property bool hasBothImages: hasImage1 && hasImage2
    property bool hasOnlyNewImage: !hasImage1 && hasImage2
    
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
                        theme: onionSkinMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: singleImage.status === Image.Error
                    }
                }
            }
        }
        
        // Opacity slider control at the top (only show when both images exist)
        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: hasBothImages
            
            Text {
                text: qsTr("Opacity:")
                color: theme.textSecondary
                font.pixelSize: theme.fontPixelSizeSmall
            }
            
            Slider {
                id: opacitySlider
                Layout.fillWidth: true
                from: 0.0
                to: 1.0
                value: opacityValue
                onValueChanged: opacityValue = value
            }
            
            Text {
                text: Math.round(opacityValue * 100) + "%"
                color: theme.textSecondary
                font.pixelSize: theme.fontPixelSizeSmall
                Layout.preferredWidth: 50
            }
        }
        
        // Image container with overlay (only show when both images exist)
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: hasBothImages
            
            ScrollView {
                id: scrollView
                anchors.fill: parent
                ScrollBar.vertical.policy: ScrollBar.AsNeeded
                ScrollBar.horizontal.policy: ScrollBar.AsNeeded
                
                Item {
                    id: imageContainer
                    width: scrollView.width
                    height: scrollView.height
                    
                    // Background image (always fully opaque)
                    Image {
                        id: image1
                        source: image1Url
                        fillMode: Image.PreserveAspectFit
                        width: parent.width
                        height: parent.height
                        asynchronous: true
                        z: image1OnTop ? 2 : 1
                        opacity: image1OnTop ? opacityValue : 1.0
                    }
                    
                    // Foreground image (with adjustable opacity)
                    Image {
                        id: image2
                        source: image2Url
                        fillMode: Image.PreserveAspectFit
                        width: parent.width
                        height: parent.height
                        asynchronous: true
                        z: image1OnTop ? 1 : 2
                        opacity: image1OnTop ? 1.0 : opacityValue
                    }
                    
                    // Error messages
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: onionSkinMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: image1.status === Image.Error && image2.status === Image.Error
                    }
                }
            }
        }
        
        // Layer order toggle at the bottom (only show when both images exist)
        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            spacing: 8
            visible: hasBothImages
            
            Item {
                Layout.fillWidth: true
            }
            
            DmButton {
                theme: onionSkinMode.theme
                buttonStyle: "ghost"
                text: image1OnTop ? qsTr("Image 1 on Top") : qsTr("Image 2 on Top")
                onClicked: image1OnTop = !image1OnTop
            }
            
            Item {
                Layout.fillWidth: true
            }
        }
    }
}
