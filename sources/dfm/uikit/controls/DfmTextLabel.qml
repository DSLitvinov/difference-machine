import QtQuick 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property string text: ""
    property int pixelSize: DfmTheme.fontSizeBody
    property int fontWeight: DfmTheme.fontWeightRegular
    property color textColor: DfmTheme.contentPrimary
    property int horizontalPadding: DfmTheme.space100

    implicitWidth: label.implicitWidth + horizontalPadding * 2
    implicitHeight: DfmTheme.lineHeightBody

    Text {
        id: label
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: root.horizontalPadding
        text: root.text
        font.family: DfmTheme.fontFamily
        font.pixelSize: root.pixelSize
        font.weight: root.fontWeight
        color: root.textColor
        elide: Text.ElideRight
    }
}
