import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * macOS-style checkbox component
 * Small, compact checkbox with hover states
 * Supports tristate (three states: unchecked, partially checked, checked)
 */
CheckBox {
    id: macCheckBox
    
    property var theme: Theme {}
    
    // Small size for macOS style - let CheckBox calculate width based on content
    implicitHeight: 14
    
    // Custom indicator
    indicator: Rectangle {
        id: indicatorRect
        implicitWidth: 14
        implicitHeight: 14
        x: macCheckBox.leftPadding
        y: parent.height / 2 - height / 2
        radius: theme.radiusSmall
        border.width: 1
        border.color: {
            if (!macCheckBox.enabled) {
                return theme.textDisabled
            }
            var isChecked = macCheckBox.checkState === Qt.Checked || macCheckBox.checkState === Qt.PartiallyChecked
            if (macCheckBox.hovered) {
                return isChecked ? theme.accent : theme.divider
            }
            return isChecked ? theme.accent : theme.divider
        }
        color: {
            if (!macCheckBox.enabled) {
                return theme.backgroundSecondary
            }
            var isChecked = macCheckBox.checkState === Qt.Checked || macCheckBox.checkState === Qt.PartiallyChecked
            if (isChecked) {
                return macCheckBox.hovered ? theme.accent : theme.accent
            }
            return macCheckBox.hovered ? theme.backgroundHover : "transparent"
        }
        
        // Checkmark or dash icon
        Text {
            anchors.centerIn: parent
            text: {
                if (macCheckBox.checkState === Qt.Checked) {
                    return "✓"
                } else if (macCheckBox.checkState === Qt.PartiallyChecked) {
                    return "−"
                }
                return ""
            }
            color: (macCheckBox.checkState === Qt.Checked || macCheckBox.checkState === Qt.PartiallyChecked) ? theme.textSelected : "transparent"
            font.pixelSize: theme.fontPixelSizeCaption
            font.bold: true
            visible: macCheckBox.checkState !== Qt.Unchecked
        }
        
        // Hover effect
        Rectangle {
            anchors.fill: parent
            radius: parent.radius
            color: {
                var isChecked = macCheckBox.checkState === Qt.Checked || macCheckBox.checkState === Qt.PartiallyChecked
                return macCheckBox.hovered && !isChecked ? Qt.rgba(theme.accent.r, theme.accent.g, theme.accent.b, 0.1) : "transparent"
            }
            visible: macCheckBox.hovered && (macCheckBox.checkState === Qt.Unchecked)
        }
    }
    
    // Custom text style
    contentItem: Text {
        id: textItem
        leftPadding: indicatorRect.implicitWidth + macCheckBox.spacing
        text: macCheckBox.text
        font: macCheckBox.font || Qt.font({ pixelSize: 11 })
        color: macCheckBox.enabled ? theme.textPrimary : theme.textDisabled
        verticalAlignment: Text.AlignVCenter
    }
    
    // Spacing between indicator and text
    spacing: 6
    
    // Left padding for indicator
    leftPadding: 0
    rightPadding: 0
    topPadding: 0
    bottomPadding: 0
}
