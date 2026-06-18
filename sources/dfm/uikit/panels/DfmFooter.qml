import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    default property alias content: row.data

    implicitWidth: 780
    implicitHeight: DfmTheme.footerHeight

    Rectangle {
        anchors.fill: parent
        color: DfmTheme.layer1

        Rectangle {
            anchors.top: parent.top
            width: parent.width
            height: 1
            color: DfmTheme.borderOnLayer1Alt
        }

        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: 1
            color: DfmTheme.borderOnLayer1Alt
        }
    }

    RowLayout {
        id: row
        anchors.fill: parent
        anchors.leftMargin: DfmTheme.space500
        anchors.rightMargin: DfmTheme.space500
        anchors.topMargin: DfmTheme.radiusMd
        anchors.bottomMargin: DfmTheme.radiusMd
        spacing: DfmTheme.space600
    }
}
