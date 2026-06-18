import QtQuick 6.6
import QtQuick.Controls 6.6

QtObject {
    id: theme

    property var darkTheme: null
    property var lightTheme: null

    Component.onCompleted: {
        var darkComp = Qt.createComponent(Qt.resolvedUrl("DarkTheme.qml"))
        if (darkComp.status === Component.Ready)
            darkTheme = darkComp.createObject(theme)
        else
            console.error("Failed to load DarkTheme:", darkComp.errorString())

        var lightComp = Qt.createComponent(Qt.resolvedUrl("LightTheme.qml"))
        if (lightComp.status === Component.Ready)
            lightTheme = lightComp.createObject(theme)
        else
            console.error("Failed to load LightTheme:", lightComp.errorString())
    }

    readonly property bool isDark: {
        if (Qt.application && Qt.application.styleHints)
            return Qt.application.styleHints.colorScheme === Qt.Dark
        return true
    }

    readonly property var currentTheme: isDark ? darkTheme : lightTheme

    function _t(prop, fallback) {
        return currentTheme ? currentTheme[prop] : fallback
    }

    // Colors
    readonly property color background: _t("background", "#1e1e1e")
    readonly property color backgroundSecondary: _t("backgroundSecondary", "#262626")
    readonly property color backgroundTertiary: _t("backgroundTertiary", "#2a2a2a")
    readonly property color backgroundHover: _t("backgroundHover", "#2a2a2a")
    readonly property color backgroundSelected: _t("backgroundSelected", "#363636")
    readonly property color backgroundSelectedAccent: _t("backgroundSelectedAccent", "#3f3a5c")
    readonly property color textSelected: _t("textSelected", "#dcddde")

    readonly property color sidebarBackground: _t("sidebarBackground", "#262626")
    readonly property color sidebarHeaderBackground: _t("sidebarHeaderBackground", "#262626")
    readonly property color contentBackground: _t("contentBackground", "#1e1e1e")

    readonly property color menuBarBackground: _t("menuBarBackground", "#262626")
    readonly property color tabBarBackground: _t("tabBarBackground", "#2a2a2a")
    readonly property color tabBarActiveBackground: _t("tabBarActiveBackground", "#363636")
    readonly property color tabBarActiveIndicator: _t("tabBarActiveIndicator", "#7f6df2")

    readonly property color divider: _t("divider", "#333333")

    readonly property color splitHandleColor: _t("splitHandleColor", "#333333")
    readonly property color splitHandleColorHover: _t("splitHandleColorHover", "#7f6df2")
    readonly property int splitHandleWidth: _t("splitHandleWidth", 1)
    readonly property int splitHandleWidthHover: _t("splitHandleWidthHover", 3)
    readonly property int splitHandleHitWidth: _t("splitHandleHitWidth", 4)

    readonly property color textPrimary: _t("textPrimary", "#dcddde")
    readonly property color textSecondary: _t("textSecondary", "#999999")
    readonly property color textTertiary: _t("textTertiary", "#6b6b6b")
    readonly property color textDisabled: _t("textDisabled", "#555555")
    readonly property color textPlaceholder: _t("textPlaceholder", "#6b6b6b")

    readonly property color scrollBarBackground: _t("scrollBarBackground", "#1e1e1e")
    readonly property color scrollBarNormal: _t("scrollBarNormal", "#3a3a3a")
    readonly property color scrollBarHover: _t("scrollBarHover", "#4a4a4a")
    readonly property color scrollBarPressed: _t("scrollBarPressed", "#555555")

    readonly property color metadataPanelBackground: _t("metadataPanelBackground", "#262626")

    readonly property color accent: _t("accent", "#7f6df2")
    readonly property color accentHover: _t("accentHover", "#9580ff")
    readonly property color accentMuted: _t("accentMuted", "#5c4db0")
    readonly property color accentLanguage: _t("accentLanguage", "#a882ff")

    readonly property color error: _t("error", "#e06c75")
    readonly property color diffAdded: _t("diffAdded", "#3fb950")
    readonly property color diffRemoved: _t("diffRemoved", "#f85149")
    readonly property color diffModified: _t("diffModified", "#7f6df2")
    readonly property color diffDeleted: _t("diffDeleted", "#6b6b6b")

    readonly property color diffHtmlBackground: _t("diffHtmlBackground", "#1e1e1e")
    readonly property color diffHtmlText: _t("diffHtmlText", "#dcddde")
    readonly property color diffHtmlAddedBg: _t("diffHtmlAddedBg", "#1a2f1f")
    readonly property color diffHtmlAddedText: _t("diffHtmlAddedText", "#3fb950")
    readonly property color diffHtmlRemovedBg: _t("diffHtmlRemovedBg", "#2f1a1f")
    readonly property color diffHtmlRemovedText: _t("diffHtmlRemovedText", "#f85149")
    readonly property color diffHtmlLineNumberBg: _t("diffHtmlLineNumberBg", "#262626")
    readonly property color diffHtmlLineNumberText: _t("diffHtmlLineNumberText", "#6b6b6b")
    readonly property color diffHtmlSeparator: _t("diffHtmlSeparator", "#333333")
    readonly property color diffHtmlInlineAdded: _t("diffHtmlInlineAdded", "#2d4a32")
    readonly property color diffHtmlInlineRemoved: _t("diffHtmlInlineRemoved", "#4a2d32")

    readonly property color tagPurple: _t("tagPurple", "#7f6df2")
    readonly property color tagBlue: _t("tagBlue", "#61afef")
    readonly property color tagGreen: _t("tagGreen", "#3fb950")
    readonly property color tagYellow: _t("tagYellow", "#e5b567")
    readonly property color tagOrange: _t("tagOrange", "#d19a66")
    readonly property color tagRed: _t("tagRed", "#e06c75")
    readonly property color tagCyan: _t("tagCyan", "#56b6c2")
    readonly property color tagPink: _t("tagPink", "#c678dd")

    readonly property color link: _t("link", "#a882ff")
    readonly property color codeBackground: _t("codeBackground", "#262626")

    // Typography
    readonly property string fontFamilyUI: _t("fontFamilyUI", "Segoe UI")
    readonly property string fontMonospace: _t("fontMonospace", "Consolas")
    readonly property int fontPixelSizeCaption: _t("fontPixelSizeCaption", 10)
    readonly property int fontPixelSizeSmall: _t("fontPixelSizeSmall", 11)
    readonly property int fontPixelSizeBody: _t("fontPixelSizeBody", 13)
    readonly property int fontPixelSizeSubhead: _t("fontPixelSizeSubhead", 13)
    readonly property int fontPixelSizeTitle: _t("fontPixelSizeTitle", 14)
    readonly property int fontPixelSizeHeadline: _t("fontPixelSizeHeadline", 16)
    readonly property color textMonospace: _t("textMonospace", textPrimary)

    // Radius
    readonly property int radiusSmall: _t("radiusSmall", 4)
    readonly property int radiusMedium: _t("radiusMedium", 6)
    readonly property int radiusLarge: _t("radiusLarge", 8)
    readonly property int radiusBadge: _t("radiusBadge", 8)

    // Control metrics
    readonly property int controlHeight: _t("controlHeight", 28)
    readonly property int controlHeightComfortable: _t("controlHeightComfortable", 32)
    readonly property int controlHeightSmall: _t("controlHeightSmall", 24)
    readonly property int inputPaddingH: _t("inputPaddingH", 8)
    readonly property int inputPaddingV: _t("inputPaddingV", 4)
    readonly property int textareaPaddingH: _t("textareaPaddingH", 8)
    readonly property int textareaPaddingV: _t("textareaPaddingV", 6)
    readonly property int buttonPaddingH: _t("buttonPaddingH", 12)
    readonly property int buttonPaddingV: _t("buttonPaddingV", 4)
    readonly property int buttonPaddingIcon: _t("buttonPaddingIcon", 2)
    readonly property int buttonMinWidth: _t("buttonMinWidth", 72)

    readonly property int comboPopupGap: _t("comboPopupGap", 4)
    readonly property int comboPopupPadding: _t("comboPopupPadding", 4)
    readonly property int comboItemHeight: _t("comboItemHeight", 28)
    readonly property int comboItemPaddingH: _t("comboItemPaddingH", 10)
    readonly property int comboItemPaddingV: _t("comboItemPaddingV", 4)
    readonly property int comboIndicatorInset: _t("comboIndicatorInset", 6)
    readonly property int comboIndicatorWidth: _t("comboIndicatorWidth", 18)

    readonly property int searchPaddingH: _t("searchPaddingH", 8)
    readonly property int searchIconGap: _t("searchIconGap", 6)
    readonly property int searchClearInset: _t("searchClearInset", 4)

    readonly property int panelOuterMargin: _t("panelOuterMargin", 8)
    readonly property int panelSectionSpacing: _t("panelSectionSpacing", 8)
    readonly property int segmentInnerMargin: _t("segmentInnerMargin", 2)

    // Input
    readonly property color inputBackground: _t("inputBackground", "#262626")
    readonly property color inputBorder: _t("inputBorder", "#333333")
    readonly property color inputBorderHover: _t("inputBorderHover", "#444444")
    readonly property color inputBorderFocus: _t("inputBorderFocus", "#7f6df2")

    // Buttons
    readonly property color buttonPrimaryBg: _t("buttonPrimaryBg", "#7f6df2")
    readonly property color buttonPrimaryBgHover: _t("buttonPrimaryBgHover", "#9580ff")
    readonly property color buttonPrimaryBgPressed: _t("buttonPrimaryBgPressed", "#6c5ce7")
    readonly property color buttonPrimaryText: _t("buttonPrimaryText", "#ffffff")
    readonly property color buttonSecondaryBg: _t("buttonSecondaryBg", "#2d2d2d")
    readonly property color buttonSecondaryBgHover: _t("buttonSecondaryBgHover", "#363636")
    readonly property color buttonSecondaryBorder: _t("buttonSecondaryBorder", "#333333")
    readonly property color buttonSecondaryText: _t("buttonSecondaryText", "#dcddde")
    readonly property color buttonGhostBg: _t("buttonGhostBg", "transparent")
    readonly property color buttonGhostBgHover: _t("buttonGhostBgHover", "#2a2a2a")
    readonly property color buttonGhostText: _t("buttonGhostText", "#999999")
    readonly property color buttonGhostTextHover: _t("buttonGhostTextHover", "#dcddde")

    // Context menu
    readonly property color contextMenuBackground: _t("contextMenuBackground", "#262626")
    readonly property color contextMenuBorderColor: _t("contextMenuBorderColor", "#333333")
    readonly property int contextMenuRadius: _t("contextMenuRadius", 6)
    readonly property int contextMenuPadding: _t("contextMenuPadding", 6)
    readonly property int contextMenuItemHeight: _t("contextMenuItemHeight", 28)
    readonly property int contextMenuSeparatorHeight: _t("contextMenuSeparatorHeight", 6)
    readonly property int contextMenuTextLeftMargin: _t("contextMenuTextLeftMargin", 10)
    readonly property int contextMenuFontSize: _t("contextMenuFontSize", 11)
    readonly property color contextMenuTextColor: _t("contextMenuTextColor", "#dcddde")
    readonly property color contextMenuHoverBg: _t("contextMenuHoverBg", "#2a2a2a")
    readonly property color contextMenuSeparatorColor: _t("contextMenuSeparatorColor", "#333333")
    readonly property real contextMenuSeparatorOpacity: _t("contextMenuSeparatorOpacity", 0.6)
    readonly property int contextMenuMinWidth: _t("contextMenuMinWidth", 200)

    // Checkbox
    readonly property int checkboxSpacing: _t("checkboxSpacing", 6)
    readonly property int checkboxSize: _t("checkboxSize", 14)
    readonly property color checkboxBorder: _t("checkboxBorder", "#555555")
    readonly property color checkboxBg: _t("checkboxBg", "#262626")
    readonly property color checkboxChecked: _t("checkboxChecked", "#7f6df2")

    // Icons
    readonly property string darkIconPath: "../resources/icons/DarkTheme"
    readonly property string lightIconPath: "../resources/icons/LightTheme"
    readonly property string iconPath: isDark ? darkIconPath : lightIconPath

    function getIconPath(iconName) {
        return iconPath + "/" + iconName
    }

    function getBranchColor(branchName) {
        if (!branchName)
            return accent
        var hash = 0
        for (var i = 0; i < branchName.length; i++)
            hash = branchName.charCodeAt(i) + ((hash << 5) - hash)
        var palette = [tagPurple, tagBlue, tagGreen, tagYellow, tagOrange, tagRed, tagCyan, tagPink]
        return palette[Math.abs(hash) % palette.length]
    }

    readonly property string syntaxHighlightStyle: isDark ? "native" : "friendly"
}
