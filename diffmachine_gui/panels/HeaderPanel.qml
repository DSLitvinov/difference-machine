import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

/**
 * Base header panel component with automatic height calculation.
 * All panel headers should inherit from this component.
 * 
 * Usage:
 * HeaderPanel {
 *     theme: myTheme
 *     contentMargins: 10
 *     contentSpacing: 8
 *     
 *     ColumnLayout {
 *         // Add content here
 *         Text { text: "Title" }
 *         Text { text: "Subtitle" }
 *     }
 * }
 */
Rectangle {
    id: headerPanel
    
    property var theme: Theme {}
    property real contentSpacing: 6
    property real contentMargins: 10
    
    default property alias content: contentContainer.data
    
    color: theme.tabBarBackground || theme.backgroundSecondary
    
    // Auto-calculate height based on content
    // ColumnLayout automatically calculates implicitHeight from its children
    implicitHeight: contentContainer.implicitHeight + (contentMargins * 2)
    height: implicitHeight
    
    ColumnLayout {
        id: contentContainer
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.topMargin: headerPanel.contentMargins
        anchors.leftMargin: headerPanel.contentMargins
        anchors.rightMargin: headerPanel.contentMargins
        anchors.bottomMargin: headerPanel.contentMargins
        spacing: headerPanel.contentSpacing
    }
    
    Rectangle {
        anchors.bottom: parent.bottom
        width: parent.width
        height: 1
        color: theme.divider
    }
}
