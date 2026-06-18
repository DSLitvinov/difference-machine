import QtQuick 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

Item {
    id: root

    property bool selected: false
    property string formatText: "file format"
    property url previewSource: ""
    property bool locked: false
    property bool adding: false
    property bool editing: false
    property bool deleted: false
    property url lockIconSource: ""
    property url addIconSource: ""
    property url editIconSource: ""
    property url deleteIconSource: ""

    signal clicked()

    implicitWidth: DfmTheme.fileCardSize
    implicitHeight: DfmTheme.fileCardSize

    Rectangle {
        id: chrome
        anchors.fill: parent
        radius: DfmTheme.radius200
        color: DfmTheme.fillDefault
        border.width: root.selected ? 2 : 1
        border.color: root.selected ? DfmTheme.fillAccent : DfmTheme.borderControlDefault

        Image {
            anchors.fill: parent
            anchors.margins: 1
            visible: root.previewSource !== ""
            source: root.previewSource
            fillMode: Image.PreserveAspectCrop
            smooth: true
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: DfmTheme.space200
            spacing: 0

            Item { Layout.fillHeight: true; Layout.fillWidth: true }

            Text {
                Layout.alignment: Qt.AlignHCenter
                visible: root.previewSource === ""
                text: root.formatText
                font.family: DfmTheme.fontFamily
                font.pixelSize: DfmTheme.fontSizeBodySmall
                color: DfmTheme.contentDisabled
            }

            RowLayout {
                Layout.alignment: Qt.AlignRight
                spacing: DfmTheme.space100

                DfmBadge {
                    visible: root.deleted
                    badgeStyle: DfmBadge.Style.Negative
                    showLabel: false
                    leftIconSource: root.deleteIconSource
                    showLeftIcon: root.deleteIconSource !== ""
                }

                DfmBadge {
                    visible: root.adding
                    badgeStyle: DfmBadge.Style.Secondary
                    showLabel: false
                    leftIconSource: root.addIconSource
                    showLeftIcon: root.addIconSource !== ""
                }

                DfmBadge {
                    visible: root.editing
                    badgeStyle: DfmBadge.Style.Secondary
                    showLabel: false
                    leftIconSource: root.editIconSource
                    showLeftIcon: root.editIconSource !== ""
                }

                DfmBadge {
                    visible: root.locked
                    badgeStyle: DfmBadge.Style.Secondary
                    showLabel: false
                    leftIconSource: root.lockIconSource
                    showLeftIcon: root.lockIconSource !== ""
                }
            }
        }
    }

    HoverHandler {
        id: hover
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.clicked()
    }

    states: State {
        name: "hovered"
        when: hover.hovered && !root.selected
        PropertyChanges {
            target: chrome
            border.color: DfmTheme.fillAccentHover
        }
    }
}
