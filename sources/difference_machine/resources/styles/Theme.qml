import QtQuick 6.6
import QtQuick.Controls 6.6

QtObject {
    id: theme
    
    // Load theme components using Qt.createQmlObject with inline definitions
    // This avoids module import issues
    Component.onCompleted: {
        // Create dark theme inline
        darkTheme = Qt.createQmlObject('
            import QtQuick 6.6
            QtObject {
                readonly property color background: "#1e1e1e"
                readonly property color backgroundSecondary: "#252526"
                readonly property color backgroundTertiary: "#2d2d30"
                readonly property color backgroundHover: "#2a2a2a"
                readonly property color backgroundSelected: "#3a5a7a"
                readonly property color textSelected: "#ffffff"
                readonly property color menuBarBackground: "#3a3a3a"
                readonly property color tabBarBackground: "#252526"
                readonly property color tabBarActiveBackground: "#2d2d30"
                readonly property color tabBarActiveIndicator: "#007acc"
                readonly property color divider: "#404040"
                readonly property color textPrimary: "#ffffff"
                readonly property color textSecondary: "#aaaaaa"
                readonly property color textTertiary: "#888888"
                readonly property color textDisabled: "#666666"
                readonly property color textPlaceholder: "#808080"
                readonly property color scrollBarBackground: "#1e1e1e"
                readonly property color scrollBarNormal: "#3a3a3a"
                readonly property color scrollBarHover: "#4a4a4a"
                readonly property color scrollBarPressed: "#555555"
                readonly property color metadataPanelBackground: "#252525"
                readonly property color accent: "#007acc"
                readonly property color accentLanguage: "#66D9EF"
                readonly property color error: "#ff6666"
                readonly property color diffAdded: "#22863a"
                readonly property color diffRemoved: "#cb2431"
                readonly property color diffModified: "#0366d6"
                readonly property color diffDeleted: "#6a737d"
                readonly property string fontMonospace: "Courier New"
                readonly property int radiusSmall: 3
                readonly property int radiusMedium: 4
                readonly property int radiusLarge: 6
                readonly property int radiusBadge: 8
                readonly property int fontPixelSizeCaption: 10
                readonly property int fontPixelSizeSmall: 11
                readonly property int fontPixelSizeBody: 12
                readonly property int fontPixelSizeSubhead: 13
                readonly property int fontPixelSizeTitle: 14
                readonly property int fontPixelSizeHeadline: 16
                readonly property color textMonospace: "#ffffff"
                readonly property color buttonPrimaryBg: "#007acc"
                readonly property color buttonPrimaryBgHover: "#006bb3"
                readonly property color buttonPrimaryText: "#ffffff"
                readonly property color buttonSecondaryBg: "#2d2d30"
                readonly property color buttonSecondaryBgHover: "#3d3d40"
                readonly property color buttonSecondaryBorder: "#404040"
                readonly property color buttonSecondaryText: "#ffffff"
                readonly property color buttonGhostBg: "transparent"
                readonly property color buttonGhostBgHover: "#2a2a2a"
                readonly property color buttonGhostText: "#ffffff"
                readonly property color contextMenuBackground: "#252526"
                readonly property color contextMenuBorderColor: "#404040"
                readonly property int contextMenuRadius: 4
                readonly property int contextMenuPadding: 4
                readonly property int contextMenuItemHeight: 28
                readonly property int contextMenuSeparatorHeight: 8
                readonly property int contextMenuTextLeftMargin: 8
                readonly property int contextMenuFontSize: 11
                readonly property color contextMenuTextColor: "#ffffff"
                readonly property color contextMenuHoverBg: "#2a2a2a"
                readonly property color contextMenuSeparatorColor: "#404040"
                readonly property real contextMenuSeparatorOpacity: 0.6
                readonly property int contextMenuMinWidth: 200
            }
        ', theme)
        
        // Create light theme inline
        lightTheme = Qt.createQmlObject('
            import QtQuick 6.6
            QtObject {
                readonly property color background: "#ffffff"
                readonly property color backgroundSecondary: "#f3f3f3"
                readonly property color backgroundTertiary: "#e8e8e8"
                readonly property color backgroundHover: "#e5e5e5"
                readonly property color backgroundSelected: "#cce5ff"
                readonly property color textSelected: "#000000"
                readonly property color menuBarBackground: "#f0f0f0"
                readonly property color tabBarBackground: "#f3f3f3"
                readonly property color tabBarActiveBackground: "#e8e8e8"
                readonly property color tabBarActiveIndicator: "#007acc"
                readonly property color divider: "#d0d0d0"
                readonly property color textPrimary: "#000000"
                readonly property color textSecondary: "#333333"
                readonly property color textTertiary: "#666666"
                readonly property color textDisabled: "#999999"
                readonly property color textPlaceholder: "#808080"
                readonly property color scrollBarBackground: "#ffffff"
                readonly property color scrollBarNormal: "#d0d0d0"
                readonly property color scrollBarHover: "#b0b0b0"
                readonly property color scrollBarPressed: "#909090"
                readonly property color metadataPanelBackground: "#f5f5f5"
                readonly property color accent: "#007acc"
                readonly property color accentLanguage: "#0066cc"
                readonly property color error: "#cc0000"
                readonly property color diffAdded: "#22863a"
                readonly property color diffRemoved: "#cb2431"
                readonly property color diffModified: "#0366d6"
                readonly property color diffDeleted: "#6a737d"
                readonly property string fontMonospace: "Courier New"
                readonly property int radiusSmall: 3
                readonly property int radiusMedium: 4
                readonly property int radiusLarge: 6
                readonly property int radiusBadge: 8
                readonly property int fontPixelSizeCaption: 10
                readonly property int fontPixelSizeSmall: 11
                readonly property int fontPixelSizeBody: 12
                readonly property int fontPixelSizeSubhead: 13
                readonly property int fontPixelSizeTitle: 14
                readonly property int fontPixelSizeHeadline: 16
                readonly property color textMonospace: "#000000"
                readonly property color buttonPrimaryBg: "#007acc"
                readonly property color buttonPrimaryBgHover: "#006bb3"
                readonly property color buttonPrimaryText: "#ffffff"
                readonly property color buttonSecondaryBg: "#e8e8e8"
                readonly property color buttonSecondaryBgHover: "#d8d8d8"
                readonly property color buttonSecondaryBorder: "#d0d0d0"
                readonly property color buttonSecondaryText: "#000000"
                readonly property color buttonGhostBg: "transparent"
                readonly property color buttonGhostBgHover: "#e5e5e5"
                readonly property color buttonGhostText: "#000000"
                readonly property color contextMenuBackground: "#f3f3f3"
                readonly property color contextMenuBorderColor: "#d0d0d0"
                readonly property int contextMenuRadius: 4
                readonly property int contextMenuPadding: 4
                readonly property int contextMenuItemHeight: 28
                readonly property int contextMenuSeparatorHeight: 8
                readonly property int contextMenuTextLeftMargin: 8
                readonly property int contextMenuFontSize: 11
                readonly property color contextMenuTextColor: "#000000"
                readonly property color contextMenuHoverBg: "#e5e5e5"
                readonly property color contextMenuSeparatorColor: "#d0d0d0"
                readonly property real contextMenuSeparatorOpacity: 0.6
                readonly property int contextMenuMinWidth: 200
            }
        ', theme)
    }
    
    property var darkTheme: null
    property var lightTheme: null
    
    // Detect system color scheme using Qt.application.styleHints
    readonly property bool isDark: {
        if (Qt.application && Qt.application.styleHints) {
            return Qt.application.styleHints.colorScheme === Qt.Dark
        }
        // Default to dark theme if cannot detect
        return true
    }
    
    // Load appropriate theme based on system preference
    readonly property var currentTheme: isDark ? darkTheme : lightTheme
    
    // Convenience properties that map to current theme
    readonly property color background: currentTheme ? currentTheme.background : "#1e1e1e"
    readonly property color backgroundSecondary: currentTheme ? currentTheme.backgroundSecondary : "#252526"
    readonly property color backgroundTertiary: currentTheme ? currentTheme.backgroundTertiary : "#2d2d30"
    readonly property color backgroundHover: currentTheme ? currentTheme.backgroundHover : "#2a2a2a"
    readonly property color backgroundSelected: currentTheme ? currentTheme.backgroundSelected : "#3a5a7a"
    readonly property color textSelected: currentTheme ? currentTheme.textSelected : "#ffffff"
    
    readonly property color menuBarBackground: currentTheme ? currentTheme.menuBarBackground : "#3a3a3a"
    
    readonly property color tabBarBackground: currentTheme ? currentTheme.tabBarBackground : "#252526"
    readonly property color tabBarActiveBackground: currentTheme ? currentTheme.tabBarActiveBackground : "#2d2d30"
    readonly property color tabBarActiveIndicator: currentTheme ? currentTheme.tabBarActiveIndicator : "#007acc"
    
    readonly property color divider: currentTheme ? currentTheme.divider : "#404040"
    
    readonly property color textPrimary: currentTheme ? currentTheme.textPrimary : "#ffffff"
    readonly property color textSecondary: currentTheme ? currentTheme.textSecondary : "#aaaaaa"
    readonly property color textTertiary: currentTheme ? currentTheme.textTertiary : "#888888"
    readonly property color textDisabled: currentTheme ? currentTheme.textDisabled : "#666666"
    readonly property color textPlaceholder: currentTheme ? currentTheme.textPlaceholder : "#808080"
    
    readonly property color scrollBarBackground: currentTheme ? currentTheme.scrollBarBackground : "#1e1e1e"
    readonly property color scrollBarNormal: currentTheme ? currentTheme.scrollBarNormal : "#3a3a3a"
    readonly property color scrollBarHover: currentTheme ? currentTheme.scrollBarHover : "#4a4a4a"
    readonly property color scrollBarPressed: currentTheme ? currentTheme.scrollBarPressed : "#555555"
    
    readonly property color metadataPanelBackground: currentTheme ? currentTheme.metadataPanelBackground : "#252525"
    
    readonly property color accent: currentTheme ? currentTheme.accent : "#007acc"
    readonly property color accentLanguage: currentTheme ? currentTheme.accentLanguage : "#66D9EF"
    
    readonly property color error: currentTheme ? currentTheme.error : "#ff6666"
    
    readonly property color diffAdded: currentTheme ? currentTheme.diffAdded : "#22863a"
    readonly property color diffRemoved: currentTheme ? currentTheme.diffRemoved : "#cb2431"
    readonly property color diffModified: currentTheme ? currentTheme.diffModified : "#0366d6"
    readonly property color diffDeleted: currentTheme ? currentTheme.diffDeleted : "#6a737d"
    readonly property string fontMonospace: currentTheme ? currentTheme.fontMonospace : "Courier New"
    readonly property int radiusSmall: currentTheme ? currentTheme.radiusSmall : 3
    readonly property int radiusMedium: currentTheme ? currentTheme.radiusMedium : 4
    readonly property int radiusLarge: currentTheme ? currentTheme.radiusLarge : 6
    readonly property int radiusBadge: currentTheme ? currentTheme.radiusBadge : 8
    readonly property int fontPixelSizeCaption: currentTheme ? currentTheme.fontPixelSizeCaption : 10
    readonly property int fontPixelSizeSmall: currentTheme ? currentTheme.fontPixelSizeSmall : 11
    readonly property int fontPixelSizeBody: currentTheme ? currentTheme.fontPixelSizeBody : 12
    readonly property int fontPixelSizeSubhead: currentTheme ? currentTheme.fontPixelSizeSubhead : 13
    readonly property int fontPixelSizeTitle: currentTheme ? currentTheme.fontPixelSizeTitle : 14
    readonly property int fontPixelSizeHeadline: currentTheme ? currentTheme.fontPixelSizeHeadline : 16
    
    readonly property color textMonospace: currentTheme ? currentTheme.textMonospace : textPrimary
    
    // Button styles (macOS-like: primary, secondary, ghost)
    readonly property color buttonPrimaryBg: currentTheme ? currentTheme.buttonPrimaryBg : "#007acc"
    readonly property color buttonPrimaryBgHover: currentTheme ? currentTheme.buttonPrimaryBgHover : "#006bb3"
    readonly property color buttonPrimaryText: currentTheme ? currentTheme.buttonPrimaryText : "#ffffff"
    readonly property color buttonSecondaryBg: currentTheme ? currentTheme.buttonSecondaryBg : "#2d2d30"
    readonly property color buttonSecondaryBgHover: currentTheme ? currentTheme.buttonSecondaryBgHover : "#3d3d40"
    readonly property color buttonSecondaryBorder: currentTheme ? currentTheme.buttonSecondaryBorder : "#404040"
    readonly property color buttonSecondaryText: currentTheme ? currentTheme.buttonSecondaryText : "#ffffff"
    readonly property color buttonGhostBg: currentTheme ? currentTheme.buttonGhostBg : "transparent"
    readonly property color buttonGhostBgHover: currentTheme ? currentTheme.buttonGhostBgHover : "#2a2a2a"
    readonly property color buttonGhostText: currentTheme ? currentTheme.buttonGhostText : "#ffffff"

    // Context menu styles (dropdown / right-click menus, combo-style)
    readonly property color contextMenuBackground: currentTheme ? currentTheme.contextMenuBackground : "#252526"
    readonly property color contextMenuBorderColor: currentTheme ? currentTheme.contextMenuBorderColor : "#404040"
    readonly property int contextMenuRadius: currentTheme ? currentTheme.contextMenuRadius : 4
    readonly property int contextMenuPadding: currentTheme ? currentTheme.contextMenuPadding : 4
    readonly property int contextMenuItemHeight: currentTheme ? currentTheme.contextMenuItemHeight : 28
    readonly property int contextMenuSeparatorHeight: currentTheme ? currentTheme.contextMenuSeparatorHeight : 8
    readonly property int contextMenuTextLeftMargin: currentTheme ? currentTheme.contextMenuTextLeftMargin : 8
    readonly property int contextMenuFontSize: currentTheme ? currentTheme.contextMenuFontSize : 11
    readonly property color contextMenuTextColor: currentTheme ? currentTheme.contextMenuTextColor : "#ffffff"
    readonly property color contextMenuHoverBg: currentTheme ? currentTheme.contextMenuHoverBg : "#2a2a2a"
    readonly property color contextMenuSeparatorColor: currentTheme ? currentTheme.contextMenuSeparatorColor : "#404040"
    readonly property real contextMenuSeparatorOpacity: currentTheme ? currentTheme.contextMenuSeparatorOpacity : 0.6
    readonly property int contextMenuMinWidth: currentTheme ? currentTheme.contextMenuMinWidth : 200
    
    // Icon path based on theme
    readonly property string darkIconPath: "../resources/icons/DarkTheme"
    readonly property string lightIconPath: "../resources/icons/LightTheme"
    readonly property string iconPath: isDark ? darkIconPath : lightIconPath
    
    // Helper function to get icon path
    function getIconPath(iconName) {
        return iconPath + "/" + iconName
    }
    
    // Syntax highlighting style based on theme
    // Pygments styles: 'monokai', 'github-dark', 'dracula' for dark theme
    //                   'default', 'friendly', 'colorful', 'gruvbox-light' for light theme
    readonly property string syntaxHighlightStyle: isDark ? "monokai" : "default"
    
    // Note: Theme will automatically update when Qt.application.styleHints.colorScheme changes
    // because isDark is a readonly property that re-evaluates on access
}
