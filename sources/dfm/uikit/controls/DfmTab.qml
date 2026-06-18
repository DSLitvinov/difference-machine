import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Templates 6.6 as T
import Dfm.UiKit 1.0

T.TabButton {
    id: control

    property url leftIconSource: ""
    property url rightIconSource: ""
    property bool showLeftIcon: leftIconSource !== ""
    property bool showRightIcon: rightIconSource !== ""

    implicitHeight: 28
    padding: DfmTheme.space100
    leftPadding: DfmTheme.space300
    rightPadding: DfmTheme.space300
    spacing: DfmTheme.space200

    font.family: DfmTheme.fontFamily
    font.pixelSize: DfmTheme.fontSizeBody
    font.weight: DfmTheme.fontWeightMedium

    contentItem: Row {
        spacing: control.spacing
        anchors.centerIn: parent

        Image {
            visible: control.showLeftIcon
            width: DfmTheme.iconSizeSm
            height: DfmTheme.iconSizeSm
            source: control.leftIconSource
            fillMode: Image.PreserveAspectFit
        }

        Text {
            text: control.text
            font: control.font
            color: control.checked ? DfmTheme.contentSecondary : DfmTheme.contentSecondary
            opacity: control.enabled ? 1.0 : 0.4
        }

        Image {
            visible: control.showRightIcon
            width: DfmTheme.iconSizeSm
            height: DfmTheme.iconSizeSm
            source: control.rightIconSource
            fillMode: Image.PreserveAspectFit
        }
    }

    background: Rectangle {
        radius: control.checked ? DfmTheme.radius200 : DfmTheme.radiusSm
        color: control.checked ? DfmTheme.layer2 : "transparent"
        border.width: 0
    }
}
