import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0
import "."

Rectangle {
    id: deletedFileStub
    color: theme.background

    property var theme: Theme {}

    StubTemplate {
        anchors.centerIn: parent
        theme: deletedFileStub.theme
        iconSource: theme.getIconPath("trash.svg")
        titleText: qsTr("This file deleted")
    }
}
