import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    default property alias content: row.data

    implicitWidth: 780
    implicitHeight: DfmTheme.actionBarMinHeight

    Rectangle {
        anchors.fill: parent
        color: DfmTheme.layer1

        Rectangle {
            anchors.top: parent.top
            width: parent.width
            height: 1
            color: DfmTheme.borderOnLayer1
        }

        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: 1
            color: DfmTheme.borderOnLayer1
        }
    }

    RowLayout {
        id: row
        anchors.fill: parent
        anchors.leftMargin: DfmTheme.space500
        anchors.rightMargin: DfmTheme.space500
        anchors.topMargin: DfmTheme.space200
        anchors.bottomMargin: DfmTheme.space200
        spacing: DfmTheme.space300
    }
}
