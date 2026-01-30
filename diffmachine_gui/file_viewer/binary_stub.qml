import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

Rectangle {
    id: binaryStub

    // Theme instance
    property var theme: Theme {}
    property string filePath: ""
    property bool isBlendFile: filePath && filePath.toLowerCase().endsWith(".blend")

    color: theme.background

    Column {
        anchors.centerIn: parent
        spacing: 12

        Image {
            anchors.horizontalCenter: parent.horizontalCenter
            width: 36
            height: 36
            fillMode: Image.PreserveAspectFit
            source: isBlendFile ? theme.getIconPath("blender.svg") : ""
            visible: isBlendFile

            MouseArea {
                anchors.fill: parent
                hoverEnabled: true
                ToolTip.visible: containsMouse
                ToolTip.text: qsTr("Это файлы редактора Blender")
            }
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: qsTr("Binary file")
            color: theme.textSecondary
            font.pixelSize: theme.fontPixelSizeTitle
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: qsTr("Please open to external editor")
            color: theme.textDisabled
            font.pixelSize: theme.fontPixelSizeBody
            horizontalAlignment: Text.AlignHCenter
        }

        Text {
            anchors.horizontalCenter: parent.horizontalCenter
            text: filePath
            color: theme.textDisabled
            font.pixelSize: theme.fontPixelSizeSmall
            font.family: theme.fontMonospace
            elide: Text.ElideMiddle
            width: Math.min(parent.width, 560)
            horizontalAlignment: Text.AlignHCenter
        }
    }
}
