import QtQuick 6.6
import QtQuick.Controls 6.6
import Dfm.UiKit 1.0

TabBar {
    id: control

    implicitHeight: 40
    spacing: DfmTheme.space200
    padding: DfmTheme.space200

    background: Rectangle {
        color: DfmTheme.layer1
        radius: DfmTheme.radius200
    }
}
