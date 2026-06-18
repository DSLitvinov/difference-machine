import QtQuick 6.6

QtObject {
    // Obsidian-inspired dark palette
    readonly property color background: "#1e1e1e"
    readonly property color backgroundSecondary: "#262626"
    readonly property color backgroundTertiary: "#2a2a2a"
    readonly property color backgroundHover: "#2a2a2a"
    readonly property color backgroundSelected: "#363636"
    readonly property color backgroundSelectedAccent: "#3f3a5c"
    readonly property color textSelected: "#dcddde"

    // Sidebar (file explorer) — uniform secondary background
    readonly property color sidebarBackground: "#262626"
    readonly property color sidebarHeaderBackground: "#262626"
    readonly property color contentBackground: "#1e1e1e"

    readonly property color menuBarBackground: "#262626"
    readonly property color tabBarBackground: "#2a2a2a"
    readonly property color tabBarActiveBackground: "#363636"
    readonly property color tabBarActiveIndicator: "#7f6df2"

    readonly property color divider: "#333333"

    // Split pane resize handles (Obsidian --divider-* variables)
    readonly property color splitHandleColor: "#333333"
    readonly property color splitHandleColorHover: "#7f6df2"
    readonly property int splitHandleWidth: 1
    readonly property int splitHandleWidthHover: 3
    readonly property int splitHandleHitWidth: 4

    readonly property color textPrimary: "#dcddde"
    readonly property color textSecondary: "#999999"
    readonly property color textTertiary: "#6b6b6b"
    readonly property color textDisabled: "#555555"
    readonly property color textPlaceholder: "#6b6b6b"

    readonly property color scrollBarBackground: "#1e1e1e"
    readonly property color scrollBarNormal: "#3a3a3a"
    readonly property color scrollBarHover: "#4a4a4a"
    readonly property color scrollBarPressed: "#555555"

    readonly property color metadataPanelBackground: "#262626"

    readonly property color accent: "#7f6df2"
    readonly property color accentHover: "#9580ff"
    readonly property color accentMuted: "#5c4db0"
    readonly property color accentLanguage: "#a882ff"

    readonly property color error: "#e06c75"
    readonly property color diffAdded: "#3fb950"
    readonly property color diffRemoved: "#f85149"
    readonly property color diffModified: "#7f6df2"
    readonly property color diffDeleted: "#6b6b6b"

    // Diff viewer (HTML) — matches diff_processor.py dark palette
    readonly property color diffHtmlBackground: "#1e1e1e"
    readonly property color diffHtmlText: "#dcddde"
    readonly property color diffHtmlAddedBg: "#1a2f1f"
    readonly property color diffHtmlAddedText: "#3fb950"
    readonly property color diffHtmlRemovedBg: "#2f1a1f"
    readonly property color diffHtmlRemovedText: "#f85149"
    readonly property color diffHtmlLineNumberBg: "#262626"
    readonly property color diffHtmlLineNumberText: "#6b6b6b"
    readonly property color diffHtmlSeparator: "#333333"
    readonly property color diffHtmlInlineAdded: "#2d4a32"
    readonly property color diffHtmlInlineRemoved: "#4a2d32"

    // Branch / tag palette (Obsidian graph colors)
    readonly property color tagPurple: "#7f6df2"
    readonly property color tagBlue: "#61afef"
    readonly property color tagGreen: "#3fb950"
    readonly property color tagYellow: "#e5b567"
    readonly property color tagOrange: "#d19a66"
    readonly property color tagRed: "#e06c75"
    readonly property color tagCyan: "#56b6c2"
    readonly property color tagPink: "#c678dd"

    readonly property color link: "#a882ff"
    readonly property color codeBackground: "#262626"

    // Typography
    readonly property string fontFamilyUI: "Segoe UI"
    readonly property string fontMonospace: "Consolas"
    readonly property int fontPixelSizeCaption: 10
    readonly property int fontPixelSizeSmall: 11
    readonly property int fontPixelSizeBody: 13
    readonly property int fontPixelSizeSubhead: 13
    readonly property int fontPixelSizeTitle: 14
    readonly property int fontPixelSizeHeadline: 16
    readonly property color textMonospace: "#dcddde"

    // Border radius (Obsidian: slightly rounder controls)
    readonly property int radiusSmall: 4
    readonly property int radiusMedium: 6
    readonly property int radiusLarge: 8
    readonly property int radiusBadge: 8

    // Control metrics (Obsidian: compact sidebar controls)
    readonly property int controlHeight: 28
    readonly property int controlHeightComfortable: 32
    readonly property int controlHeightSmall: 24
    readonly property int inputPaddingH: 8
    readonly property int inputPaddingV: 4
    readonly property int textareaPaddingH: 8
    readonly property int textareaPaddingV: 6
    readonly property int buttonPaddingH: 12
    readonly property int buttonPaddingV: 4
    readonly property int buttonPaddingIcon: 2
    readonly property int buttonMinWidth: 72

    // ComboBox / dropdown
    readonly property int comboPopupGap: 4
    readonly property int comboPopupPadding: 4
    readonly property int comboItemHeight: 28
    readonly property int comboItemPaddingH: 10
    readonly property int comboItemPaddingV: 4
    readonly property int comboIndicatorInset: 6
    readonly property int comboIndicatorWidth: 18

    // Search field
    readonly property int searchPaddingH: 8
    readonly property int searchIconGap: 6
    readonly property int searchClearInset: 4

    // Panel layout
    readonly property int panelOuterMargin: 8
    readonly property int panelSectionSpacing: 8
    readonly property int segmentInnerMargin: 2

    // Input fields
    readonly property color inputBackground: "#262626"
    readonly property color inputBorder: "#333333"
    readonly property color inputBorderHover: "#444444"
    readonly property color inputBorderFocus: "#7f6df2"

    // Buttons
    readonly property color buttonPrimaryBg: "#7f6df2"
    readonly property color buttonPrimaryBgHover: "#9580ff"
    readonly property color buttonPrimaryBgPressed: "#6c5ce7"
    readonly property color buttonPrimaryText: "#ffffff"
    readonly property color buttonSecondaryBg: "#2d2d2d"
    readonly property color buttonSecondaryBgHover: "#363636"
    readonly property color buttonSecondaryBorder: "#333333"
    readonly property color buttonSecondaryText: "#dcddde"
    readonly property color buttonGhostBg: "transparent"
    readonly property color buttonGhostBgHover: "#2a2a2a"
    readonly property color buttonGhostText: "#999999"
    readonly property color buttonGhostTextHover: "#dcddde"

    // Context menu
    readonly property color contextMenuBackground: "#262626"
    readonly property color contextMenuBorderColor: "#333333"
    readonly property int contextMenuRadius: 6
    readonly property int contextMenuPadding: 6
    readonly property int contextMenuItemHeight: 28
    readonly property int contextMenuSeparatorHeight: 6
    readonly property int contextMenuTextLeftMargin: 10
    readonly property int contextMenuFontSize: 11
    readonly property color contextMenuTextColor: "#dcddde"
    readonly property color contextMenuHoverBg: "#2a2a2a"
    readonly property color contextMenuSeparatorColor: "#333333"
    readonly property real contextMenuSeparatorOpacity: 0.6
    readonly property int contextMenuMinWidth: 200

    // Checkbox
    readonly property int checkboxSpacing: 6
    readonly property int checkboxSize: 14
    readonly property color checkboxBorder: "#555555"
    readonly property color checkboxBg: "#262626"
    readonly property color checkboxChecked: "#7f6df2"
}
