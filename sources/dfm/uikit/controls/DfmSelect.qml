import QtQuick 6.6
import QtQuick.Controls 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property string labelText: ""
    property string helperText: ""
    property string placeholderText: ""
    property string valueText: ""
    property bool required: false
    property bool showLabel: true
    property bool showHelper: true
    property bool hasError: false
    property bool enabled: true
    property bool resettable: true
    property url leftIconSource: ""
    property url chevronIconSource: ""
    property url clearIconSource: ""
    property bool showLeftIcon: leftIconSource !== ""

    signal cleared()
    signal activated()

    implicitWidth: 300
    implicitHeight: column.implicitHeight

    readonly property bool hasValue: valueText.length > 0

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
                if (selectMouseArea.containsPress || selectMouseArea.pressed)
                    return DfmTheme.fillAccent
                if (selectHover.hovered)
                    return DfmTheme.fillAccentHover
                return DfmTheme.borderControl
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

                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width - clearBtn.width - chevron.width - DfmTheme.space200 * 3
                                     - (root.showLeftIcon ? DfmTheme.iconSizeSm + DfmTheme.space200 : 0)
                    text: root.hasValue ? root.valueText : root.placeholderText
                    elide: Text.ElideRight
                    font.family: DfmTheme.fontFamily
                    font.pixelSize: DfmTheme.fontSizeBody
                    color: root.hasValue ? DfmTheme.contentPrimary : DfmTheme.contentSecondary
                }

                Item {
                    id: clearBtn
                    width: root.resettable && root.hasValue ? 24 : 0
                    height: parent.height

                    Image {
                        anchors.centerIn: parent
                        visible: root.resettable && root.hasValue && root.enabled
                        width: DfmTheme.iconSizeSm
                        height: DfmTheme.iconSizeSm
                        source: root.clearIconSource
                        fillMode: Image.PreserveAspectFit
                    }

                    MouseArea {
                        anchors.fill: parent
                        visible: root.resettable && root.hasValue && root.enabled
                        onClicked: root.cleared()
                    }
                }

                Image {
                    id: chevron
                    anchors.verticalCenter: parent.verticalCenter
                    width: DfmTheme.iconSizeMd
                    height: DfmTheme.iconSizeMd
                    source: root.chevronIconSource
                    fillMode: Image.PreserveAspectFit
                }
            }

            MouseArea {
                id: selectMouseArea
                anchors.fill: parent
                enabled: root.enabled
                onClicked: root.activated()
            }

            HoverHandler {
                id: selectHover
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
