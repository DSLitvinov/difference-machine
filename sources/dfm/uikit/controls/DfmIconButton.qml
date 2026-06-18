import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Templates 6.6 as T
import Dfm.UiKit 1.0

T.Button {
    id: control

    enum Variant {
        Subtle,
        Secondary
    }

    property int variant: DfmIconButton.Variant.Subtle
    property bool selected: false
    property bool loading: false
    property url iconSource: ""

    implicitWidth: DfmTheme.iconButtonSize
    implicitHeight: DfmTheme.iconButtonSize

    padding: DfmTheme.space200
    enabled: !loading

    contentItem: Item {
        anchors.fill: parent

        BusyIndicator {
            anchors.centerIn: parent
            visible: control.loading
            running: control.loading
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
        }

        Image {
            anchors.centerIn: parent
            visible: !control.loading && control.iconSource !== ""
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            source: control.iconSource
            fillMode: Image.PreserveAspectFit
            opacity: control.enabled ? 1.0 : 0.4
        }
    }

    background: Rectangle {
        radius: DfmTheme.radius200
        color: {
            if (!control.enabled)
                return "transparent"
            if (control.selected)
                return DfmTheme.fillSelected
            if (control.hovered || control.pressed)
                return variant === DfmIconButton.Variant.Secondary ? DfmTheme.fillSelected : Qt.rgba(0, 0, 0, 0.04)
            return variant === DfmIconButton.Variant.Secondary ? DfmTheme.fillDefault : "transparent"
        }
        border.width: variant === DfmIconButton.Variant.Secondary ? 1 : 0
        border.color: DfmTheme.borderControlDefault
    }
}
