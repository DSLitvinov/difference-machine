import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import ".."

Rectangle {
    id: twoUpMode
    color: theme.background
    
    property var theme: Theme {}
    property string image1Url: ""
    property string image2Url: ""
    property string image1Label: "Deleted"
    property string image2Label: "Added"
    property int image1Width: 0
    property int image1Height: 0
    property int image2Width: 0
    property int image2Height: 0
    property int image1Size: 0  // in bytes
    property int image2Size: 0  // in bytes
    
    function formatFileSize(bytes) {
        if (bytes === 0) return "0 " + qsTr("B")
        var units = [qsTr("B"), qsTr("KB"), qsTr("MB"), qsTr("GB")]
        var size = bytes
        var unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024.0
            unitIndex++
        }
        return size.toFixed(2) + " " + units[unitIndex]
    }
    
    function formatDiffSize(size1, size2) {
        var diff = size2 - size1
        var percent = size1 > 0 ? ((size2 / size1) * 100).toFixed(0) : "100"
        var sign = diff >= 0 ? "+" : ""
        return qsTr("Diff:") + " " + sign + formatFileSize(diff) + " (" + percent + "%)"
    }
    
    // Check if we have both images or just one
    // image1Url is old/deleted (commitImageUrl), image2Url is new/added (currentImageUrl)
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
                        
                        onStatusChanged: {
                            if (status === Image.Ready) {
                                image2Width = sourceSize.width
                                image2Height = sourceSize.height
                            }
                        }
                    }
                    
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: twoUpMode.theme
                        titleText: qsTr("Failed to load image")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                        visible: singleImage.status === Image.Error
                    }
                }
            }
            
            // Metadata
            Text {
                Layout.fillWidth: true
                text: {
                    var parts = []
                    if (image2Width > 0 && image2Height > 0) {
                        parts.push(qsTr("W:") + " " + image2Width + "px")
                        parts.push(qsTr("H:") + " " + image2Height + "px")
                    }
                    if (image2Size > 0) {
                        parts.push(qsTr("Size:") + " " + formatFileSize(image2Size))
                    }
                    return parts.length > 0 ? parts.join(" | ") : ""
                }
                color: theme.textSecondary
                font.pixelSize: theme.fontPixelSizeCaption
                horizontalAlignment: Text.AlignHCenter
                visible: text.length > 0
            }
        }
        
        // Two images comparison view (ONLY show when BOTH images exist)
        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 12
            visible: hasBothImages
            
            // Left image (Deleted) - ONLY visible when hasBothImages
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 4
                visible: hasBothImages
                
                // Label
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    color: theme.tabBarBackground
                    
                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 10
                        anchors.verticalCenter: parent.verticalCenter
                        text: qsTr(image1Label)
                        color: theme.diffRemoved
                        font.pixelSize: theme.fontPixelSizeSmall
                        font.bold: true
                    }
                }
                
                // Image
                ScrollView {
                    id: scrollView1
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.horizontal.policy: ScrollBar.AsNeeded
                    
                    Item {
                        width: scrollView1.width
                        height: scrollView1.height
                        
                        Image {
                            id: image1
                            source: image1Url
                            fillMode: Image.PreserveAspectFit
                            width: parent.width
                            height: parent.height
                            asynchronous: true
                            
                            onStatusChanged: {
                                if (status === Image.Ready) {
                                    image1Width = sourceSize.width
                                    image1Height = sourceSize.height
                                }
                            }
                        }
                        
                        StubTemplate {
                            anchors.centerIn: parent
                            theme: twoUpMode.theme
                            titleText: qsTr("Failed to load image")
                            auxiliaryText: ""
                            iconSource: theme ? theme.getIconPath("file.svg") : ""
                            visible: image1.status === Image.Error
                        }
                    }
                }
                
                // Metadata
                Text {
                    Layout.fillWidth: true
                    text: {
                        var parts = []
                        if (image1Width > 0 && image1Height > 0) {
                            parts.push(qsTr("W:") + " " + image1Width + "px")
                            parts.push(qsTr("H:") + " " + image1Height + "px")
                        }
                        if (image1Size > 0) {
                            parts.push(qsTr("Size:") + " " + formatFileSize(image1Size))
                        }
                        return parts.length > 0 ? parts.join(" | ") : ""
                    }
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeCaption
                    horizontalAlignment: Text.AlignHCenter
                    visible: text.length > 0
                }
            }
            
            // Right image (Added) - ONLY visible when hasBothImages
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 4
                visible: hasBothImages
                
                // Label
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    color: theme.tabBarBackground
                    
                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 10
                        anchors.verticalCenter: parent.verticalCenter
                        text: qsTr(image2Label)
                        color: theme.diffAdded
                        font.pixelSize: theme.fontPixelSizeSmall
                        font.bold: true
                    }
                }
                
                // Image
                ScrollView {
                    id: scrollView2
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    ScrollBar.horizontal.policy: ScrollBar.AsNeeded
                    
                    Item {
                        width: scrollView2.width
                        height: scrollView2.height
                        
                        Image {
                            id: image2
                            source: image2Url
                            fillMode: Image.PreserveAspectFit
                            width: parent.width
                            height: parent.height
                            asynchronous: true
                            
                            onStatusChanged: {
                                if (status === Image.Ready) {
                                    image2Width = sourceSize.width
                                    image2Height = sourceSize.height
                                }
                            }
                        }
                        
                        StubTemplate {
                            anchors.centerIn: parent
                            theme: twoUpMode.theme
                            titleText: qsTr("Failed to load image")
                            auxiliaryText: ""
                            iconSource: theme ? theme.getIconPath("file.svg") : ""
                            visible: image2.status === Image.Error
                        }
                    }
                }
                
                // Metadata
                Text {
                    Layout.fillWidth: true
                    text: {
                        var parts = []
                        if (image2Width > 0 && image2Height > 0) {
                            parts.push(qsTr("W:") + " " + image2Width + "px")
                            parts.push(qsTr("H:") + " " + image2Height + "px")
                        }
                        if (image2Size > 0) {
                            parts.push(qsTr("Size:") + " " + formatFileSize(image2Size))
                        }
                        return parts.length > 0 ? parts.join(" | ") : ""
                    }
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeCaption
                    horizontalAlignment: Text.AlignHCenter
                    visible: text.length > 0
                }
            }
        }
        
        // Diff summary (only show when both images exist)
        Text {
            Layout.fillWidth: true
            text: (hasBothImages && (image1Size > 0 || image2Size > 0)) ? formatDiffSize(image1Size, image2Size) : ""
            color: theme.diffAdded
            font.pixelSize: theme.fontPixelSizeSmall
            horizontalAlignment: Text.AlignHCenter
            visible: text.length > 0
        }
    }
}
