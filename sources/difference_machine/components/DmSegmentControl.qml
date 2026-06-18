import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

Rectangle {
    id: root

    property var theme: Theme {}
    property var segments: []
    property int currentIndex: 0

    signal indexChanged(int index)

    implicitHeight: theme.controlHeight
    radius: theme.radiusLarge
    color: theme.tabBarBackground
    clip: true

    onCurrentIndexChanged: root.indexChanged(currentIndex)

    Row {
        anchors.fill: parent
        anchors.margins: theme.segmentInnerMargin
        spacing: 0

        Repeater {
            model: root.segments.length

            Item {
                width: (root.width - 2 * theme.segmentInnerMargin) / Math.max(root.segments.length, 1)
                height: root.height - 2 * theme.segmentInnerMargin

                Rectangle {
                    anchors.fill: parent
                    radius: theme.radiusMedium
                    color: root.currentIndex === index ? theme.tabBarActiveBackground : "transparent"
                    border.width: root.currentIndex === index ? 1 : 0
                    border.color: theme.divider
                }

                Text {
                    anchors.centerIn: parent
                    text: root.segments[index] ? root.segments[index].label : ""
                    color: root.currentIndex === index ? theme.textPrimary : theme.textSecondary
                    font.family: theme.fontFamilyUI
                    font.pixelSize: theme.fontPixelSizeBody
                    font.weight: Font.Normal
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.currentIndex = index
                }
            }
        }
    }
}
