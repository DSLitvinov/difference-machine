import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property string text: ""
    property url iconSource: ""
    property int iconSize: DfmTheme.iconSizeMd
    property int spacing: DfmTheme.space100
    property color textColor: DfmTheme.contentPrimary

    implicitWidth: row.implicitWidth
    implicitHeight: Math.max(iconSize, label.implicitHeight)

    RowLayout {
        id: row
        anchors.fill: parent
        spacing: root.spacing

        Image {
            visible: root.iconSource !== ""
            Layout.preferredWidth: root.iconSize
            Layout.preferredHeight: root.iconSize
            source: root.iconSource
            fillMode: Image.PreserveAspectFit
            smooth: true
        }

        Text {
            id: label
            text: root.text
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeBody
            font.weight: DfmTheme.fontWeightRegular
            color: root.textColor
            elide: Text.ElideRight
        }
    }
}
