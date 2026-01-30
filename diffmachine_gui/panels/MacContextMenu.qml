import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * Переиспользуемое контекстное меню в стиле комбобоксов.
 * - theme: Theme (или объект со стилями contextMenu*).
 * - model: ListModel с полями label (строка) и action (строка). action === "sep" — разделитель.
 * - overlayItem: родитель для позиционирования (обычно window.contentItem). Если null — parent меню.
 *
 * Вызов: open(x, y) — открыть в координатах overlay. Сигнал itemTriggered(string action)
 * при выборе пункта (для "sep" не вызывается).
 */
Popup {
    id: contextMenu

    property var theme: Theme {}
    property var model: null
    property var overlayItem: null
    property int _margin: 8

    width: theme.contextMenuMinWidth !== undefined ? theme.contextMenuMinWidth : 240
    padding: theme.contextMenuPadding !== undefined ? theme.contextMenuPadding : 4
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    modal: false

    signal itemTriggered(string action)

    function openAt(px, py) {
        var overlay = overlayItem || contextMenu.parent
        if (!overlay) {
            contextMenu.open()
            return
        }
        contextMenu.parent = overlay
        var w = contextMenu.width
        var sepH = theme.contextMenuSeparatorHeight !== undefined ? theme.contextMenuSeparatorHeight : 8
        var itemH = theme.contextMenuItemHeight !== undefined ? theme.contextMenuItemHeight : 28
        var n = contextMenu.model ? contextMenu.model.count : 0
        var h = 0
        for (var i = 0; i < n; i++) {
            var act = contextMenu.model.get(i).action
            h += (act === "sep" ? sepH : itemH)
        }
        h += padding * 2
        var nx = Math.max(_margin, Math.min(px, (overlay.width || 0) - w - _margin))
        var ny = Math.max(_margin, Math.min(py, (overlay.height || 0) - h - _margin))
        contextMenu.x = nx
        contextMenu.y = ny
        contextMenu.open()
    }

    background: Rectangle {
        color: theme.contextMenuBackground !== undefined ? theme.contextMenuBackground : "#252526"
        border.color: theme.contextMenuBorderColor !== undefined ? theme.contextMenuBorderColor : "#404040"
        border.width: 1
        radius: theme.contextMenuRadius !== undefined ? theme.contextMenuRadius : 4
    }

    contentItem: ListView {
        implicitHeight: contentHeight
        implicitWidth: contentWidth
        model: contextMenu.model
        interactive: false
        delegate: Rectangle {
            width: contextMenu.width - contextMenu.padding * 2
            height: model.action === "sep"
                ? (theme.contextMenuSeparatorHeight !== undefined ? theme.contextMenuSeparatorHeight : 8)
                : (theme.contextMenuItemHeight !== undefined ? theme.contextMenuItemHeight : 28)
            color: model.action === "sep" ? "transparent" : (ctxItemMouse.containsMouse ? (theme.contextMenuHoverBg !== undefined ? theme.contextMenuHoverBg : "#2a2a2a") : "transparent")

            Rectangle {
                visible: model.action === "sep"
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.verticalCenter: parent.verticalCenter
                height: 1
                color: theme.contextMenuSeparatorColor !== undefined ? theme.contextMenuSeparatorColor : "#404040"
                opacity: theme.contextMenuSeparatorOpacity !== undefined ? theme.contextMenuSeparatorOpacity : 0.6
            }

            Text {
                visible: model.action !== "sep"
                anchors.fill: parent
                anchors.leftMargin: theme.contextMenuTextLeftMargin !== undefined ? theme.contextMenuTextLeftMargin : 8
                verticalAlignment: Text.AlignVCenter
                font.pixelSize: theme.contextMenuFontSize !== undefined ? theme.contextMenuFontSize : 11
                color: theme.contextMenuTextColor !== undefined ? theme.contextMenuTextColor : "#ffffff"
                text: qsTr(model.label || "")
                elide: Text.ElideRight
            }

            MouseArea {
                id: ctxItemMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: model.action === "sep" ? Qt.ArrowCursor : Qt.PointingHandCursor
                onClicked: {
                    if (model.action === "sep") return
                    contextMenu.itemTriggered(model.action)
                    contextMenu.close()
                }
            }
        }
    }
}
