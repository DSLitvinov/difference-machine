import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * macOS-style multi-line text area: rounded corners, subtle border, accent on focus.
 */
TextArea {
    id: macTextArea
    
    property var theme: Theme {}
    
    leftPadding: 10
    rightPadding: 10
    topPadding: 8
    bottomPadding: 8
    font.pixelSize: theme ? theme.fontPixelSizeBody : 12
    color: theme ? theme.textPrimary : "#ffffff"
    placeholderTextColor: theme ? theme.textPlaceholder : "#808080"
    selectByMouse: true
    
    background: Rectangle {
        radius: theme ? theme.radiusMedium : 4
        border.width: 1
        border.color: macTextArea.activeFocus ? (theme ? theme.accent : "#007acc") : (theme ? theme.divider : "#404040")
        color: theme ? theme.backgroundSecondary : "#252526"
    }
}
