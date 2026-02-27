import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import "../panels"

Rectangle {
    id: metadataPanel
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.metadataPanelBackground
    height: fileViewer && fileViewer.filePath ? contentColumn.height + 20 : 0
    visible: fileViewer && fileViewer.filePath
    
    property var fileViewer: null
    property bool isBlendFile: fileViewer && fileViewer.filePath && fileViewer.filePath.toLowerCase().endsWith(".blend")
    property bool hasBlenderPath: fileViewer && fileViewer.blenderPath && fileViewer.blenderPath.length > 0
    
    // Top border
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
            
            // File name row
            Row {
                spacing: 10
                Text {
                    text: qsTr("Name:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    width: 80
                }
                Text {
                    text: fileViewer ? fileViewer.fileName : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    elide: Text.ElideMiddle
                }
            }
            
            // File path row
            Row {
                spacing: 10
                Text {
                    text: qsTr("Path:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    width: 80
                }
                Text {
                    text: fileViewer ? fileViewer.filePath : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    elide: Text.ElideMiddle
                }
            }
            
            // Size and dates row (placeholder "-" uses theme.textPlaceholder)
            Row {
                spacing: 20
                Text {
                    text: qsTr("Size:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }
                Text {
                    text: (fileViewer && fileViewer.fileSize) ? fileViewer.fileSize : "-"
                    color: (fileViewer && fileViewer.fileSize) ? theme.textMonospace : theme.textPlaceholder
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }
                
                Text {
                    text: qsTr("Modified:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }
                Text {
                    text: (fileViewer && fileViewer.modifiedDate) ? fileViewer.modifiedDate : "-"
                    color: (fileViewer && fileViewer.modifiedDate) ? theme.textMonospace : theme.textPlaceholder
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }
                
                Text {
                    text: qsTr("Created:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                }
                Text {
                    text: (fileViewer && fileViewer.createdDate) ? fileViewer.createdDate : "-"
                    color: (fileViewer && fileViewer.createdDate) ? theme.textMonospace : theme.textPlaceholder
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                }
            }
            
            // Type-specific metadata row
            Row {
                spacing: 20
                visible: fileViewer && (fileViewer.mimeType || fileViewer.fileLanguage || fileViewer.lineCount > 0 || fileViewer.encoding || fileViewer.imageWidth > 0)
                
                Text {
                    text: qsTr("MIME:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    visible: fileViewer && fileViewer.mimeType && fileViewer.mimeType !== "unknown"
                }
                Text {
                    text: fileViewer && fileViewer.mimeType ? fileViewer.mimeType : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    visible: fileViewer && fileViewer.mimeType && fileViewer.mimeType !== "unknown"
                }
                
                // For text files
                Text {
                    text: qsTr("Language:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    visible: fileViewer && fileViewer.fileLanguage && fileViewer.fileLanguage !== "text"
                }
                Text {
                    text: fileViewer && fileViewer.fileLanguage ? fileViewer.fileLanguage : ""
                    color: theme.accentLanguage
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    visible: fileViewer && fileViewer.fileLanguage && fileViewer.fileLanguage !== "text"
                }
                
                Text {
                    text: qsTr("Lines:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    visible: fileViewer && fileViewer.lineCount > 0
                }
                Text {
                    text: fileViewer ? fileViewer.lineCount.toString() : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    visible: fileViewer && fileViewer.lineCount > 0
                }
                
                Text {
                    text: qsTr("Encoding:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    visible: fileViewer && fileViewer.encoding
                }
                Text {
                    text: fileViewer ? fileViewer.encoding : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    visible: fileViewer && fileViewer.encoding
                }
                
                // For images
                Text {
                    text: qsTr("Resolution:")
                    color: theme.textTertiary
                    font.pixelSize: theme.fontPixelSizeSmall
                    visible: fileViewer && fileViewer.imageWidth > 0
                }
                Text {
                    text: fileViewer && fileViewer.imageWidth > 0 ? 
                          fileViewer.imageWidth + " × " + fileViewer.imageHeight : ""
                    color: theme.textMonospace
                    font.pixelSize: theme.fontPixelSizeSmall
                    font.family: theme.fontMonospace
                    visible: fileViewer && fileViewer.imageWidth > 0
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
                    id: openBlenderButton
                    text: qsTr("Open in Blender")
                    enabled: hasBlenderPath
                    onClicked: {
                        if (fileViewer && fileViewer.openInBlender) {
                            fileViewer.openInBlender()
                        }
                    }
                    ToolTip.visible: openBlenderButton.hovered
                    ToolTip.text: hasBlenderPath ? fileViewer.blenderPath : qsTr("Set Blender path in ~/.dfm/setup.cfg")
                }
            }
    }
}