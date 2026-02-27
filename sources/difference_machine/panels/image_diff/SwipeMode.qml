import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import ".."

Rectangle {
    id: swipeMode
    color: theme.background
    
    property var theme: Theme {}
    property string image1Url: ""
    property string image2Url: ""
    property real swipePosition: 0.5  // 0.0 to 1.0
    
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
                        theme: swipeMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: singleImage.status === Image.Error
                    }
                }
            }
        }
        
        // Image container with swipe (only show when both images exist)
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
                    
                    // Calculate actual image display dimensions (accounting for PreserveAspectFit)
                    property real imageDisplayWidth: {
                        if (image1.status === Image.Ready && image1.sourceSize.width > 0 && image1.sourceSize.height > 0) {
                            var imageAspect = image1.sourceSize.width / image1.sourceSize.height
                            var containerAspect = imageContainer.width / imageContainer.height
                            if (imageAspect > containerAspect) {
                                // Image is wider - width matches container
                                return imageContainer.width
                            } else {
                                // Image is taller - height matches container
                                return imageContainer.height * imageAspect
                            }
                        }
                        return imageContainer.width
                    }
                    
                    property real imageDisplayX: (imageContainer.width - imageDisplayWidth) / 2
                    property real imageDisplayY: {
                        if (image1.status === Image.Ready && image1.sourceSize.width > 0 && image1.sourceSize.height > 0) {
                            var imageAspect = image1.sourceSize.width / image1.sourceSize.height
                            var containerAspect = imageContainer.width / imageContainer.height
                            if (imageAspect > containerAspect) {
                                // Image is wider - height is smaller
                                return (imageContainer.height - imageContainer.height * containerAspect / imageAspect) / 2
                            } else {
                                // Image is taller - height matches container
                                return 0
                            }
                        }
                        return 0
                    }
                    property real imageDisplayHeight: {
                        if (image1.status === Image.Ready && image1.sourceSize.width > 0 && image1.sourceSize.height > 0) {
                            var imageAspect = image1.sourceSize.width / image1.sourceSize.height
                            var containerAspect = imageContainer.width / imageContainer.height
                            if (imageAspect > containerAspect) {
                                // Image is wider - height is smaller
                                return imageContainer.height * containerAspect / imageAspect
                            } else {
                                // Image is taller - height matches container
                                return imageContainer.height
                            }
                        }
                        return imageContainer.height
                    }
                    
                    // Background image (image1) - shows on the right side
                    Image {
                        id: image1
                        source: image1Url
                        fillMode: Image.PreserveAspectFit
                        width: parent.width
                        height: parent.height
                        asynchronous: true
                        
                        // Border: red on left, transparent on right
                        Rectangle {
                            x: imageContainer.imageDisplayX
                            y: imageContainer.imageDisplayY
                            width: imageContainer.imageDisplayWidth * swipePosition
                            height: imageContainer.imageDisplayHeight
                            color: "transparent"
                            border.color: theme.diffRemoved
                            border.width: 2
                            z: 10
                        }
                    }
                    
                    // Foreground image (image2) - shows on the left side, clipped
                    Item {
                        id: image2Container
                        x: imageContainer.imageDisplayX
                        y: imageContainer.imageDisplayY
                        width: imageContainer.imageDisplayWidth * swipePosition
                        height: imageContainer.imageDisplayHeight
                        clip: true
                        
                        Image {
                            id: image2
                            source: image2Url
                            fillMode: Image.PreserveAspectFit
                            width: imageContainer.width
                            height: imageContainer.height
                            x: -imageContainer.imageDisplayX
                            y: -imageContainer.imageDisplayY
                            asynchronous: true
                        }
                        
                        // Border: green on right edge
                        Rectangle {
                            anchors.right: parent.right
                            anchors.top: parent.top
                            anchors.bottom: parent.bottom
                            width: 2
                            color: theme.diffAdded
                            z: 10
                        }
                    }
                    
                    // Divider line at swipe position (draggable)
                    // Line is centered in the circle handle
                    Item {
                        id: dividerContainer
                        x: imageContainer.imageDisplayX + imageContainer.imageDisplayWidth * swipePosition
                        y: imageContainer.imageDisplayY
                        width: 2
                        height: imageContainer.imageDisplayHeight
                        z: 20
                        
                        // Green line - centered in circle
                        Rectangle {
                            id: dividerLine
                            anchors.horizontalCenter: parent.horizontalCenter
                            y: 0
                            width: 2
                            height: parent.height
                            color: theme.diffAdded
                        }
                        
                        // Divider handle (circle) - line goes through its center
                        Rectangle {
                            id: dividerHandle
                            anchors.horizontalCenter: parent.horizontalCenter
                            anchors.verticalCenter: parent.verticalCenter
                            width: 12
                            height: 12
                            radius: theme.radiusLarge
                            color: theme.textSelected
                            border.color: theme.textPrimary
                            border.width: 1
                        }
                    }
                    
                    // MouseArea for dragging the divider - larger area for easier grabbing
                    MouseArea {
                        id: dividerMouseArea
                        x: dividerContainer.x - 20
                        y: dividerContainer.y
                        width: dividerContainer.width + 40
                        height: dividerContainer.height
                        cursorShape: Qt.SizeHorCursor
                        drag {
                            target: dividerContainer
                            axis: Drag.XAxis
                            minimumX: imageContainer.imageDisplayX
                            maximumX: imageContainer.imageDisplayX + imageContainer.imageDisplayWidth
                        }
                        onPositionChanged: {
                            if (drag.active) {
                                var relativeX = dividerContainer.x - imageContainer.imageDisplayX
                                var newPosition = relativeX / imageContainer.imageDisplayWidth
                                swipePosition = Math.max(0, Math.min(1, newPosition))
                            }
                        }
                    }
                    
                    // Update divider position when swipePosition changes (e.g., from code)
                    Binding {
                        target: dividerContainer
                        property: "x"
                        value: imageContainer.imageDisplayX + imageContainer.imageDisplayWidth * swipePosition
                        when: !dividerMouseArea.drag.active
                    }
                    
                    // Error messages
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: swipeMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: image1.status === Image.Error && image2.status === Image.Error
                    }
                }
            }
        }
    }
}
