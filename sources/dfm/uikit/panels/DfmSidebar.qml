import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    enum Side {
        Left,
        Right
    }

    property int side: DfmSidebar.Side.Left
    property int preferredWidth: DfmTheme.sidebarDefaultWidth

    default property alias content: contentArea.data
    property alias header: headerSlot.data
    property alias footer: footerSlot.data

    implicitWidth: preferredWidth
    implicitHeight: column.implicitHeight

    Rectangle {
        anchors.fill: parent
        color: DfmTheme.layer1
    }

    Rectangle {
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        anchors.right: parent.right
        width: 1
        color: DfmTheme.borderOnLayer1
        visible: root.side === DfmSidebar.Side.Left
    }

    Rectangle {
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        width: 1
        color: DfmTheme.borderOnLayer1
        visible: root.side === DfmSidebar.Side.Right
    }

    ColumnLayout {
        id: column
        anchors.fill: parent
        spacing: 0

        Item {
            id: headerSlot
            Layout.fillWidth: true
            implicitHeight: childrenRect.height
        }

        Item {
            id: contentArea
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: DfmTheme.borderOnLayer1
            visible: footerSlot.children.length > 0
        }

        Item {
            id: footerSlot
            Layout.fillWidth: true
            implicitHeight: childrenRect.height
        }
    }
}
