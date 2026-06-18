import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Rectangle {
    id: root

    enum Style {
        Accent,
        Secondary,
        Outline,
        Negative
    }

    property int badgeStyle: DfmBadge.Style.Accent
    property string text: "Badge"
    property bool showLabel: true
    property url leftIconSource: ""
    property url rightIconSource: ""
    property bool showLeftIcon: leftIconSource !== ""
    property bool showRightIcon: rightIconSource !== ""

    implicitWidth: row.implicitWidth + DfmTheme.space300 * 2
    implicitHeight: DfmTheme.badgeHeight

    radius: height / 2
    color: {
        switch (badgeStyle) {
        case DfmBadge.Style.Accent: return DfmTheme.badgeAccent
        case DfmBadge.Style.Negative: return DfmTheme.badgeNegative
        case DfmBadge.Style.Secondary: return DfmTheme.fillDefault
        case DfmBadge.Style.Outline: return "transparent"
        default: return DfmTheme.badgeAccent
        }
    }
    border.width: badgeStyle === DfmBadge.Style.Secondary || badgeStyle === DfmBadge.Style.Outline ? 1 : 0
    border.color: DfmTheme.borderControlDefault

    readonly property color __textColor: {
        switch (badgeStyle) {
        case DfmBadge.Style.Accent:
        case DfmBadge.Style.Negative:
            return DfmTheme.contentOnSolid
        default:
            return DfmTheme.contentPrimary
        }
    }

    RowLayout {
        id: row
        anchors.centerIn: parent
        spacing: DfmTheme.space100

        Image {
            visible: root.showLeftIcon
            Layout.preferredWidth: DfmTheme.iconSizeSm
            Layout.preferredHeight: DfmTheme.iconSizeSm
            source: root.leftIconSource
            fillMode: Image.PreserveAspectFit
        }

        Text {
            visible: root.showLabel
            text: root.text
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeCaption
            font.weight: DfmTheme.fontWeightSemiBold
            color: root.__textColor
        }

        Image {
            visible: root.showRightIcon
            Layout.preferredWidth: DfmTheme.iconSizeSm
            Layout.preferredHeight: DfmTheme.iconSizeSm
            source: root.rightIconSource
            fillMode: Image.PreserveAspectFit
        }
    }
}
