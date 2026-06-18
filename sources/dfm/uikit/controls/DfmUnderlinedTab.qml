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
    property bool showCounter: false
    property string counterText: ""

    implicitHeight: 36
    padding: 0
    bottomPadding: DfmTheme.space400

    font.family: DfmTheme.fontFamily
    font.pixelSize: DfmTheme.fontSizeBody

    contentItem: Row {
        spacing: DfmTheme.space200
        anchors.bottom: parent.bottom

        Image {
            visible: control.showLeftIcon
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            source: control.leftIconSource
            fillMode: Image.PreserveAspectFit
            opacity: control.enabled ? 1.0 : 0.4
        }

        Text {
            text: control.text
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeBody
            font.weight: control.checked ? DfmTheme.fontWeightMedium : DfmTheme.fontWeightRegular
            color: control.enabled ? DfmTheme.contentPrimary : DfmTheme.contentDisabled
        }

        Text {
            visible: control.showCounter
            text: control.counterText
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeBody
            font.weight: DfmTheme.fontWeightMedium
            color: DfmTheme.contentSecondary
            opacity: control.enabled ? 1.0 : 0.4
        }

        Image {
            visible: control.showRightIcon
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            source: control.rightIconSource
            fillMode: Image.PreserveAspectFit
            opacity: control.enabled ? 1.0 : 0.4
        }
    }

    background: Item {
        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: control.checked ? 2 : 0
            color: DfmTheme.fillAccent
        }
    }
}
