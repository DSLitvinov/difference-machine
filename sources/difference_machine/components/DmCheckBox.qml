import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

CheckBox {
    id: control

    property var theme: Theme {}

    spacing: theme.checkboxSpacing
    leftPadding: 0
    rightPadding: 0
    topPadding: 2
    bottomPadding: 2

    indicator: Rectangle {
        implicitWidth: theme.checkboxSize
        implicitHeight: theme.checkboxSize
        x: control.leftPadding
        y: control.topPadding + (control.availableHeight - height) / 2
        radius: theme.radiusSmall
        color: control.checkState === Qt.Checked || control.checkState === Qt.PartiallyChecked
              ? theme.checkboxChecked : theme.checkboxBg
        border.color: control.checkState === Qt.Checked || control.checkState === Qt.PartiallyChecked
                      ? theme.checkboxChecked : theme.checkboxBorder
        border.width: 1

        Text {
            anchors.centerIn: parent
            visible: control.checkState === Qt.Checked
            text: "✓"
            color: theme.buttonPrimaryText
            font.pixelSize: 9
            font.bold: true
        }

        Rectangle {
            anchors.centerIn: parent
            visible: control.checkState === Qt.PartiallyChecked
            width: 7
            height: 2
            radius: 1
            color: theme.buttonPrimaryText
        }
    }

    contentItem: Text {
        leftPadding: control.indicator.width + control.spacing
        text: control.text
        font.family: theme.fontFamilyUI
        font.pixelSize: theme.fontPixelSizeBody
        color: control.enabled ? theme.textPrimary : theme.textDisabled
        verticalAlignment: Text.AlignVCenter
    }
}
