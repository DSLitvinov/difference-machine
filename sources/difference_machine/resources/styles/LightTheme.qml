import QtQuick 6.6

QtObject {
    // Main colors
    readonly property color background: "#ffffff"
    readonly property color backgroundSecondary: "#f3f3f3"
    readonly property color backgroundTertiary: "#e8e8e8"
    readonly property color backgroundHover: "#e5e5e5"
    readonly property color backgroundSelected: "#cce5ff"
    readonly property color textSelected: "#000000"
    
    // Menu bar
    readonly property color menuBarBackground: "#f0f0f0"
    
    // Tab bar
    readonly property color tabBarBackground: "#f3f3f3"
    readonly property color tabBarActiveBackground: "#e8e8e8"
    readonly property color tabBarActiveIndicator: "#007acc"
    
    // Dividers
    readonly property color divider: "#d0d0d0"
    
    // Text colors
    readonly property color textPrimary: "#000000"
    readonly property color textSecondary: "#333333"
    readonly property color textTertiary: "#666666"
    readonly property color textDisabled: "#999999"
    readonly property color textPlaceholder: "#808080"
    
    // Scrollbar colors
    readonly property color scrollBarBackground: "#ffffff"
    readonly property color scrollBarNormal: "#d0d0d0"
    readonly property color scrollBarHover: "#b0b0b0"
    readonly property color scrollBarPressed: "#909090"
    
    // Metadata panel
    readonly property color metadataPanelBackground: "#f5f5f5"
    
    // Accent colors
    readonly property color accent: "#007acc"
    readonly property color accentLanguage: "#0066cc"
    
    // Error colors
    readonly property color error: "#cc0000"
    
    // Diff/status colors (green/red from commit info)
    readonly property color diffAdded: "#22863a"
    readonly property color diffRemoved: "#cb2431"
    readonly property color diffModified: "#0366d6"
    readonly property color diffDeleted: "#6a737d"
    
    // Typography
    readonly property string fontMonospace: "Courier New"
    readonly property int fontPixelSizeCaption: 10
    readonly property int fontPixelSizeSmall: 11
    readonly property int fontPixelSizeBody: 12
    readonly property int fontPixelSizeSubhead: 13
    readonly property int fontPixelSizeTitle: 14
    readonly property int fontPixelSizeHeadline: 16
    
    // Border radius
    readonly property int radiusSmall: 3
    readonly property int radiusMedium: 4
    readonly property int radiusLarge: 6
    readonly property int radiusBadge: 8
    
    // Additional colors for specific use cases
    readonly property color textMonospace: textPrimary  // Monospace text color (same as primary)
    
    // Button styles (macOS-like)
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
}

