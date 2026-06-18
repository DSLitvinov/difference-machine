import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

Menu {
    id: root

    property var theme: Theme {}

    delegate: MenuItem {
        id: menuItem
        implicitHeight: root.theme.contextMenuItemHeight
        leftPadding: root.theme.contextMenuTextLeftMargin
        rightPadding: root.theme.contextMenuTextLeftMargin
        topPadding: root.theme.comboItemPaddingV
        bottomPadding: root.theme.comboItemPaddingV
        implicitWidth: contentItem.implicitWidth + leftPadding + rightPadding
        contentItem: Text {
            text: menuItem.text
            color: menuItem.enabled ? root.theme.textPrimary : root.theme.textDisabled
            font.family: root.theme.fontFamilyUI
            font.pixelSize: root.theme.contextMenuFontSize
            verticalAlignment: Text.AlignVCenter
            elide: Text.ElideRight
        }
        background: Rectangle {
            radius: root.theme.radiusSmall
            color: menuItem.highlighted ? root.theme.contextMenuHoverBg : "transparent"
        }
    }

    padding: root.theme.contextMenuPadding
    palette.window: root.theme.contextMenuBackground
    palette.windowText: root.theme.textPrimary
    palette.highlight: root.theme.contextMenuHoverBg
    palette.highlightedText: root.theme.textPrimary
    palette.text: root.theme.textPrimary
    palette.button: root.theme.contextMenuBackground
    palette.buttonText: root.theme.textPrimary
    palette.base: root.theme.contextMenuBackground
    palette.mid: root.theme.divider

    background: Rectangle {
        color: root.theme.contextMenuBackground
        border.color: root.theme.contextMenuBorderColor
        border.width: 1
        radius: root.theme.contextMenuRadius
    }
}
