import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

Item {
    id: macComboBox

    property var theme: Theme {}
    property var model: null
    property int currentIndex: -1
    property string textRole: ""
    property var displayTextFunction: null
    property var delegateText: null
    property bool enabled: true
    readonly property Item overlayItem: macComboBox.Window ? macComboBox.Window.contentItem : null

    signal activated(int index)

    implicitWidth: 120
    implicitHeight: 24

    function modelCount() {
        if (!model) return 0
        if (model.count !== undefined) return model.count
        if (model.length !== undefined) return model.length
        return 0
    }

    function modelGet(index) {
        if (!model) return null
        if (model.count !== undefined) {
            return model.get(index)
        }
        if (model.length !== undefined) {
            return model[index]
        }
        return null
    }

    function formatDisplayText(item, index) {
        if (!item && item !== 0) return ""
        if (displayTextFunction && typeof displayTextFunction === "function") {
            try {
                return displayTextFunction(item, index) || ""
            } catch (e) {
                return ""
            }
        }
        if (textRole && item && item[textRole] !== undefined) {
            return String(item[textRole])
        }
        if (typeof item === "string") return item
        return ""
    }

    Rectangle {
        id: backgroundRect
        anchors.fill: parent
        color: !macComboBox.enabled ? theme.backgroundSecondary : (hoverHandler.hovered ? theme.backgroundHover : theme.background)
        border.color: !macComboBox.enabled ? theme.textDisabled : theme.divider
        border.width: 1
        radius: theme.radiusMedium
    }

    Text {
        id: contentText
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: arrowIndicator.width + 10
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideRight
        color: macComboBox.enabled ? theme.textPrimary : theme.textDisabled
        font.pixelSize: 11
        text: {
            var idx = macComboBox.currentIndex
            if (idx < 0 || idx >= modelCount()) return ""
            var item = modelGet(idx)
            return formatDisplayText(item, idx)
        }
    }

    Canvas {
        id: arrowIndicator
        width: 8
        height: 6
        anchors.verticalCenter: parent.verticalCenter
        anchors.right: parent.right
        anchors.rightMargin: 6
        contextType: "2d"
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            ctx.strokeStyle = macComboBox.enabled ? theme.textSecondary : theme.textDisabled
            ctx.lineWidth = 1.5
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(width / 2, height)
            ctx.lineTo(width, 0)
            ctx.stroke()
        }
    }

    HoverHandler {
        id: hoverHandler
        enabled: macComboBox.enabled
    }

    MouseArea {
        anchors.fill: parent
        enabled: macComboBox.enabled
        onClicked: popup.open()
    }

    Popup {
        id: popup
        parent: overlayItem ? overlayItem : macComboBox
        x: 0
        y: macComboBox.height + 2
        width: macComboBox.width
        padding: 4
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        implicitHeight: Math.min(listView.contentHeight + padding * 2, 300)

        onOpened: {
            var overlay = overlayItem
            if (overlay) {
                popup.parent = overlay
                var pos = macComboBox.mapToItem(overlay, 0, macComboBox.height + 2)
                popup.x = pos.x
                popup.y = pos.y
            } else {
                popup.parent = macComboBox
                popup.x = 0
                popup.y = macComboBox.height + 2
            }
            listView.currentIndex = macComboBox.currentIndex
        }

        background: Rectangle {
            color: theme.backgroundSecondary
            border.color: theme.divider
            border.width: 1
            radius: theme.radiusMedium
        }

        contentItem: ListView {
            id: listView
            clip: true
            implicitHeight: contentHeight
            model: macComboBox.model
            currentIndex: macComboBox.currentIndex
            ScrollIndicator.vertical: ScrollIndicator { }

            delegate: Rectangle {
                id: delegateRoot
                width: listView.width
                height: 28
                color: delegateMouse.containsMouse ? theme.backgroundHover :
                       (index === listView.currentIndex ? theme.backgroundSelected : "transparent")

                Text {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    verticalAlignment: Text.AlignVCenter
                    elide: Text.ElideRight
                    font.pixelSize: theme.fontPixelSizeSmall
                    color: theme.textPrimary
                    text: {
                        var item = (model !== undefined && model !== null) ? model : modelData
                        if (delegateText && typeof delegateText === "function") {
                            try {
                                return delegateText(item, index) || ""
                            } catch (e) {
                                return ""
                            }
                        }
                        if (textRole && item && item[textRole] !== undefined) {
                            return String(item[textRole])
                        }
                        if (typeof modelData === "string") return modelData
                        return ""
                    }
                }

                MouseArea {
                    id: delegateMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    onClicked: {
                        macComboBox.currentIndex = index
                        macComboBox.activated(index)
                        popup.close()
                    }
                }
            }
        }
    }
}
