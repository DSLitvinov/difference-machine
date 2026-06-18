import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

Rectangle {
    id: gifViewer
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.background
    
    property string fileUrl: ""
    property string filePath: ""
    
    ScrollView {
        id: scrollView
        anchors.fill: parent
        anchors.margins: 10
        
        ScrollBar.vertical: ScrollBar {
            id: verticalScrollBar
            width: 10
            policy: ScrollBar.AsNeeded
            
            background: Rectangle {
                color: theme.scrollBarBackground
                width: 10
            }
            
            contentItem: Rectangle {
                implicitWidth: 8
                radius: theme.radiusMedium
                color: parent.pressed ? theme.scrollBarPressed : 
                       parent.hovered ? theme.scrollBarHover : theme.scrollBarNormal
                anchors.horizontalCenter: parent.horizontalCenter
            }
        }
        
        ScrollBar.horizontal: ScrollBar {
            id: horizontalScrollBar
            height: 10
            policy: ScrollBar.AsNeeded
            
            background: Rectangle {
                color: theme.scrollBarBackground
                height: 10
            }
            
            contentItem: Rectangle {
                implicitHeight: 8
                radius: theme.radiusMedium
                color: parent.pressed ? theme.scrollBarPressed : 
                       parent.hovered ? theme.scrollBarHover : theme.scrollBarNormal
                anchors.verticalCenter: parent.verticalCenter
            }
        }
        
        Item {
            id: gifContainer
            width: scrollView.width - 20
            height: scrollView.height - 20
            
            AnimatedImage {
                id: animatedImage
                source: gifViewer.fileUrl
                fillMode: Image.PreserveAspectFit
                anchors.fill: parent
                asynchronous: true
                playing: true
                
                onStatusChanged: { }
            }
            
            Loader {
                id: errorStubLoader
                anchors.centerIn: parent
                visible: animatedImage.status === Image.Error
                source: "../panels/StubTemplate.qml"
                onLoaded: {
                    item.theme = gifViewer.theme
                    item.titleText = qsTr("Failed to load GIF")
                    item.auxiliaryText = ""
                    item.iconSource = gifViewer.theme ? gifViewer.theme.getIconPath("file.svg") : ""
                }
            }
        }
    }
}