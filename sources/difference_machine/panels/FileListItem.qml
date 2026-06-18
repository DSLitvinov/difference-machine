import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import resources.styles 1.0
import components 1.0

Rectangle {
    id: fileListItem
    
    // Constants
    readonly property int checkboxAreaWidth: 40  // Width of checkbox area in pixels
    
    // Properties
    property string filePath: ""
    property string displayPath: ""  // Formatted path for display
    property string status: ""
    property string statusText: ""
    property bool checked: false
    property string selectedFilePath: ""
    property var theme: Theme {}
    property var listModel: null  // Reference to the ListModel for updating checked state
    property int modelIndex: -1
    property var onSelectAllStateUpdate: null  // Callback for updating select all state
    property var repositoryManager: null  // For context menu: copy path, reveal in folder
    property var pathUtils: null  // For relative path in context menu
    property var overlayItem: null  // Parent for context menu popup
    
    // Signals
    signal fileSelected(string filePath)
    signal fileCheckedChanged(string filePath, bool checked)
    
    // Computed properties
    readonly property bool isSelected: filePath && selectedFilePath === filePath
    readonly property bool isDeleted: status === "staged_deleted" || status === "unstaged_deleted"
    
    width: parent ? parent.width : 0
    height: 28
    color: mouseArea.containsMouse ? theme.backgroundHover :
           (isSelected ? theme.backgroundSelected : "transparent")
    
    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 8
        
        DmCheckBox {
            id: fileCheckbox
            theme: fileListItem.theme
            enabled: fileListItem.filePath && fileListItem.filePath.length > 0
            checked: fileListItem.checked
            z: 2  // Above MouseArea
            
            onClicked: {
                if (fileListItem.filePath && fileListItem.filePath.length > 0) {
                    if (fileListItem.listModel && fileListItem.modelIndex >= 0) {
                        var newChecked = !fileListItem.checked
                        fileListItem.listModel.setProperty(fileListItem.modelIndex, "checked", newChecked)
                        fileListItem.fileCheckedChanged(fileListItem.filePath, newChecked)
                        if (fileListItem.onSelectAllStateUpdate) {
                            Qt.callLater(fileListItem.onSelectAllStateUpdate)
                        }
                    }
                }
            }
        }
        
        Rectangle {
            Layout.preferredWidth: 16
            Layout.preferredHeight: 16
            radius: theme.radiusBadge
            color: {
                if (fileListItem.status === "staged_modified" || fileListItem.status === "unstaged_modified") {
                    return theme.diffModified
                } else if (fileListItem.status === "staged_deleted" || fileListItem.status === "unstaged_deleted") {
                    return theme.diffDeleted
                } else if (fileListItem.status === "staged_new" || fileListItem.status === "untracked") {
                    return theme.diffAdded
                }
                return theme.textSecondary
            }
            
            Text {
                anchors.centerIn: parent
                text: fileListItem.statusText || ""
                color: theme.buttonPrimaryText
                font.pixelSize: theme.fontPixelSizeCaption
                font.bold: true
            }
        }
        
        Text {
            Layout.fillWidth: true
            Layout.minimumWidth: 0
            text: fileListItem.displayPath || fileListItem.filePath || ""
            color: theme.textPrimary
            font.pixelSize: theme.fontPixelSizeSubhead
            elide: Text.ElideMiddle
            ToolTip.visible: mouseArea.containsMouse && (fileListItem.filePath || "").length > 0
            ToolTip.text: fileListItem.filePath || ""
            ToolTip.delay: 500
        }
        
        DmButton {
            id: menuBtn
            Layout.alignment: Qt.AlignVCenter
            theme: fileListItem.theme
            buttonStyle: "icon"
            iconSource: theme.getIconPath("more-vert.svg")
            iconSize: 16
            opacity: menuBtn.hovered ? 1.0 : 0.6
            onClicked: {
                var overlay = fileListItem.overlayItem || fileListItem
                var pos = menuBtn.mapToItem(overlay, menuBtn.width, menuBtn.height)
                fileContextMenu.filePath = fileListItem.filePath
                fileContextMenu.pathUtils = fileListItem.pathUtils
                fileContextMenu.repositoryManager = fileListItem.repositoryManager
                fileContextMenu.parent = overlay
                fileContextMenu.popup(pos.x, pos.y)
            }
            DmToolTip {
                visible: menuBtn.hovered
                text: qsTr("File actions")
                theme: fileListItem.theme
            }
        }
    }
    
    // MouseArea for file selection - works like TreeViewDelegate onClicked
    MouseArea {
        id: mouseArea
        anchors.fill: parent
        hoverEnabled: true
        cursorShape: Qt.PointingHandCursor
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        onPressed: function(mouse) {
            // Let the checkbox receive clicks in its area
            if (mouse.x < fileListItem.checkboxAreaWidth) {
                mouse.accepted = false
            }
        }
        
        onClicked: function(mouse) {
            // Don't select if clicking in checkbox area
            if (mouse.x < fileListItem.checkboxAreaWidth) {
                mouse.accepted = false
                return
            }
            
            if (mouse.button === Qt.RightButton) {
                var overlay = fileListItem.overlayItem || fileListItem
                var pos = mouseArea.mapToItem(overlay, mouse.x, mouse.y)
                fileContextMenu.filePath = fileListItem.filePath
                fileContextMenu.pathUtils = fileListItem.pathUtils
                fileContextMenu.repositoryManager = fileListItem.repositoryManager
                fileContextMenu.parent = overlay
                fileContextMenu.popup(pos.x, pos.y)
                return
            }
            
            // Select the file - same as Explorer tab
            if (fileListItem.filePath) {
                fileListItem.fileSelected(fileListItem.filePath)
            }
        }
    }
    
    DmContextMenu {
        id: fileContextMenu
        theme: fileListItem.theme
        property string filePath: ""
        property var pathUtils: null
        property var repositoryManager: null
        
        MenuItem {
            text: qsTr("Copy path")
            visible: fileContextMenu.filePath && fileContextMenu.repositoryManager
            onTriggered: {
                if (fileContextMenu.repositoryManager && fileContextMenu.filePath) {
                    fileContextMenu.repositoryManager.copyToClipboard(fileContextMenu.filePath)
                }
            }
        }
        MenuItem {
            text: qsTr("Copy relative path")
            visible: fileContextMenu.filePath && fileContextMenu.repositoryManager && fileContextMenu.pathUtils
            onTriggered: {
                if (fileContextMenu.repositoryManager && fileContextMenu.pathUtils && fileContextMenu.filePath) {
                    var rel = fileContextMenu.pathUtils.toRepoRelativePath(fileContextMenu.filePath)
                    var toCopy = (rel && rel.length > 0) ? rel : fileContextMenu.filePath
                    fileContextMenu.repositoryManager.copyToClipboard(toCopy)
                }
            }
        }
        DmMenuSeparator {
            theme: fileContextMenu.theme
            visible: fileContextMenu.filePath && fileContextMenu.repositoryManager
        }
        MenuItem {
            text: qsTr("Open in folder")
            visible: fileContextMenu.filePath && fileContextMenu.repositoryManager
            onTriggered: {
                if (fileContextMenu.repositoryManager && fileContextMenu.filePath && fileContextMenu.repositoryManager.revealInFolder) {
                    fileContextMenu.repositoryManager.revealInFolder(fileContextMenu.filePath)
                }
            }
        }
    }
    
    Rectangle {
        anchors.bottom: parent.bottom
        width: parent.width
        height: 1
        color: theme.divider
        opacity: 0.3
    }
}
