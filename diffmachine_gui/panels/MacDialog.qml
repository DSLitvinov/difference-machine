import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0

/**
 * macOS-style modal dialog with auto-sizing based on content.
 * Width and height are calculated automatically from content.
 * Set explicit width/height only if you need to override auto-sizing.
 *
 * MacDialog {
 *     theme: myTheme
 *     title: qsTr("Title")
 *     Text { text: "Message"; wrapMode: Text.WordWrap; Layout.fillWidth: true }
 *     RowLayout {
 *         Item { Layout.fillWidth: true }
 *         MacButton { text: qsTr("Cancel"); onClicked: dialog.close() }
 *         MacButton { text: qsTr("OK"); buttonStyle: "primary"; onClicked: { ...; dialog.close() } }
 *     }
 * }
 */
Popup {
    id: macDialog

    property var theme: Theme {}
    property string title: ""
    /** If true, dialog is centered in parent when opened. */
    property bool centerOnOpen: true
    /** Padding around dialog content */
    property int dialogPadding: 20
    /** Minimum content width */
    property int minContentWidth: 280

    default property alias content: dialogContentLayout.data

    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    // Measure title text width
    TextMetrics {
        id: titleMetrics
        font.pixelSize: theme ? theme.fontPixelSizeTitle : 14
        font.bold: true
        text: macDialog.title
    }

    // Auto-size to content
    implicitWidth: Math.max(minContentWidth, titleMetrics.advanceWidth, dialogContentLayout.implicitWidth) + dialogPadding * 2
    implicitHeight: dialogContent.implicitHeight + dialogPadding * 2

    onOpened: {
        if (centerOnOpen && parent) {
            var pw = parent.width || 0
            var ph = parent.height || 0
            var dw = width > 0 ? width : implicitWidth
            var dh = height > 0 ? height : implicitHeight
            if (pw > 0 && ph > 0 && dw > 0 && dh > 0) {
                x = Math.round((pw - dw) / 2)
                y = Math.round((ph - dh) / 2)
            }
        }
    }

    background: Rectangle {
        radius: theme ? theme.radiusLarge : 6
        border.width: 1
        border.color: theme ? theme.divider : "#d0d0d0"
        color: theme ? theme.backgroundSecondary : "#f3f3f3"
    }

    contentItem: ColumnLayout {
        id: dialogContent
        anchors.fill: parent
        anchors.margins: macDialog.dialogPadding
        spacing: 16

        Text {
            text: macDialog.title
            visible: macDialog.title !== ""
            color: theme ? theme.textPrimary : "#000000"
            font.pixelSize: theme ? theme.fontPixelSizeTitle : 14
            font.bold: true
            Layout.fillWidth: true
            wrapMode: Text.NoWrap
        }

        ColumnLayout {
            id: dialogContentLayout
            spacing: 12
            Layout.fillWidth: true
            Layout.fillHeight: true
        }
    }
}
