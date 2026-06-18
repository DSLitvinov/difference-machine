import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Templates 6.6 as T
import Dfm.UiKit 1.0

T.Switch {
    id: control

    property string labelText: ""

    implicitWidth: indicator.implicitWidth + (labelText !== "" ? label.implicitWidth + DfmTheme.space200 : 0)
    implicitHeight: Math.max(20, label.implicitHeight)

    indicator: Rectangle {
        id: indicator
        implicitWidth: 32
        implicitHeight: 20
        radius: height / 2
        color: {
            if (!control.enabled)
                return DfmTheme.fillDisabled
            return control.checked ? DfmTheme.fillAccent : DfmTheme.fillSubstrate
        }

        Rectangle {
            x: control.checked ? parent.width - width - 2 : 2
            anchors.verticalCenter: parent.verticalCenter
            width: 16
            height: 16
            radius: width / 2
            color: DfmTheme.fillDefault
            border.width: 1
            border.color: DfmTheme.borderControlDefault

            Behavior on x {
                NumberAnimation { duration: 120; easing.type: Easing.OutCubic }
            }
        }
    }

    contentItem: Text {
        id: label
        visible: control.labelText !== ""
        text: control.labelText
        font.family: DfmTheme.fontFamily
        font.pixelSize: DfmTheme.fontSizeBody
        color: control.enabled ? DfmTheme.contentPrimary : DfmTheme.contentDisabled
        verticalAlignment: Text.AlignVCenter
        leftPadding: control.indicator.width + control.spacing
    }
}
