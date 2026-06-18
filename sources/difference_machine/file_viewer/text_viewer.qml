import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import QtQuick.Window 6.6
import resources.styles 1.0

Rectangle {
    id: textViewer
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.background
    
    // Property to receive fileViewer from parent - use direct bindings
    property var fileViewer: null
    
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
        
        Row {
            id: contentRow
            spacing: 10
            
            // Line numbers column
            Column {
                id: lineNumbersColumn
                width: 60
                spacing: 0
                
                Repeater {
                    model: {
                        if (!fileViewer || !fileViewer.fileContent) return 0
                        var lines = fileViewer.fileContent.split('\n')
                        return lines.length > 0 ? lines.length : 1
                    }
                    
                    Rectangle {
                        width: lineNumbersColumn.width
                        height: 20
                        color: "transparent"
                        
                        Text {
                            text: (index + 1).toString()
                            color: theme.textDisabled
                            font.pixelSize: theme.fontPixelSizeBody
                            font.family: theme.fontMonospace
                            anchors.right: parent.right
                            anchors.rightMargin: 10
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }
            }
            
            // Text content column with syntax highlighting
            Flickable {
                id: flickable
                width: scrollView.width - lineNumbersColumn.width - 30
                height: Math.max(scrollView.height, contentText.height)
                contentWidth: contentText.width
                contentHeight: contentText.height
                clip: true
                
                TextEdit {
                    id: contentText
                    width: flickable.width
                    // Direct binding to fileViewer properties - they update automatically via notify signal
                    text: {
                        if (!fileViewer) return ""
                        var html = fileViewer.highlightedHtml || ""
                        var content = fileViewer.fileContent || ""
                        if (html.length > 0) {
                            return html
                        } else if (content.length > 0) {
                            return content
                        }
                        return ""
                    }
                    textFormat: {
                        if (!fileViewer) return TextEdit.PlainText
                        var html = fileViewer.highlightedHtml || ""
                        return (html.length > 0) ? TextEdit.RichText : TextEdit.PlainText
                    }
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                    font.family: theme.fontMonospace
                    wrapMode: TextEdit.NoWrap
                    readOnly: true
                    selectByMouse: true
                }
            }
        }
    }
}