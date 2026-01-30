import QtQuick 6.6

QtObject {
    // Main colors
    readonly property color background: "#1e1e1e"
    readonly property color backgroundSecondary: "#252526"
    readonly property color backgroundTertiary: "#2d2d30"
    readonly property color backgroundHover: "#2a2a2a"
    readonly property color backgroundSelected: "#3a5a7a"
    readonly property color textSelected: "#ffffff"
    
    // Menu bar
    readonly property color menuBarBackground: "#3a3a3a"
    
    // Tab bar
    readonly property color tabBarBackground: "#252526"
    readonly property color tabBarActiveBackground: "#2d2d30"
    readonly property color tabBarActiveIndicator: "#007acc"
    
    // Dividers
    readonly property color divider: "#404040"
    
    // Text colors
    readonly property color textPrimary: "#ffffff"
    readonly property color textSecondary: "#aaaaaa"
    readonly property color textTertiary: "#888888"
    readonly property color textDisabled: "#666666"
    readonly property color textPlaceholder: "#808080"
    
    // Scrollbar colors
    readonly property color scrollBarBackground: "#1e1e1e"
    readonly property color scrollBarNormal: "#3a3a3a"
    readonly property color scrollBarHover: "#4a4a4a"
    readonly property color scrollBarPressed: "#555555"
    
    // Metadata panel
    readonly property color metadataPanelBackground: "#252525"
    
    // Accent colors
    readonly property color accent: "#007acc"
    readonly property color accentLanguage: "#66D9EF"
    
    // Error colors
    readonly property color error: "#ff6666"
    
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
    readonly property color buttonSecondaryBg: "#2d2d30"
    readonly property color buttonSecondaryBgHover: "#3d3d40"
    readonly property color buttonSecondaryBorder: "#404040"
    readonly property color buttonSecondaryText: "#ffffff"
    readonly property color buttonGhostBg: "transparent"
    readonly property color buttonGhostBgHover: "#2a2a2a"
    readonly property color buttonGhostText: "#ffffff"
}

