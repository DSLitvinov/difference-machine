import QtQuick 6.6

QtObject {
    // Obsidian Moonstone-inspired light palette
    readonly property color background: "#ffffff"
    readonly property color backgroundSecondary: "#f2f3f5"
    readonly property color backgroundTertiary: "#e8e9eb"
    readonly property color backgroundHover: "#e8e9eb"
    readonly property color backgroundSelected: "#e3e1f5"
    readonly property color backgroundSelectedAccent: "#e3e1f5"
    readonly property color textSelected: "#1e1e1e"

    readonly property color menuBarBackground: "#f2f3f5"
    readonly property color tabBarBackground: "#f2f3f5"
    readonly property color tabBarActiveBackground: "#ffffff"
    readonly property color tabBarActiveIndicator: "#7f6df2"

    readonly property color divider: "#d4d4d8"

    readonly property color textPrimary: "#1e1e1e"
    readonly property color textSecondary: "#555555"
    readonly property color textTertiary: "#888888"
    readonly property color textDisabled: "#aaaaaa"
    readonly property color textPlaceholder: "#888888"

    readonly property color scrollBarBackground: "#ffffff"
    readonly property color scrollBarNormal: "#d4d4d8"
    readonly property color scrollBarHover: "#b0b0b0"
    readonly property color scrollBarPressed: "#909090"

    readonly property color metadataPanelBackground: "#f2f3f5"

    readonly property color accent: "#7f6df2"
    readonly property color accentHover: "#6c5ce7"
    readonly property color accentMuted: "#a896f0"
    readonly property color accentLanguage: "#6c5ce7"

    readonly property color error: "#d73a49"
    readonly property color diffAdded: "#22863a"
    readonly property color diffRemoved: "#cb2431"
    readonly property color diffModified: "#7f6df2"
    readonly property color diffDeleted: "#6a737d"

    readonly property string fontFamilyUI: "Segoe UI"
    readonly property string fontMonospace: "Consolas"
    readonly property int fontPixelSizeCaption: 10
    readonly property int fontPixelSizeSmall: 11
    readonly property int fontPixelSizeBody: 13
    readonly property int fontPixelSizeSubhead: 13
    readonly property int fontPixelSizeTitle: 14
    readonly property int fontPixelSizeHeadline: 16
    readonly property color textMonospace: "#1e1e1e"

    readonly property int radiusSmall: 4
    readonly property int radiusMedium: 6
    readonly property int radiusLarge: 8
    readonly property int radiusBadge: 8

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

    readonly property int comboPopupGap: 4
    readonly property int comboPopupPadding: 4
    readonly property int comboItemHeight: 28
    readonly property int comboItemPaddingH: 10
    readonly property int comboItemPaddingV: 4
    readonly property int comboIndicatorInset: 6
    readonly property int comboIndicatorWidth: 18

    readonly property int searchPaddingH: 8
    readonly property int searchIconGap: 6
    readonly property int searchClearInset: 4

    readonly property int panelOuterMargin: 8
    readonly property int panelSectionSpacing: 8
    readonly property int segmentInnerMargin: 2

    readonly property color inputBackground: "#ffffff"
    readonly property color inputBorder: "#d4d4d8"
    readonly property color inputBorderHover: "#b0b0b0"
    readonly property color inputBorderFocus: "#7f6df2"

    readonly property color buttonPrimaryBg: "#7f6df2"
    readonly property color buttonPrimaryBgHover: "#6c5ce7"
    readonly property color buttonPrimaryBgPressed: "#5b4bc4"
    readonly property color buttonPrimaryText: "#ffffff"
    readonly property color buttonSecondaryBg: "#f2f3f5"
    readonly property color buttonSecondaryBgHover: "#e8e9eb"
    readonly property color buttonSecondaryBorder: "#d4d4d8"
    readonly property color buttonSecondaryText: "#1e1e1e"
    readonly property color buttonGhostBg: "transparent"
    readonly property color buttonGhostBgHover: "#e8e9eb"
    readonly property color buttonGhostText: "#555555"
    readonly property color buttonGhostTextHover: "#1e1e1e"

    readonly property color contextMenuBackground: "#ffffff"
    readonly property color contextMenuBorderColor: "#d4d4d8"
    readonly property int contextMenuRadius: 6
    readonly property int contextMenuPadding: 6
    readonly property int contextMenuItemHeight: 28
    readonly property int contextMenuSeparatorHeight: 6
    readonly property int contextMenuTextLeftMargin: 10
    readonly property int contextMenuFontSize: 11
    readonly property color contextMenuTextColor: "#1e1e1e"
    readonly property color contextMenuHoverBg: "#e8e9eb"
    readonly property color contextMenuSeparatorColor: "#d4d4d8"
    readonly property real contextMenuSeparatorOpacity: 0.6
    readonly property int contextMenuMinWidth: 200

    readonly property int checkboxSpacing: 6
    readonly property int checkboxSize: 14
    readonly property color checkboxBorder: "#b0b0b0"
    readonly property color checkboxBg: "#ffffff"
    readonly property color checkboxChecked: "#7f6df2"
}
