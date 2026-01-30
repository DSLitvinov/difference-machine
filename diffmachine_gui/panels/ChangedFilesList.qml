import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: changedFilesList
    
    // Theme instance
    property var theme: Theme {}
    property var repositoryManager: null
    // Persist checkbox states across status refreshes
    property var fileCheckboxes: ({})
    
    // Path utilities
    PathUtils {
        id: pathUtils
        repositoryManager: changedFilesList.repositoryManager
    }
    
    // Track selected file path
    property string selectedFilePath: ""
    
    // Signal emitted when a file is selected
    signal fileSelected(string filePath)
    
    color: theme.background
    
    // Changed files model - expose for external access
    property alias changedFilesModel: changedFilesModelInternal
    ListModel {
        id: changedFilesModelInternal
    }
    
    // Search filter
    property string searchFilter: ""
    
    // Function to update changed files model from status
    function updateChangedFilesModel(statusData) {
        if (!changedFilesModelInternal) {
            console.warn("changedFilesModel is not initialized")
            return
        }
        
        changedFilesModelInternal.clear()
        var newCheckboxes = {}
        
        if (!statusData) {
            Qt.callLater(updateSelectAllState)
            return
        }

        function addFiles(files, status, statusText) {
            if (!files) {
                return
            }
            var fileArray = Array.isArray(files) ? files : (files ? [files] : [])
            // Expand comma-separated paths into separate entries so each file is one list item.
            // Avoids "file or directory does not exist: a,b" when passing paths to forester add.
            var expanded = []
            for (var ei = 0; ei < fileArray.length; ei++) {
                var x = fileArray[ei]
                if (!x) continue
                var s = String(x).trim()
                if (!s) continue
                if (s.indexOf(",") >= 0) {
                    var parts = s.split(",")
                    for (var pi = 0; pi < parts.length; pi++) {
                        var p = String(parts[pi]).trim()
                        if (p && p.length > 0) expanded.push(p)
                    }
                } else {
                    expanded.push(s)
                }
            }
            for (var i = 0; i < expanded.length; i++) {
                var filePath = expanded[i]
                if (!filePath) continue
                
                var pathStr = String(filePath).trim()
                if (!pathStr || pathStr.length === 0) {
                    continue
                }
                
                try {
                    var absolutePath = pathStr
                    
                    // Try to normalize path if repositoryManager is available
                    if (repositoryManager && repositoryManager.currentRepository) {
                        try {
                            var normalized = pathUtils.normalizeStatusPath(pathStr)
                            if (normalized && normalized.length > 0) {
                                absolutePath = normalized
                            } else {
                                var abs = pathUtils.toAbsolutePath(pathStr)
                                if (abs && abs.length > 0) {
                                    absolutePath = abs
                                }
                            }
                        } catch (e) {
                            // Use original path if normalization fails
                        }
                    }
                    
                    // Files already staged are checked by default
                    var defaultChecked = status && status.startsWith("staged_")
                    
                    // Ensure absolutePath is not empty
                    if (absolutePath && absolutePath.length > 0) {
                        var stored = fileCheckboxes.hasOwnProperty(absolutePath) ? fileCheckboxes[absolutePath] : undefined
                        var finalChecked = stored !== undefined ? stored : defaultChecked
                        newCheckboxes[absolutePath] = finalChecked
                        changedFilesModelInternal.append({
                            "filePath": absolutePath,
                            "status": status || "",
                            "statusText": statusText || "",
                            "checked": finalChecked
                        })
                    }
                } catch (e) {
                    console.error("Error adding file to model:", e, filePath)
                }
            }
        }

        try {
            // Add new/untracked files
            addFiles(statusData.staged_new_files || [], "staged_new", "A")
            addFiles(statusData.untracked_files || [], "untracked", "?")
            // Add modified files
            addFiles(statusData.staged_modified_files || [], "staged_modified", "M")
            addFiles(statusData.unstaged_modified_files || [], "unstaged_modified", "M")
            // Add deleted files
            addFiles(statusData.staged_deleted_files || [], "staged_deleted", "D")
            addFiles(statusData.unstaged_deleted_files || [], "unstaged_deleted", "D")
        } catch (e) {
            console.error("Error updating changed files model:", e)
        }
        
        fileCheckboxes = newCheckboxes
        
        // Update select all state after model is populated
        Qt.callLater(updateSelectAllState)
    }
    
    // Select all changed files
    function selectAllChangedFiles(checked) {
        if (!changedFilesModelInternal) {
            return
        }
        var newCheckboxes = {}
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        for (var i = 0; i < changedFilesModelInternal.count; i++) {
            var item = changedFilesModelInternal.get(i)
            if (item) {
                changedFilesModelInternal.setProperty(i, "checked", checked)
                if (item.filePath) {
                    newCheckboxes[String(item.filePath)] = checked
                }
            }
        }
        fileCheckboxes = newCheckboxes
        updateSelectAllState()
    }

    function setFileChecked(filePath, checked) {
        if (!filePath) {
            return
        }
        var newCheckboxes = {}
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        newCheckboxes[String(filePath)] = checked
        fileCheckboxes = newCheckboxes
    }

    function updateSelectAllState() {
        if (typeof selectAllCheckBox === 'undefined' || !selectAllCheckBox) {
            return
        }
        
        if (!changedFilesModelInternal || changedFilesModelInternal.count === 0) {
            selectAllCheckBox.internalUpdate = true
            selectAllCheckBox.checkState = Qt.Unchecked
            selectAllCheckBox.internalUpdate = false
            return
        }
        
        var totalCount = changedFilesModelInternal.count
        if (totalCount === 0) {
            selectAllCheckBox.internalUpdate = true
            selectAllCheckBox.checkState = Qt.Unchecked
            selectAllCheckBox.internalUpdate = false
            return
        }
        
        var allChecked = true
        var anyChecked = false
        for (var j = 0; j < totalCount; j++) {
            var entry = changedFilesModelInternal.get(j)
            if (entry && entry.checked) {
                anyChecked = true
            } else {
                allChecked = false
            }
        }
        
        var targetState = Qt.Unchecked
        if (allChecked && anyChecked) {
            targetState = Qt.Checked
        } else if (anyChecked) {
            targetState = Qt.PartiallyChecked
        }
        selectAllCheckBox.internalUpdate = true
        selectAllCheckBox.checkState = targetState
        selectAllCheckBox.internalUpdate = false
    }
    
    // Filter function for search
    function matchesFilter(filePath, displayPath) {
        if (!searchFilter || searchFilter.length === 0) {
            return true
        }
        var filter = searchFilter.toLowerCase()
        var path = String(filePath || "").toLowerCase()
        var display = String(displayPath || "").toLowerCase()
        return path.includes(filter) || display.includes(filter)
    }
    
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        
        // Search box
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            color: theme.backgroundSecondary
            
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 6
                
                // Search icon
                Image {
                    Layout.preferredWidth: 16
                    Layout.preferredHeight: 16
                    source: changedFilesList.theme.getIconPath("system-search.svg")
                    fillMode: Image.PreserveAspectFit
                    asynchronous: true
                    cache: true
                }
                
                // Search input
                MacTextField {
                    id: searchField
                    theme: changedFilesList.theme
                    Layout.fillWidth: true
                    placeholderText: qsTr("Search files...")
                    onTextChanged: {
                        changedFilesList.searchFilter = text.toLowerCase()
                    }
                }
                
                // Clear button
                Text {
                    visible: searchField.text.length > 0
                    text: "✕"
                    color: theme.textPlaceholder
                    font.pixelSize: theme.fontPixelSizeBody
                    
                    MouseArea {
                        anchors.fill: parent
                        anchors.margins: -4
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            searchField.text = ""
                            searchField.focus = false
                            changedFilesList.searchFilter = ""
                        }
                    }
                }
            }
            
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: theme.divider
            }
        }
        
        // Files header with checkbox
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            color: theme.backgroundSecondary
            
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 12
                
                MacCheckBox {
                    id: selectAllCheckBox
                    theme: changedFilesList.theme
                    tristate: true
                    enabled: changedFilesModelInternal.count > 0
                    opacity: changedFilesModelInternal.count > 0 ? 1 : 0
                    property bool internalUpdate: false
                    property int lastUserCheckState: Qt.Unchecked
                    property bool userClickInProgress: false
                    onPressed: {
                        if (!internalUpdate) {
                            userClickInProgress = true
                            lastUserCheckState = checkState
                        }
                    }
                    onReleased: {
                        userClickInProgress = false
                    }
                    onClicked: {
                        if (!internalUpdate) {
                            var shouldCheck = (lastUserCheckState !== Qt.Checked)
                            internalUpdate = true
                            checkState = shouldCheck ? Qt.Checked : Qt.Unchecked
                            internalUpdate = false
                            changedFilesList.selectAllChangedFiles(shouldCheck)
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
        
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 0

                // Empty state messages
                Item {
                    visible: !repositoryManager || !repositoryManager.isRepository
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: changedFilesList.theme
                        titleText: qsTr("No repository")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("folder.svg") : ""
                    }
                }

                Item {
                    visible: repositoryManager && repositoryManager.isRepository && changedFilesModelInternal.count === 0
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    StubTemplate {
                        anchors.centerIn: parent
                        theme: changedFilesList.theme
                        titleText: qsTr("No changed files")
                        auxiliaryText: ""
                        iconSource: theme ? theme.getIconPath("file.svg") : ""
                    }
                }
                
                // Files list
                ScrollView {
                    visible: repositoryManager && repositoryManager.isRepository && changedFilesModelInternal.count > 0
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded

                    ListView {
                        id: changedFilesListView
                        anchors.fill: parent
                        model: changedFilesModelInternal
                        clip: true

                        delegate: FileListItem {
                            width: changedFilesListView.width
                            filePath: model.filePath || ""
                            displayPath: {
                                var fp = model.filePath
                                if (!fp) return ""
                                fp = String(fp)
                                if (fp.length === 0) return ""
                                
                                // Try to get display path using pathUtils
                                var dp = ""
                                if (pathUtils && pathUtils.repositoryManager && pathUtils.repositoryManager.currentRepository) {
                                    try {
                                        dp = pathUtils.displayPathForStatus(fp)
                                    } catch (e) {
                                        // Ignore
                                    }
                                }
                                
                                // If empty, extract filename from path
                                if (!dp || dp.length === 0) {
                                    var parts = fp.split("/").filter(function(p) { return p && p.length > 0 })
                                    if (parts.length > 0) {
                                        dp = parts.length > 2 ? parts.slice(-2).join("/") : parts[parts.length - 1]
                                    } else {
                                        dp = fp
                                    }
                                }
                                return dp || fp || ""
                            }
                            status: model.status || ""
                            statusText: model.statusText || ""
                            checked: model.checked || false
                            selectedFilePath: changedFilesList.selectedFilePath
                            theme: changedFilesList.theme
                            listModel: changedFilesModelInternal
                            modelIndex: index
                            onSelectAllStateUpdate: updateSelectAllState
                            onFileCheckedChanged: function(path, checked) {
                                changedFilesList.setFileChecked(path, checked)
                            }
                            
                            onFileSelected: function(path) {
                                changedFilesList.selectedFilePath = path
                                changedFilesList.fileSelected(path)
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Connections to repository manager
    Connections {
        target: repositoryManager
        enabled: repositoryManager !== null
        function onStatusChanged() {
            updateChangedFilesModel(repositoryManager.lastStatus)
        }
        function onRepositoryChanged() {
            updateChangedFilesModel(repositoryManager ? repositoryManager.lastStatus : null)
        }
    }

    Component.onCompleted: {
        if (repositoryManager) {
            updateChangedFilesModel(repositoryManager.lastStatus)
        }
    }

    onRepositoryManagerChanged: {
        if (repositoryManager) {
            updateChangedFilesModel(repositoryManager.lastStatus)
        }
    }
}
