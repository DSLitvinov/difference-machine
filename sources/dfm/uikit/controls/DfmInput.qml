import QtQuick 6.6
import QtQuick.Controls 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property string labelText: ""
    property string helperText: ""
    property string placeholderText: ""
    property bool required: false
    property bool showLabel: true
    property bool showHelper: true
    property bool hasError: false
    property bool enabled: true
    property bool readOnly: false
    property url leftIconSource: ""
    property url rightIconSource: ""
    property bool showLeftIcon: leftIconSource !== ""
    property bool showRightIcon: rightIconSource !== ""
    property alias text: field.text
    property alias fieldFocus: field.activeFocus

    implicitWidth: 300
    implicitHeight: column.implicitHeight

    readonly property bool hasValue: text.length > 0

    Column {
        id: column
        width: parent.width
        spacing: DfmTheme.space200

        Row {
            visible: root.showLabel && root.labelText !== ""
            spacing: 0

            Text {
                text: root.labelText
                font.family: DfmTheme.fontFamily
                font.pixelSize: DfmTheme.fontSizeBody
                color: DfmTheme.contentPrimary
            }

            Text {
                visible: root.required
                text: "*"
                font.family: DfmTheme.fontFamily
                font.pixelSize: DfmTheme.fontSizeBody
                color: DfmTheme.contentNegative
            }
        }

        Rectangle {
            id: chrome
            width: parent.width
            height: DfmTheme.controlHeight
            radius: DfmTheme.radius200
            color: root.enabled ? DfmTheme.fillDefault : DfmTheme.fillDisabled
            border.width: 1
            border.color: {
                if (!root.enabled)
                    return DfmTheme.borderControlDefault
                if (root.hasError)
                    return DfmTheme.contentNegative
                if (field.activeFocus)
                    return DfmTheme.fillAccent
                if (fieldHover.hovered)
                    return DfmTheme.fillAccentHover
                return DfmTheme.borderControlDefault
            }

            Row {
                anchors.fill: parent
                anchors.leftMargin: DfmTheme.space300
                anchors.rightMargin: DfmTheme.space300
                spacing: DfmTheme.space200

                Image {
                    visible: root.showLeftIcon
                    anchors.verticalCenter: parent.verticalCenter
                    width: DfmTheme.iconSizeSm
                    height: DfmTheme.iconSizeSm
                    source: root.leftIconSource
                    fillMode: Image.PreserveAspectFit
                }

                TextField {
                    id: field
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width - (root.showLeftIcon ? DfmTheme.iconSizeSm + DfmTheme.space200 : 0)
                               - (root.showRightIcon ? DfmTheme.iconSizeMd + DfmTheme.space200 : 0)
                    enabled: root.enabled
                    readOnly: root.readOnly
                    placeholderText: root.placeholderText
                    font.family: DfmTheme.fontFamily
                    font.pixelSize: DfmTheme.fontSizeBody
                    color: root.enabled ? DfmTheme.contentPrimary : DfmTheme.contentDisabled
                    placeholderTextColor: DfmTheme.contentSecondary
                    background: null
                    selectByMouse: true
                }

                Image {
                    visible: root.showRightIcon
                    anchors.verticalCenter: parent.verticalCenter
                    width: DfmTheme.iconSizeMd
                    height: DfmTheme.iconSizeMd
                    source: root.rightIconSource
                    fillMode: Image.PreserveAspectFit
                }
            }

            HoverHandler {
                id: fieldHover
                enabled: root.enabled
            }
        }

        Text {
            visible: root.showHelper && root.helperText !== ""
            width: parent.width
            text: root.helperText
            wrapMode: Text.WordWrap
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeBody
            color: root.hasError ? DfmTheme.contentNegative : DfmTheme.contentSecondary
        }
    }
}
