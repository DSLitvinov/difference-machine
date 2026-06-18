import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property string title: ""
    property bool collapsed: false
    property url chevronIconSource: ""

    default property alias content: contentSlot.data

    implicitWidth: 472
    implicitHeight: column.implicitHeight + DfmTheme.space300 * 2

    signal toggled(bool collapsed)

    Rectangle {
        anchors.fill: parent
        radius: DfmTheme.radius200
        color: DfmTheme.layer2
        border.width: 1
        border.color: DfmTheme.borderOnLayer2
    }

    ColumnLayout {
        id: column
        anchors.fill: parent
        anchors.margins: DfmTheme.space300
        spacing: root.collapsed ? 0 : DfmTheme.space200

        RowLayout {
            Layout.fillWidth: true
            spacing: DfmTheme.space400

            Text {
                Layout.fillWidth: true
                text: root.title
                font.family: DfmTheme.fontFamily
                font.pixelSize: DfmTheme.fontSizeHeadline
                font.weight: DfmTheme.fontWeightMedium
                color: DfmTheme.contentPrimary
            }

            Image {
                Layout.preferredWidth: DfmTheme.iconSizeSm
                Layout.preferredHeight: DfmTheme.iconSizeSm
                source: root.chevronIconSource
                fillMode: Image.PreserveAspectFit
                rotation: root.collapsed ? 180 : 0
            }
        }

        Item {
            id: contentSlot
            Layout.fillWidth: true
            visible: !root.collapsed
            implicitHeight: childrenRect.height
        }
    }

    MouseArea {
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 40
        onClicked: {
            root.collapsed = !root.collapsed
            root.toggled(root.collapsed)
        }
    }
}
