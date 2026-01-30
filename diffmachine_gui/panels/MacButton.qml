import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

/**
 * macOS-style button: primary (accent), secondary (gray/cancel), ghost (transparent, for copy hash).
 * - iconSource: optional icon path (e.g. theme.getIconPath("edit-copy.svg")).
 * - If text is empty and iconSource is set — icon-only mode: icon is centered, default size 28×28.
 * - If both icon and text — they are shown in a row (icon left, text right).
 * - Checkable uses accent when checked (segment-style).
 * - implicitWidth is content-based (text + icon + padding) so buttons size to content when not Layout.fillWidth.
 */
Button {
    id: macButton

    property var theme: Theme {}
    property string buttonStyle: "secondary"  // "primary" | "secondary" | "ghost"
    property string iconSource: ""
    readonly property int _paddingH: 24

    implicitHeight: 28
    implicitWidth: {
        if (iconSource !== "" && text === "") return 28
        var tw = textMetrics.boundingRect.width
        if (iconSource !== "" && text !== "") return 14 + 6 + Math.ceil(tw) + _paddingH
        return Math.max(56, Math.ceil(tw) + _paddingH)
    }
    font.pixelSize: theme ? theme.fontPixelSizeSmall : 11

    TextMetrics {
        id: textMetrics
        font: macButton.font
        text: macButton.text || " "
    }
    
    background: Rectangle {
        radius: theme ? theme.radiusMedium : 4
        border.width: (macButton.buttonStyle === "secondary" || (macButton.checkable && macButton.checked) || !macButton.enabled) ? 1 : 0
        border.color: {
            if (!theme) return "transparent"
            if (!macButton.enabled) return theme.buttonSecondaryBorder
            if (macButton.checkable && macButton.checked) return theme.accent
            if (macButton.buttonStyle === "secondary") return theme.buttonSecondaryBorder
            return "transparent"
        }
        color: {
            if (!theme || !macButton.enabled && macButton.buttonStyle !== "ghost") {
                return theme ? theme.backgroundSecondary : "#2d2d30"
            }
            if (macButton.checkable && macButton.checked) {
                return macButton.hovered ? Qt.darker(theme.accent, 1.08) : theme.accent
            }
            switch (macButton.buttonStyle) {
                case "primary": return macButton.hovered ? theme.buttonPrimaryBgHover : theme.buttonPrimaryBg
                case "secondary": return macButton.hovered ? theme.buttonSecondaryBgHover : theme.buttonSecondaryBg
                case "ghost": return macButton.hovered ? theme.buttonGhostBgHover : theme.buttonGhostBg
                default: return macButton.hovered ? theme.buttonSecondaryBgHover : theme.buttonSecondaryBg
            }
        }
    }
    
    contentItem: Item {
        id: contentRoot
        readonly property color textColor: {
            if (!theme) return "#ffffff"
            if (!macButton.enabled) return theme.textDisabled
            if (macButton.checkable && macButton.checked) return theme.buttonPrimaryText
            switch (macButton.buttonStyle) {
                case "primary": return theme.buttonPrimaryText
                case "secondary": return theme.buttonSecondaryText
                case "ghost": return theme.buttonGhostText
                default: return theme.buttonSecondaryText
            }
        }
        // Icon only: centered in the button (icon-only mode)
        Image {
            visible: macButton.iconSource !== "" && macButton.text === ""
            anchors.centerIn: parent
            source: macButton.iconSource
            sourceSize.width: 14
            sourceSize.height: 14
            width: 14
            height: 14
            fillMode: Image.PreserveAspectFit
            asynchronous: true
            opacity: macButton.enabled ? 1 : 0.7
        }
        // Icon and text inline
        RowLayout {
            anchors.centerIn: parent
            spacing: 6
            visible: macButton.iconSource !== "" && macButton.text !== ""
            Image {
                source: macButton.iconSource
                sourceSize.width: 14
                sourceSize.height: 14
                Layout.preferredWidth: 14
                Layout.preferredHeight: 14
                fillMode: Image.PreserveAspectFit
                asynchronous: true
                opacity: macButton.enabled ? 1 : 0.7
            }
            Text {
                text: macButton.text
                font: macButton.font
                color: contentRoot.textColor
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
        // Text only
        Text {
            anchors.centerIn: parent
            visible: macButton.iconSource === ""
            text: macButton.text
            font: macButton.font
            color: contentRoot.textColor
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }
}
