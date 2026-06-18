import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Templates 6.6 as T
import Dfm.UiKit 1.0

T.Button {
    id: control

    enum Style {
        Primary,
        Secondary
    }

    property int buttonStyle: DfmButton.Style.Primary
    property bool loading: false
    property url leftIconSource: ""
    property url rightIconSource: ""
    property bool showLeftIcon: leftIconSource !== ""
    property bool showRightIcon: rightIconSource !== ""

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentItem.implicitWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentItem.implicitHeight + topPadding + bottomPadding,
                             DfmTheme.buttonHeight)

    padding: DfmTheme.space200
    leftPadding: DfmTheme.space300
    rightPadding: DfmTheme.space300
    spacing: DfmTheme.space100

    font.family: DfmTheme.fontFamily
    font.pixelSize: DfmTheme.fontSizeBody
    font.weight: DfmTheme.fontWeightRegular

    enabled: !loading

    contentItem: Row {
        spacing: control.spacing
        anchors.centerIn: parent

        Image {
            visible: control.showLeftIcon && !control.loading
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            source: control.leftIconSource
            fillMode: Image.PreserveAspectFit
            opacity: control.enabled ? 1.0 : 0.5
        }

        BusyIndicator {
            visible: control.loading
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            running: control.loading
        }

        Text {
            visible: control.text !== ""
            text: control.text
            font: control.font
            color: control.enabled ? control.__textColor : DfmTheme.contentDisabled
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }

        Image {
            visible: control.showRightIcon && !control.loading
            width: DfmTheme.iconSizeMd
            height: DfmTheme.iconSizeMd
            source: control.rightIconSource
            fillMode: Image.PreserveAspectFit
            opacity: control.enabled ? 1.0 : 0.5
        }
    }

    readonly property color __textColor: {
        if (buttonStyle === DfmButton.Style.Primary)
            return DfmTheme.contentOnSolid
        return DfmTheme.contentSecondary
    }

    background: Rectangle {
        radius: DfmTheme.radius200
        color: {
            if (!control.enabled)
                return buttonStyle === DfmButton.Style.Primary ? DfmTheme.fillDisabled : DfmTheme.fillDefault
            if (control.pressed || control.down)
                return buttonStyle === DfmButton.Style.Primary ? DfmTheme.fillAccent : DfmTheme.fillSelected
            if (control.hovered)
                return buttonStyle === DfmButton.Style.Primary ? DfmTheme.fillAccentHover : DfmTheme.fillDefault
            return buttonStyle === DfmButton.Style.Primary ? DfmTheme.fillAccent : DfmTheme.fillDefault
        }
        border.width: buttonStyle === DfmButton.Style.Secondary ? 1 : 0
        border.color: DfmTheme.borderControlDefault
    }
}
