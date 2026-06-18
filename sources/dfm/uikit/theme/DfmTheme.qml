pragma Singleton
import QtQuick 6.6

/**
 * Design tokens from Figma DFM (light theme only).
 */
QtObject {
    id: theme

    // Layers
    readonly property color background: "#f4f2f4"
    readonly property color layer1: "#ffffff"
    readonly property color layer2: "#ffffff"
    readonly property color borderOnLayer1: "#e4e2e4"
    readonly property color borderOnLayer1Alt: "#eaebf0"
    readonly property color borderOnLayer2: "#e4e2e4"

    // Components / fills
    readonly property color fillDefault: "#ffffff"
    readonly property color fillAccent: "#1a1523"
    readonly property color fillAccentHover: "#6f6e77"
    readonly property color fillSelected: "#dcdbdd"
    readonly property color fillSubstrate: "#908e96"
    readonly property color fillDisabled: Qt.rgba(8 / 255, 1 / 255, 15 / 255, 0.14)

    // Borders
    readonly property color borderControl: "#d5d6dc"
    readonly property color borderControlDefault: "#c8c7cb"

    // Content
    readonly property color contentPrimary: "#1a1523"
    readonly property color contentSecondary: "#6f6e77"
    readonly property color contentOnSolid: "#ffffff"
    readonly property color contentNegative: "#cd2b31"
    readonly property color contentDisabled: Qt.rgba(8 / 255, 1 / 255, 15 / 255, 0.14)

    // Badges
    readonly property color badgeAccent: "#18181b"
    readonly property color badgeNegative: "#cd2b31"

    // Sidebar
    readonly property color sidebarItemSelected: "#1a1523"

    // Shadow
    readonly property color shadowBottomXs: Qt.rgba(26 / 255, 21 / 255, 35 / 255, 0.09)

    // Typography
    readonly property string fontFamily: "Inter"
    readonly property int fontSizeCaption: 12
    readonly property int fontSizeBody: 14
    readonly property int fontSizeBodySmall: 13
    readonly property int fontSizeHeadline: 16
    readonly property int lineHeightCaption: 16
    readonly property int lineHeightBody: 20
    readonly property int lineHeightBodySmall: 18
    readonly property int lineHeightHeadline: 24
    readonly property int fontWeightRegular: Font.Normal
    readonly property int fontWeightMedium: Font.Medium
    readonly property int fontWeightSemiBold: Font.DemiBold

    // Spacing
    readonly property int space0: 0
    readonly property int space50: 2
    readonly property int space100: 4
    readonly property int space150: 6
    readonly property int space200: 8
    readonly property int space300: 12
    readonly property int space400: 16
    readonly property int space500: 20
    readonly property int space600: 24

    // Radius
    readonly property int radiusXs: 2
    readonly property int radiusSm: 4
    readonly property int radiusMd: 6
    readonly property int radius200: 8
    readonly property int radius300: 12
    readonly property int radiusFull: 400

    // Sizes
    readonly property int controlHeight: 36
    readonly property int buttonHeight: 36
    readonly property int iconButtonSize: 36
    readonly property int sidebarItemHeight: 32
    readonly property int actionBarMinHeight: 40
    readonly property int footerHeight: 40
    readonly property int sidebarWidthDefault: 256
    readonly property int sidebarWidthWide: 300
    readonly property int iconSizeSm: 16
    readonly property int iconSizeMd: 20
    readonly property int badgeHeight: 22
    readonly property int fileCardSize: 128
    readonly property int sliderTrackHeight: 4
    readonly property int sliderKnobSize: 16

    // Panel defaults
    readonly property int sidebarDefaultWidth: 256
}
