import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

ToolTip {
    id: control

    property var theme: Theme {}

    delay: 500
    padding: 6

    palette.window: theme.contextMenuBackground
    palette.windowText: theme.textPrimary
    palette.text: theme.textPrimary

    background: Rectangle {
        color: control.theme.contextMenuBackground
        border.color: control.theme.contextMenuBorderColor
        border.width: 1
        radius: control.theme.radiusSmall
    }

    contentItem: Text {
        text: control.text
        color: control.theme.textPrimary
        font.family: control.theme.fontFamilyUI
        font.pixelSize: control.theme.fontPixelSizeSmall
        wrapMode: Text.Wrap
    }
}
