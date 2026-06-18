import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

ComboBox {
    id: control

    property var theme: Theme {}

    implicitHeight: theme.controlHeight
    leftPadding: theme.inputPaddingH
    rightPadding: theme.comboIndicatorWidth + theme.comboIndicatorInset
    topPadding: theme.inputPaddingV
    bottomPadding: theme.inputPaddingV
    font.family: theme.fontFamilyUI
    font.pixelSize: theme.fontPixelSizeBody

    delegate: ItemDelegate {
        id: comboItem
        width: ListView.view ? ListView.view.width : control.width
        height: theme.comboItemHeight
        highlighted: control.highlightedIndex === index
        text: control.textRole
              ? (Array.isArray(control.model) ? modelData : (model[control.textRole] || ""))
              : (Array.isArray(control.model) ? modelData : "")

        contentItem: Text {
            text: comboItem.text
            color: comboItem.highlighted ? theme.textSelected : theme.textPrimary
            font.family: theme.fontFamilyUI
            font.pixelSize: theme.fontPixelSizeBody
            verticalAlignment: Text.AlignVCenter
            elide: Text.ElideRight
            leftPadding: theme.comboItemPaddingH
            rightPadding: theme.comboItemPaddingH
            topPadding: theme.comboItemPaddingV
            bottomPadding: theme.comboItemPaddingV
        }

        background: Rectangle {
            radius: theme.radiusSmall
            color: comboItem.highlighted ? theme.backgroundSelected
                 : (comboItem.hovered ? theme.backgroundHover : "transparent")
        }
    }

    contentItem: Text {
        text: control.displayText
        font.family: theme.fontFamilyUI
        font.pixelSize: theme.fontPixelSizeBody
        color: theme.textPrimary
        verticalAlignment: Text.AlignVCenter
        elide: Text.ElideMiddle
    }

    indicator: Text {
        x: control.width - width - theme.comboIndicatorInset
        y: (control.height - height) / 2
        width: theme.comboIndicatorWidth
        horizontalAlignment: Text.AlignHCenter
        text: "▾"
        color: theme.textTertiary
        font.pixelSize: theme.fontPixelSizeSmall
    }

    background: Rectangle {
        radius: theme.radiusMedium
        color: theme.inputBackground
        border.width: 1
        border.color: {
            if (control.activeFocus) return theme.inputBorderFocus
            if (control.hovered) return theme.inputBorderHover
            return theme.inputBorder
        }
    }

    popup: Popup {
        y: control.height + theme.comboPopupGap
        width: Math.max(control.width, theme.contextMenuMinWidth)
        padding: theme.comboPopupPadding
        implicitHeight: contentItem.implicitHeight + 2 * theme.comboPopupPadding

        contentItem: ListView {
            clip: true
            spacing: 0
            implicitHeight: Math.min(contentHeight, 280)
            model: control.popup.visible ? control.delegateModel : null
            currentIndex: control.highlightedIndex
            ScrollIndicator.vertical: ScrollIndicator { }
        }

        background: Rectangle {
            color: theme.contextMenuBackground
            border.color: theme.contextMenuBorderColor
            border.width: 1
            radius: theme.contextMenuRadius
        }
    }
}
