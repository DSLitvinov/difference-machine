import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

TextArea {
    id: control

    property var theme: Theme {}

    font.family: theme.fontFamilyUI
    font.pixelSize: theme.fontPixelSizeBody
    color: theme.textPrimary
    placeholderTextColor: theme.textPlaceholder
    selectionColor: theme.backgroundSelectedAccent
    selectedTextColor: theme.textSelected
    leftPadding: theme.textareaPaddingH
    rightPadding: theme.textareaPaddingH
    topPadding: theme.textareaPaddingV
    bottomPadding: theme.textareaPaddingV

    background: Rectangle {
        radius: theme.radiusMedium
        color: theme.inputBackground
        border.width: 1
        border.color: {
            if (control.activeFocus) return theme.inputBorderFocus
            if (control.hovered) return theme.inputBorderHover
            return theme.inputBorder
        }
    }
}
