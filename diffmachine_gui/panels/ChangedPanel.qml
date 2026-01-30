import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: changedPanel
    SplitView.minimumWidth: 100
    SplitView.preferredWidth: 300
    
    // Theme instance
    property var theme: Theme {}
    property var repositoryManager: null
    property string selectedFilePath: ""
    
    // Path utilities
    PathUtils {
        id: pathUtils
        repositoryManager: changedPanel.repositoryManager
    }
    
    signal fileSelected(string filePath)
    
    color: theme.background

    ListModel {
        id: changedFilesModel
    }

    function selectAllChangedFiles(checked) {
        if (!changedFilesModel) {
            return
        }
        for (var i = 0; i < changedFilesModel.count; i++) {
            var item = changedFilesModel.get(i)
            if (item) {
                changedFilesModel.setProperty(i, "checked", checked)
            }
        }
        updateSelectAllChangedFilesState()
    }

    function updateSelectAllChangedFilesState() {
        if (typeof selectAllChangedFilesCheckBox === 'undefined' || !selectAllChangedFilesCheckBox) {
            return
        }
        
        if (!changedFilesModel || changedFilesModel.count === 0) {
            selectAllChangedFilesCheckBox.checked = false
            return
        }
        
        var allChecked = true
        var anyChecked = false
        for (var i = 0; i < changedFilesModel.count; i++) {
            var item = changedFilesModel.get(i)
            if (item && item.checked) {
                anyChecked = true
            } else {
                allChecked = false
            }
        }
        selectAllChangedFilesCheckBox.checked = allChecked && anyChecked
    }


    function refreshChangedFiles() {
        changedFilesModel.clear()
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        var status = repositoryManager.lastStatus
        if (!status) {
            return
        }
        
        function addFiles(files, status, statusText) {
            if (!files) {
                return
            }
            var fileArray = Array.isArray(files) ? files : (files ? [files] : [])
            for (var i = 0; i < fileArray.length; i++) {
                var filePath = fileArray[i]
                if (filePath && String(filePath).length > 0) {
                    var absolutePath = pathUtils.toAbsolutePath(String(filePath))
                    // Files already staged are checked by default
                    var isChecked = status && status.startsWith("staged_")
                    changedFilesModel.append({
                        "path": absolutePath,
                        "status": status || "",
                        "statusText": statusText || "",
                        "checked": isChecked
                    })
                }
            }
        }
        
        // Add ONLY modified and deleted files (no new/untracked files)
        addFiles(status.staged_modified_files || [], "staged_modified", "M")
        addFiles(status.unstaged_modified_files || [], "unstaged_modified", "M")
        addFiles(status.staged_deleted_files || [], "staged_deleted", "D")
        addFiles(status.unstaged_deleted_files || [], "unstaged_deleted", "D")
        
        // Update select all state after model is populated
        Qt.callLater(updateSelectAllChangedFilesState)
    }

    Connections {
        target: repositoryManager
        function onStatusChanged() {
            refreshChangedFiles()
            Qt.callLater(updateSelectAllChangedFilesState)
        }
        function onRepositoryChanged() {
            refreshChangedFiles()
            Qt.callLater(updateSelectAllChangedFilesState)
        }
    }

    Component.onCompleted: {
        if (repositoryManager) {
            refreshChangedFiles()
        }
    }

    onRepositoryManagerChanged: {
        if (repositoryManager) {
            refreshChangedFiles()
        }
    }

    HeaderPanel {
        id: changedFilesHeader
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        theme: changedPanel.theme
        contentMargins: 10
        contentSpacing: 6

        Text {
            text: qsTr("Changed")
            color: theme.textPrimary
            font.pixelSize: theme.fontPixelSizeBody
            font.bold: true
        }
    }

    ColumnLayout {
        id: changedFilesContent
        anchors.top: changedFilesHeader.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        spacing: 0

        Item {
            visible: !repositoryManager || !repositoryManager.isRepository
            Layout.fillWidth: true
            Layout.fillHeight: true
            StubTemplate {
                anchors.centerIn: parent
                theme: changedPanel.theme
                titleText: qsTr("No repository")
                auxiliaryText: ""
                iconSource: theme ? theme.getIconPath("folder.svg") : ""
            }
        }

        Item {
            visible: repositoryManager && repositoryManager.isRepository && changedFilesModel.count === 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            StubTemplate {
                anchors.centerIn: parent
                theme: changedPanel.theme
                titleText: qsTr("No changed files")
                auxiliaryText: ""
                iconSource: theme ? theme.getIconPath("file.svg") : ""
            }
        }

        // Files header with checkbox
        Rectangle {
            visible: repositoryManager && repositoryManager.isRepository && changedFilesModel.count > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            color: theme.backgroundSecondary
            
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 12
                
                MacCheckBox {
                    id: selectAllChangedFilesCheckBox
                    theme: changedPanel.theme
                    checked: false
                    property bool internalUpdate: false
                    property int lastUserCheckState: Qt.Unchecked
                    property bool userClickInProgress: false
                    onPressed: {
                        if (!internalUpdate) {
                            userClickInProgress = true
                            lastUserCheckState = checked ? Qt.Checked : Qt.Unchecked
                        }
                    }
                    onReleased: {
                        userClickInProgress = false
                    }
                    onClicked: {
                        if (!internalUpdate) {
                            var shouldCheck = (lastUserCheckState !== Qt.Checked)
                            internalUpdate = true
                            checked = shouldCheck
                            internalUpdate = false
                            changedPanel.selectAllChangedFiles(shouldCheck)
                        }
                    }
                }
                
                Text {
                    text: qsTr("Files")
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeSubhead
                    font.bold: true
                }
                
                Item { Layout.fillWidth: true }
            }
            
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: theme.divider
            }
        }

        ScrollView {
            visible: repositoryManager && repositoryManager.isRepository && changedFilesModel.count > 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ListView {
                id: changedFilesList
                anchors.fill: parent
                model: changedFilesModel
                clip: true

                delegate: FileListItem {
                    filePath: model.path || ""
                    displayPath: pathUtils.displayPathForStatus(model.path || "")
                    status: model.status || ""
                    statusText: model.statusText || ""
                    checked: model.checked || false
                    selectedFilePath: changedPanel.selectedFilePath
                    theme: changedPanel.theme
                    model: changedFilesModel
                    onSelectAllStateUpdate: updateSelectAllChangedFilesState
                    
                    onFileSelected: function(path) {
                        changedPanel.selectedFilePath = path
                        changedPanel.fileSelected(path)
                    }
                }
            }
        }
    }

    // Vertical divider lines on both sides
    Rectangle {
        anchors.left: parent.left
        width: 1
        height: parent.height
        color: theme.divider
    }
    Rectangle {
        anchors.right: parent.right
        width: 1
        height: parent.height
        color: theme.divider
    }
}
