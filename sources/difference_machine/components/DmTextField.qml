import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

TextField {
    id: control

    property var theme: Theme {}

    implicitHeight: theme.controlHeight
    font.family: theme.fontFamilyUI
    font.pixelSize: theme.fontPixelSizeBody
    color: theme.textPrimary
    placeholderTextColor: theme.textPlaceholder
    selectionColor: theme.backgroundSelectedAccent
    selectedTextColor: theme.textSelected
    leftPadding: theme.inputPaddingH
    rightPadding: theme.inputPaddingH
    topPadding: theme.inputPaddingV
    bottomPadding: theme.inputPaddingV
    verticalAlignment: TextInput.AlignVCenter

    background: Rectangle {
        radius: theme.radiusMedium
        color: theme.inputBackground
        border.width: control.activeFocus ? 1 : 1
        border.color: {
            if (control.activeFocus) return theme.inputBorderFocus
            if (control.hovered) return theme.inputBorderHover
            return theme.inputBorder
        }
    }
}
