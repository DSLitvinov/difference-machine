import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property int depth: 0
    property bool isFolder: true
    property bool expanded: false
    property string title: ""
    property string badgeText: ""
    property url iconSource: ""
    property url chevronIconSource: ""
    property bool showTreeLines: depth > 0

    signal clicked()

    implicitWidth: row.implicitWidth
    implicitHeight: DfmTheme.sidebarItemHeight

    RowLayout {
        id: row
        anchors.left: parent.left
        anchors.leftMargin: root.depth * DfmTheme.space400 + DfmTheme.space200
        spacing: 0

        Item {
            visible: root.showTreeLines
            Layout.preferredWidth: DfmTheme.space400
            Layout.preferredHeight: parent.height

            Rectangle {
                x: DfmTheme.space400 / 2
                width: 1
                height: parent.height / 2
                color: DfmTheme.borderOnLayer1
            }

            Rectangle {
                x: DfmTheme.space400 / 2
                y: parent.height / 2
                width: DfmTheme.space200
                height: 1
                color: DfmTheme.borderOnLayer1
            }
        }

        DfmSidebarItem {
            Layout.fillWidth: true
            text: root.title
            iconSource: root.iconSource
            iconSize: DfmTheme.iconSizeSm
            badgeText: root.badgeText
            showBadge: root.badgeText !== ""
            chevronIconSource: root.isFolder ? root.chevronIconSource : ""
            showChevron: root.isFolder && root.chevronIconSource !== ""
            onClicked: root.clicked()
        }
    }
}
