import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0

/**
 * Шаблон заглушки: иконка, заголовок (primary, жирный), вспомогательный текст (secondary, регуляр).
 * Все элементы выровнены по центру.
 */
Column {
    id: stubTemplate
    anchors.centerIn: parent
    spacing: 16

    property var theme: Theme {}
    property string iconSource: ""
    property string titleText: ""
    property string auxiliaryText: ""
    property int contentMaxWidth: 360
    property int iconSize: 36

    Image {
        anchors.horizontalCenter: parent.horizontalCenter
        source: stubTemplate.iconSource
        width: stubTemplate.iconSize
        height: stubTemplate.iconSize
        fillMode: Image.PreserveAspectFit
        visible: stubTemplate.iconSource !== ""
        opacity: 0.85
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: stubTemplate.titleText
        color: theme.textPrimary
        font.pixelSize: theme.fontPixelSizeHeadline
        font.bold: true
        horizontalAlignment: Text.AlignHCenter
        wrapMode: Text.Wrap
        width: stubTemplate.parent && stubTemplate.parent.width > 0 ? Math.min(stubTemplate.parent.width - 40, stubTemplate.contentMaxWidth) : stubTemplate.contentMaxWidth
    }

    Text {
        anchors.horizontalCenter: parent.horizontalCenter
        text: stubTemplate.auxiliaryText
        visible: stubTemplate.auxiliaryText !== ""
        color: theme.textSecondary
        font.pixelSize: theme.fontPixelSizeBody
        font.bold: false
        horizontalAlignment: Text.AlignHCenter
        wrapMode: Text.Wrap
        width: stubTemplate.parent && stubTemplate.parent.width > 0 ? Math.min(stubTemplate.parent.width - 40, stubTemplate.contentMaxWidth) : stubTemplate.contentMaxWidth
    }
}
