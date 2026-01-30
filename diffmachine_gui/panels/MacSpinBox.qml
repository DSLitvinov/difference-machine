import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * macOS Aqua-style spin box: rounded corners, +/- stepper buttons.
 * Used only for GC interval and reflog controls in Settings.
 */
SpinBox {
    id: macSpinBox

    property var theme: Theme {}

    implicitHeight: 28
    implicitWidth: 120
    leftPadding: 10
    rightPadding: 10
    topPadding: 4
    bottomPadding: 4
    font.pixelSize: theme ? theme.fontPixelSizeBody : 12
    editable: true

    contentItem: TextInput {
        text: macSpinBox.textFromValue(macSpinBox.value, macSpinBox.locale)
        font: macSpinBox.font
        color: theme ? theme.textPrimary : "#ffffff"
        selectionColor: theme ? theme.accent : "#007acc"
        selectedTextColor: theme ? theme.textSelected : "#ffffff"
        horizontalAlignment: Qt.AlignHCenter
        verticalAlignment: Qt.AlignVCenter
        readOnly: !macSpinBox.editable
        validator: macSpinBox.validator
        inputMethodHints: Qt.ImhFormattedNumbersOnly
        leftPadding: 6
        rightPadding: 6
        onTextChanged: {
            if (macSpinBox.editable) {
                var v = macSpinBox.valueFromText(text, macSpinBox.locale)
                if (!isNaN(v) && v !== macSpinBox.value) macSpinBox.value = v
            }
        }
    }

    background: Rectangle {
        implicitHeight: 28
        radius: theme ? theme.radiusMedium : 6
        border.width: 1
        border.color: macSpinBox.activeFocus ? (theme ? theme.accent : "#007acc") : (theme ? theme.divider : "#404040")
        color: theme ? theme.backgroundSecondary : "#252526"
    }

    up.indicator: Rectangle {
        implicitWidth: 24
        implicitHeight: 14
        radius: theme ? theme.radiusSmall : 3
        color: macSpinBox.up.pressed ? (theme ? theme.buttonSecondaryBgHover : "#3d3d40") : (macSpinBox.up.hovered ? (theme ? theme.backgroundHover : "#2a2a2a") : "transparent")
        border.width: 0

        Text {
            anchors.centerIn: parent
            text: "+"
            font.pixelSize: 14
            font.bold: true
            color: theme ? theme.textPrimary : "#ffffff"
        }
    }

    down.indicator: Rectangle {
        implicitWidth: 24
        implicitHeight: 14
        radius: theme ? theme.radiusSmall : 3
        color: macSpinBox.down.pressed ? (theme ? theme.buttonSecondaryBgHover : "#3d3d40") : (macSpinBox.down.hovered ? (theme ? theme.backgroundHover : "#2a2a2a") : "transparent")
        border.width: 0

        Text {
            anchors.centerIn: parent
            text: "-"
            font.pixelSize: 14
            font.bold: true
            color: theme ? theme.textPrimary : "#ffffff"
        }
    }
}
