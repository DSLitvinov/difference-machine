import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

Rectangle {
    id: root

    property var theme: Theme {}
    property alias text: field.text
    property alias placeholderText: field.placeholderText
    property alias field: field

    implicitHeight: theme.controlHeight
    color: theme.inputBackground
    radius: theme.radiusMedium
    border.width: 1
    border.color: field.activeFocus ? theme.inputBorderFocus : (searchMouse.containsMouse ? theme.inputBorderHover : theme.inputBorder)

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: theme.searchPaddingH
        anchors.rightMargin: theme.searchClearInset
        spacing: theme.searchIconGap

        Text {
            text: "⌕"
            color: theme.textTertiary
            font.pixelSize: theme.fontPixelSizeBody
            Layout.alignment: Qt.AlignVCenter
        }

        TextField {
            id: field
            Layout.fillWidth: true
            Layout.fillHeight: true
            background: Item {}
            color: theme.textPrimary
            placeholderTextColor: theme.textPlaceholder
            font.family: theme.fontFamilyUI
            font.pixelSize: theme.fontPixelSizeBody
            verticalAlignment: TextInput.AlignVCenter
            leftPadding: 0
            rightPadding: 0
            topPadding: theme.inputPaddingV
            bottomPadding: theme.inputPaddingV
        }

        Text {
            visible: field.text.length > 0
            Layout.preferredWidth: 16
            Layout.alignment: Qt.AlignVCenter
            text: "✕"
            color: theme.textPlaceholder
            font.pixelSize: theme.fontPixelSizeSmall
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter

            MouseArea {
                anchors.fill: parent
                anchors.margins: -theme.searchClearInset
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    field.text = ""
                    field.focus = false
                }
            }
        }
    }

    MouseArea {
        id: searchMouse
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.NoButton
    }
}
