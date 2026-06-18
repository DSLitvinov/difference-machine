import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

// Obsidian-style resize handle between split panes (1px border, accent on hover)
Item {
    id: root

    property var theme: Theme {}
    // true for vertical bar between side-by-side panes (horizontal SplitView)
    property bool isVerticalBar: true

    readonly property bool active: SplitHandle.hovered || SplitHandle.pressed
    readonly property real lineWidth: active ? theme.splitHandleWidthHover : theme.splitHandleWidth
    readonly property color lineColor: active ? theme.splitHandleColorHover : theme.splitHandleColor
    readonly property real hitSize: theme.splitHandleHitWidth

    // Layout slot is exactly the divider line — no empty gap between panes
    implicitWidth: isVerticalBar ? theme.splitHandleWidth : 1
    implicitHeight: isVerticalBar ? 1 : theme.splitHandleWidth

    // Wider invisible hit target, centered on the 1px layout slot
    x: isVerticalBar ? -(hitSize - implicitWidth) / 2 : 0
    y: isVerticalBar ? 0 : -(hitSize - implicitHeight) / 2
    width: isVerticalBar ? hitSize : implicitWidth
    height: isVerticalBar ? implicitHeight : hitSize
    z: 1

    Rectangle {
        anchors.centerIn: parent
        width: root.isVerticalBar ? root.lineWidth : parent.width
        height: root.isVerticalBar ? parent.height : root.lineWidth
        color: root.lineColor
    }
}
