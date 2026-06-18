import QtQuick 6.6
import QtQuick.Controls 6.6
import Dfm.UiKit 1.0

Slider {
    id: control

    implicitWidth: 240
    implicitHeight: DfmTheme.sliderKnobSize

    from: 0
    to: 100
    stepSize: 1

    background: Item {
        x: control.leftPadding
        y: (control.height - DfmTheme.sliderTrackHeight) / 2
        width: control.availableWidth
        height: DfmTheme.sliderTrackHeight

        Rectangle {
            anchors.fill: parent
            radius: height / 2
            color: DfmTheme.fillSubstrate
        }

        Rectangle {
            width: control.visualPosition * parent.width
            height: parent.height
            radius: height / 2
            color: DfmTheme.fillAccent
        }
    }

    handle: Rectangle {
        x: control.leftPadding + control.visualPosition * (control.availableWidth - width)
        y: (control.height - height) / 2
        width: DfmTheme.sliderKnobSize
        height: DfmTheme.sliderKnobSize
        radius: width / 2
        color: DfmTheme.fillDefault
        border.width: 1
        border.color: DfmTheme.borderControlDefault
    }
}
