import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * macOS-style single-line text field: rounded corners, subtle border, accent on focus.
 */
TextField {
    id: macTextField
    
    property var theme: Theme {}
    
    implicitHeight: 28
    leftPadding: 10
    rightPadding: 10
    topPadding: 6
    bottomPadding: 6
    font.pixelSize: theme ? theme.fontPixelSizeBody : 12
    color: theme ? theme.textPrimary : "#ffffff"
    placeholderTextColor: theme ? theme.textPlaceholder : "#808080"
    selectByMouse: true
    
    background: Rectangle {
        implicitHeight: 28
        radius: theme ? theme.radiusMedium : 4
        border.width: 1
        border.color: macTextField.activeFocus ? (theme ? theme.accent : "#007acc") : (theme ? theme.divider : "#404040")
        color: theme ? theme.backgroundSecondary : "#252526"
    }
}
