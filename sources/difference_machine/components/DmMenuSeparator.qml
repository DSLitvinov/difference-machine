import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

MenuSeparator {
    id: root

    property var theme: Theme {}

    padding: theme.contextMenuSeparatorHeight / 2
    contentItem: Rectangle {
        implicitWidth: parent ? parent.width : 0
        implicitHeight: 1
        color: root.theme.contextMenuSeparatorColor
        opacity: root.theme.contextMenuSeparatorOpacity
    }
}
