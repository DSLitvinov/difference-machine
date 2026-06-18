import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

Button {
    id: control

    property var theme: Theme {}
    // "primary" | "secondary" | "ghost" | "icon" | "toggle"
    property string buttonStyle: "primary"
    property bool fillWidth: false

    checkable: buttonStyle === "toggle"

    implicitHeight: buttonStyle === "icon" ? theme.controlHeightSmall : theme.controlHeight
    implicitWidth: fillWidth
        ? (parent ? parent.width : implicitHeight)
        : (buttonStyle === "icon"
            ? theme.controlHeightSmall
            : Math.max(contentItem.implicitWidth + leftPadding + rightPadding, theme.buttonMinWidth))

    topPadding: buttonStyle === "icon" ? theme.buttonPaddingIcon : theme.buttonPaddingV
    bottomPadding: topPadding
    leftPadding: buttonStyle === "icon" ? theme.buttonPaddingIcon : theme.buttonPaddingH
    rightPadding: leftPadding

    font.family: theme.fontFamilyUI
    font.pixelSize: theme.fontPixelSizeBody

    contentItem: Text {
        text: control.text
        font: control.font
        color: {
            if (!control.enabled)
                return theme.textDisabled
            if (control.buttonStyle === "toggle" && control.checked)
                return theme.accent
            if (control.buttonStyle === "primary")
                return theme.buttonPrimaryText
            if (control.buttonStyle === "ghost" || control.buttonStyle === "toggle")
                return control.down || control.hovered || control.checked ? theme.buttonGhostTextHover : theme.buttonGhostText
            return theme.buttonSecondaryText
        }
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
    }

    background: Rectangle {
        radius: theme.radiusMedium
        color: {
            if (!control.enabled) {
                if (control.buttonStyle === "primary")
                    return Qt.rgba(theme.buttonPrimaryBg.r, theme.buttonPrimaryBg.g, theme.buttonPrimaryBg.b, 0.4)
                return "transparent"
            }
            if (control.buttonStyle === "toggle" && control.checked)
                return theme.tabBarActiveBackground
            if (control.buttonStyle === "primary") {
                if (control.pressed) return theme.buttonPrimaryBgPressed
                if (control.hovered) return theme.buttonPrimaryBgHover
                return theme.buttonPrimaryBg
            }
            if (control.buttonStyle === "ghost" || control.buttonStyle === "icon" || control.buttonStyle === "toggle") {
                if (control.pressed || control.hovered) return theme.buttonGhostBgHover
                return theme.buttonGhostBg
            }
            if (control.pressed || control.hovered) return theme.buttonSecondaryBgHover
            return theme.buttonSecondaryBg
        }
        border.width: control.buttonStyle === "secondary" ? 1 : (control.buttonStyle === "toggle" && control.checked ? 1 : 0)
        border.color: control.buttonStyle === "toggle" && control.checked ? theme.accent : theme.buttonSecondaryBorder
    }
}
