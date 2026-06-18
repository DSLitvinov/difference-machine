import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property url previewSource: ""
    property string lockLabel: ""
    property url lockIconSource: ""

    implicitWidth: 200
    implicitHeight: width

    Rectangle {
        anchors.fill: parent
        radius: DfmTheme.radius200
        color: DfmTheme.fillDefault
        border.width: 1
        border.color: DfmTheme.borderOnLayer1
        clip: true

        Image {
            anchors.fill: parent
            visible: root.previewSource !== ""
            source: root.previewSource
            fillMode: Image.PreserveAspectCrop
            smooth: true
        }

        RowLayout {
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            anchors.margins: DfmTheme.space200
            spacing: DfmTheme.space100

            DfmBadge {
                badgeStyle: DfmBadge.Style.Secondary
                text: root.lockLabel
                showLabel: root.lockLabel !== ""
                leftIconSource: root.lockIconSource
                showLeftIcon: root.lockIconSource !== ""
                showRightIcon: false
            }
        }
    }
}
