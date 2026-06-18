import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

AbstractButton {
    id: control

    property url iconSource: ""
    property int iconSize: DfmTheme.iconSizeSm
    property string badgeText: ""
    property bool showBadge: badgeText !== ""
    property url chevronIconSource: ""
    property bool showChevron: chevronIconSource !== ""

    implicitWidth: row.implicitWidth + DfmTheme.space200 * 2
    implicitHeight: DfmTheme.sidebarItemHeight

    padding: DfmTheme.space150
    leftPadding: DfmTheme.space200
    rightPadding: DfmTheme.space200

    background: Rectangle {
        radius: control.checked ? DfmTheme.radius200 : DfmTheme.radiusSm
        color: control.checked ? DfmTheme.sidebarItemSelected : (control.hovered ? Qt.rgba(0, 0, 0, 0.04) : "transparent")
    }

    contentItem: RowLayout {
        id: row
        spacing: DfmTheme.space200

        Image {
            visible: control.iconSource !== ""
            Layout.preferredWidth: control.iconSize
            Layout.preferredHeight: control.iconSize
            source: control.iconSource
            fillMode: Image.PreserveAspectFit
        }

        Text {
            Layout.fillWidth: true
            text: control.text
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeBody
            color: control.checked ? DfmTheme.contentOnSolid : DfmTheme.contentPrimary
            elide: Text.ElideRight
        }

        Text {
            visible: control.showBadge
            text: control.badgeText
            font.family: DfmTheme.fontFamily
            font.pixelSize: DfmTheme.fontSizeCaption
            color: DfmTheme.contentSecondary
        }

        Image {
            visible: control.showChevron
            Layout.preferredWidth: DfmTheme.iconSizeSm
            Layout.preferredHeight: DfmTheme.iconSizeSm
            source: control.chevronIconSource
            fillMode: Image.PreserveAspectFit
        }
    }
}
