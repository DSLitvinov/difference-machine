import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import FileManager 1.0
import RepositoryManager 1.0
import resources.styles 1.0
import components 1.0
import "."

Rectangle {
    id: fileTreeViewRoot
    
    // Control checkbox visibility (Explorer can hide them)
    property bool showCheckboxes: true
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.background
    
    // Properties to receive from parent
    property var fileManager: null
    property var repositoryManager: null
    property var parentPanel: null  // Reference to parent panel (StructProjectPanel)
    
    // Path utilities
    PathUtils {
        id: pathUtils
        repositoryManager: fileTreeViewRoot.repositoryManager
    }
    
    // Search filter
    property string searchFilter: ""
    
    // Show only changed files (for Changed tab)
    property bool showOnlyChangedFiles: false
    
    // Track selected file path
    property string selectedFilePath: ""
    
    // Signal emitted when a file is selected
    signal fileSelected(string filePath)
    // Signal emitted when fileCheckboxes are updated (for parent notification)
    signal fileCheckboxesUpdated()
    
    // File checkboxes state (filePath -> checked)
    property var fileCheckboxes: ({})
    property bool internalCheckboxesUpdate: false
    // Set by parent before assigning to structProjectPanel.fileCheckboxes to avoid binding loop
    property bool _receivingCheckboxesFromParent: false
    onFileCheckboxesChanged: {
        if (internalCheckboxesUpdate || _receivingCheckboxesFromParent) {
            return
        }
        Qt.callLater(updateSelectAllFilesState)
        fileCheckboxesUpdated()  // Emit custom signal to parent
    }
    
    // Store signal handler to prevent duplicates
    property var directorySelectedHandler: null
    
    // Update when fileManager property changes
    onFileManagerChanged: {
        if (fileManager) {
            updateModel()
            connectSignals()
        }
    }
    
    function isDeletedPath(fullPath, statusData) {
        var status = statusData || (repositoryManager ? repositoryManager.lastStatus : null)
        if (!fullPath || !status) {
            return false
        }
        return pathUtils.statusListHasPath(status.staged_deleted_files, fullPath) ||
            pathUtils.statusListHasPath(status.unstaged_deleted_files, fullPath)
    }
    
    function getFileStatus(filePath, statusData) {
        var status = statusData || (repositoryManager ? repositoryManager.lastStatus : null)
        if (!filePath || !status) {
            return ""
        }
        var path = String(filePath)
        
        // Check staged files
        if (pathUtils.statusListHasPath(status.staged_new_files, path)) {
            return "added"
        }
        if (pathUtils.statusListHasPath(status.staged_modified_files, path)) {
            return "modified"
        }
        if (pathUtils.statusListHasPath(status.staged_deleted_files, path)) {
            return "deleted"
        }
        
        // Check unstaged files
        if (pathUtils.statusListHasPath(status.unstaged_modified_files, path)) {
            return "modified"
        }
        if (pathUtils.statusListHasPath(status.unstaged_deleted_files, path)) {
            return "deleted"
        }
        
        // Check untracked files
        if (pathUtils.statusListHasPath(status.untracked_files, path)) {
            return "added"
        }
        
        return ""
    }
    
    // Check if file is changed (modified, added, or deleted)
    function isFileChanged(filePath, statusData) {
        if (!filePath) return false
        var status = statusData || (repositoryManager ? repositoryManager.lastStatus : null)
        if (!status) return false
        
        var path = String(filePath)
        
        // Check if file is in any of the changed file lists
        return pathUtils.statusListHasPath(status.staged_new_files, path) ||
               pathUtils.statusListHasPath(status.staged_modified_files, path) ||
               pathUtils.statusListHasPath(status.staged_deleted_files, path) ||
               pathUtils.statusListHasPath(status.unstaged_modified_files, path) ||
               pathUtils.statusListHasPath(status.unstaged_deleted_files, path) ||
               pathUtils.statusListHasPath(status.untracked_files, path)
    }
    
    function isLockedPath(filePath) {
        if (!filePath || !parentPanel) {
            return false
        }
        if (typeof parentPanel.isLockedPath === "function") {
            return parentPanel.isLockedPath(filePath)
        }
        return false
    }
    
    function isFileChecked(filePath) {
        if (!filePath) return false
        return fileCheckboxes[String(filePath)] || false
    }
    
    function setFileChecked(filePath, checked) {
        if (!filePath) return
        var path = String(filePath)
        var newCheckboxes = {}
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        newCheckboxes[path] = checked
        internalCheckboxesUpdate = true
        fileCheckboxes = newCheckboxes
        internalCheckboxesUpdate = false
    }
    
    // Get all files in a directory (recursively)
    function getAllFilesInDirectory(dirPath, model, parentIndex) {
        var files = []
        if (!model || !dirPath) return files
        
        try {
            var rowCount
            if (parentIndex === undefined || parentIndex === null) {
                rowCount = model.rowCount()
            } else {
                rowCount = model.rowCount(parentIndex)
            }
            
            for (var i = 0; i < rowCount; i++) {
                var index
                if (parentIndex === undefined || parentIndex === null) {
                    index = model.index(i, 0)
                } else {
                    index = model.index(i, 0, parentIndex)
                }
                
                if (!index || (index.hasOwnProperty && index.hasOwnProperty("valid") && !index.valid)) {
                    continue
                }
                
                var filePath = model.data(index, 256) // PathRole
                var isDir = model.data(index, 257) // IsDirRole
                
                if (filePath) {
                    var path = String(filePath)
                    if (path.startsWith(dirPath + "/") || path === dirPath) {
                        if (!isDir) {
                            if (!isDeletedPath(path)) {
                                files.push(path)
                            }
                        } else {
                            files = files.concat(getAllFilesInDirectory(dirPath, model, index))
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Error getting files in directory:", e)
        }
        
        return files
    }
    
    // Toggle all files in a directory when directory checkbox is clicked
    function toggleDirectoryFiles(dirPath, checked) {
        if (!dirPath || !fileTreeView || !fileTreeView.model) {
            return
        }
        
        var allFiles = []
        
        function findDirectoryAndCollectFiles(model, parentIndex, targetPath, collected) {
            if (!model) return false
            
            try {
                var rowCount
                if (parentIndex === undefined || parentIndex === null) {
                    rowCount = model.rowCount()
                } else {
                    rowCount = model.rowCount(parentIndex)
                }
                
                for (var i = 0; i < rowCount; i++) {
                    var index
                    if (parentIndex === undefined || parentIndex === null) {
                        index = model.index(i, 0)
                    } else {
                        index = model.index(i, 0, parentIndex)
                    }
                    
                    if (!index || (index.hasOwnProperty && index.hasOwnProperty("valid") && !index.valid)) {
                        continue
                    }
                    
                    var filePath = model.data(index, 256) // PathRole
                    var isDir = model.data(index, 257) // IsDirRole
                    
                    if (filePath) {
                        var path = String(filePath)
                        if (path === targetPath && isDir) {
                            function collectFilesRecursive(model, dirIndex, collected) {
                                var dirRowCount = model.rowCount(dirIndex)
                                for (var j = 0; j < dirRowCount; j++) {
                                    var childIndex = model.index(j, 0, dirIndex)
                                    if (!childIndex || (childIndex.hasOwnProperty && childIndex.hasOwnProperty("valid") && !childIndex.valid)) {
                                        continue
                                    }
                                    
                                    var childPath = model.data(childIndex, 256)
                                    var childIsDir = model.data(childIndex, 257)
                                    
                                    if (childPath) {
                                        var childPathStr = String(childPath)
                                        if (!childIsDir) {
                                            if (!isDeletedPath(childPathStr)) {
                                                collected.push(childPathStr)
                                            }
                                        } else {
                                            collectFilesRecursive(model, childIndex, collected)
                                        }
                                    }
                                }
                            }
                            
                            collectFilesRecursive(model, index, collected)
                            return true
                        } else if (isDir) {
                            if (findDirectoryAndCollectFiles(model, index, targetPath, collected)) {
                                return true
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Error finding directory:", e)
            }
            
            return false
        }
        
        findDirectoryAndCollectFiles(fileTreeView.model, undefined, String(dirPath), allFiles)
        
        var newCheckboxes = {}
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        
        for (var j = 0; j < allFiles.length; j++) {
            newCheckboxes[allFiles[j]] = checked
        }
        
        internalCheckboxesUpdate = true
        fileCheckboxes = newCheckboxes
        internalCheckboxesUpdate = false
        Qt.callLater(updateSelectAllFilesState)
    }
    
    // Get directory checkbox state (checked, unchecked, or partially checked)
    function getDirectoryCheckState(dirPath) {
        if (!dirPath || !fileTreeView || !fileTreeView.model) {
            return Qt.Unchecked
        }
        
        var allFiles = []
        
        function collectDirectoryFiles(model, parentIndex, targetPath, collected) {
            if (!model) return false
            
            try {
                var rowCount
                if (parentIndex === undefined || parentIndex === null) {
                    rowCount = model.rowCount()
                } else {
                    rowCount = model.rowCount(parentIndex)
                }
                
                for (var i = 0; i < rowCount; i++) {
                    var index
                    if (parentIndex === undefined || parentIndex === null) {
                        index = model.index(i, 0)
                    } else {
                        index = model.index(i, 0, parentIndex)
                    }
                    
                    if (!index || (index.hasOwnProperty && index.hasOwnProperty("valid") && !index.valid)) {
                        continue
                    }
                    
                    var filePath = model.data(index, 256)
                    var isDir = model.data(index, 257)
                    
                    if (filePath) {
                        var path = String(filePath)
                        if (path === targetPath && isDir) {
                            function collectFilesRecursive(model, dirIndex, collected) {
                                var dirRowCount = model.rowCount(dirIndex)
                                for (var j = 0; j < dirRowCount; j++) {
                                    var childIndex = model.index(j, 0, dirIndex)
                                    if (!childIndex || (childIndex.hasOwnProperty && childIndex.hasOwnProperty("valid") && !childIndex.valid)) {
                                        continue
                                    }
                                    
                                    var childPath = model.data(childIndex, 256)
                                    var childIsDir = model.data(childIndex, 257)
                                    
                                    if (childPath) {
                                        var childPathStr = String(childPath)
                                        if (!childIsDir) {
                                            if (!isDeletedPath(childPathStr)) {
                                                collected.push(childPathStr)
                                            }
                                        } else {
                                            collectFilesRecursive(model, childIndex, collected)
                                        }
                                    }
                                }
                            }
                            
                            collectFilesRecursive(model, index, collected)
                            return true
                        } else if (isDir) {
                            if (collectDirectoryFiles(model, index, targetPath, collected)) {
                                return true
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Error collecting directory files:", e)
            }
            
            return false
        }
        
        collectDirectoryFiles(fileTreeView.model, undefined, String(dirPath), allFiles)
        
        if (allFiles.length === 0) {
            return Qt.Unchecked
        }
        
        var checkedCount = 0
        for (var j = 0; j < allFiles.length; j++) {
            if (fileCheckboxes[allFiles[j]]) {
                checkedCount++
            }
        }
        
        if (checkedCount === 0) {
            return Qt.Unchecked
        } else if (checkedCount === allFiles.length) {
            return Qt.Checked
        } else {
            return Qt.PartiallyChecked
        }
    }
    
    function selectAllFiles(checked) {
        if (!fileTreeView || !fileTreeView.model) {
            return
        }
        
        var newCheckboxes = {}
        
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        
        function collectAllFiles(model, parentIndex, collected) {
            if (!model) return
            
            try {
                var rowCount
                if (parentIndex === undefined || parentIndex === null) {
                    rowCount = model.rowCount()
                } else {
                    rowCount = model.rowCount(parentIndex)
                }
                
                for (var i = 0; i < rowCount; i++) {
                    var index
                    if (parentIndex === undefined || parentIndex === null) {
                        index = model.index(i, 0)
                    } else {
                        index = model.index(i, 0, parentIndex)
                    }
                    
                    if (!index || (index.hasOwnProperty && index.hasOwnProperty("valid") && !index.valid)) {
                        continue
                    }
                    
                    var filePath = model.data(index, 256) // PathRole
                    var isDir = model.data(index, 257) // IsDirRole
                    
                    if (filePath) {
                        var path = String(filePath)
                        if (!isDir) {
                            if (!isDeletedPath(path)) {
                                collected.push(path)
                            }
                        } else {
                            collectAllFiles(model, index, collected)
                        }
                    }
                }
            } catch (e) {
                console.warn("Error collecting files:", e)
            }
        }
        
        var allFiles = []
        collectAllFiles(fileTreeView.model, undefined, allFiles)
        
        for (var j = 0; j < allFiles.length; j++) {
            newCheckboxes[allFiles[j]] = checked
        }
        
        internalCheckboxesUpdate = true
        fileCheckboxes = newCheckboxes
        internalCheckboxesUpdate = false
        updateSelectAllFilesState()
    }
    
    // Get list of changed file paths from repository status (normalized to absolute for matching tree model)
    function getChangedFilePaths() {
        var paths = []
        var status = repositoryManager ? repositoryManager.lastStatus : null
        if (!status) return paths

        function addPaths(arr) {
            if (arr) {
                for (var i = 0; i < arr.length; i++) {
                    var p = String(arr[i]).trim().replace(/\\/g, "/")
                    if (!p) continue
                    var normalized = pathUtils.normalizeStatusPath(p)
                    var absPath = normalized || pathUtils.toAbsolutePath(p)
                    if (absPath) {
                        absPath = String(absPath).replace(/\\/g, "/")
                        if (paths.indexOf(absPath) === -1) paths.push(absPath)
                    }
                }
            }
        }
        addPaths(status.staged_new_files)
        addPaths(status.staged_modified_files)
        addPaths(status.staged_deleted_files)
        addPaths(status.unstaged_modified_files)
        addPaths(status.unstaged_deleted_files)
        addPaths(status.untracked_files)
        return paths
    }

    // Select/deselect all changed files (used when showOnlyChangedFiles)
    function selectAllChangedFiles(checked) {
        var changedPaths = getChangedFilePaths()
        if (changedPaths.length === 0) return

        var newCheckboxes = {}
        for (var key in fileCheckboxes) {
            newCheckboxes[key] = fileCheckboxes[key]
        }
        for (var j = 0; j < changedPaths.length; j++) {
            if (!isDeletedPath(changedPaths[j])) {
                newCheckboxes[changedPaths[j]] = checked
            }
        }
        internalCheckboxesUpdate = true
        fileCheckboxes = newCheckboxes
        internalCheckboxesUpdate = false
        Qt.callLater(updateSelectAllFilesState)
    }

    // Get select-all checkbox state for changed files
    function getSelectAllChangedFilesState() {
        var changedPaths = getChangedFilePaths()
        var selectablePaths = []
        for (var i = 0; i < changedPaths.length; i++) {
            if (!isDeletedPath(changedPaths[i])) selectablePaths.push(changedPaths[i])
        }
        if (selectablePaths.length === 0) return Qt.Unchecked
        var checkedCount = 0
        for (var j = 0; j < selectablePaths.length; j++) {
            if (fileCheckboxes[selectablePaths[j]]) checkedCount++
        }
        if (checkedCount === 0) return Qt.Unchecked
        if (checkedCount === selectablePaths.length) return Qt.Checked
        return Qt.PartiallyChecked
    }

    function updateSelectAllFilesState() {
        if (typeof selectAllCheckBox !== 'undefined' && selectAllCheckBox) {
            var newState = showOnlyChangedFiles ? getSelectAllChangedFilesState() : Qt.Unchecked
            if (            selectAllCheckBox.checkState !== newState && !selectAllCheckBox.internalUpdate) {
                selectAllCheckBox.internalUpdate = true
                selectAllCheckBox.checkState = newState
                selectAllCheckBox.internalUpdate = false
            }
        }
    }
    
    function updateModel() {
        if (fileManager && fileManager.fileSystemModel) {
            if (fileTreeView.model !== fileManager.fileSystemModel) {
                fileTreeView.model = fileManager.fileSystemModel
            }
        } else {
            fileTreeView.model = null
        }
    }
    
    function connectSignals() {
        if (fileManager) {
            if (directorySelectedHandler) {
                try {
                    fileManager.directorySelected.disconnect(directorySelectedHandler)
                } catch(e) {
                    // Ignore if not connected
                }
            }
            
            directorySelectedHandler = function(directory) {
                if (fileManager && fileManager.fileSystemModel) {
                    if (fileTreeView.model !== fileManager.fileSystemModel) {
                        fileTreeView.model = fileManager.fileSystemModel
                    }
                }
            }
            
            fileManager.directorySelected.connect(directorySelectedHandler)
        }
    }
    
    // Timer to ensure fileManager is available after component creation
    Timer {
        id: initTimer
        interval: 100
        running: false
        onTriggered: {
            if (fileManager) {
                updateModel()
                connectSignals()
            } else if (repeatCount < 5) {
                repeatCount++
                restart()
            }
        }
        property int repeatCount: 0
    }
    
    Component.onCompleted: {
        initTimer.start()
    }
    
    ColumnLayout {
        anchors.fill: parent
        spacing: 0
        
        // One header "Файлы" — no left indent
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 44
            color: theme.backgroundSecondary
            
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                anchors.topMargin: 12
                anchors.bottomMargin: 12
                spacing: 12

                Text {
                    text: qsTr("Files")
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeSubhead
                    font.bold: true
                }

                Item { Layout.fillWidth: true }
            }
            
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: theme.divider
            }
        }

        // Select all row — in file list panel, above the tree
        Rectangle {
            visible: fileTreeViewRoot.showCheckboxes
            Layout.fillWidth: true
            Layout.preferredHeight: 28
            color: theme.background

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 6

                DmCheckBox {
                    id: selectAllCheckBox
                    theme: fileTreeViewRoot.theme
                    tristate: true
                    property bool internalUpdate: false

                    Component.onCompleted: {
                        if (fileTreeViewRoot.showOnlyChangedFiles) {
                            internalUpdate = true
                            checkState = fileTreeViewRoot.getSelectAllChangedFilesState()
                            internalUpdate = false
                        }
                    }

                    Connections {
                        target: fileTreeViewRoot
                        function onFileCheckboxesChanged() {
                            if (fileTreeViewRoot.showCheckboxes && !selectAllCheckBox.internalUpdate) {
                                Qt.callLater(fileTreeViewRoot.updateSelectAllFilesState)
                            }
                        }
                    }

                    Connections {
                        target: fileTreeViewRoot.repositoryManager
                        enabled: fileTreeViewRoot.repositoryManager !== null && fileTreeViewRoot.showOnlyChangedFiles
                        function onStatusChanged() {
                            Qt.callLater(fileTreeViewRoot.updateSelectAllFilesState)
                        }
                    }

                    onClicked: {
                        if (!internalUpdate && fileTreeViewRoot.showOnlyChangedFiles) {
                            var shouldCheck = (checkState !== Qt.Unchecked)
                            fileTreeViewRoot.selectAllChangedFiles(shouldCheck)
                        }
                    }
                }

                Text {
                    text: qsTr("All")
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeBody
                }

                Item { Layout.fillWidth: true }
            }

            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: theme.divider
                opacity: 0.5
            }
        }

        // Tree view for file system
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            
            ScrollBar.vertical.policy: ScrollBar.AsNeeded
            ScrollBar.horizontal.policy: ScrollBar.AsNeeded
            
            TreeView {
                id: fileTreeView
                anchors.fill: parent
                
                // Make the single column fill the full viewport width (avoids empty space on the right)
                columnWidthProvider: function(column) {
                    return column === 0 ? fileTreeView.width : -1
                }
                
                Component.onCompleted: {
                    if (fileTreeViewRoot.fileManager) {
                        model = fileTreeViewRoot.fileManager.fileSystemModel
                    }
                }
                
                clip: true
                boundsBehavior: Flickable.StopAtBounds
                reuseItems: true
                
                // Force update when status changes (for showOnlyChangedFiles filter)
                Connections {
                    target: fileTreeViewRoot.repositoryManager
                    enabled: fileTreeViewRoot.repositoryManager !== null && fileTreeViewRoot.showOnlyChangedFiles
                    function onStatusChanged() {
                        // Force TreeView to refresh by resetting model
                        if (fileTreeView.model) {
                            var currentModel = fileTreeView.model
                            fileTreeView.model = null
                            Qt.callLater(function() {
                                fileTreeView.model = currentModel
                            })
                        }
                    }
                }
                
                delegate: TreeViewDelegate {
                    id: treeDelegate
                    
                    readonly property int iconSize: 24
                    readonly property bool isSelected: !model.isDir && model.path && fileTreeViewRoot.selectedFilePath === model.path
                    readonly property bool matchesFilter: fileTreeViewRoot.searchFilter === "" || 
                        (model.display && model.display.toLowerCase().includes(fileTreeViewRoot.searchFilter))
                    readonly property bool isClickable: fileTreeViewRoot.searchFilter === "" || matchesFilter
                    readonly property var repoManager: fileTreeViewRoot.repositoryManager
                    readonly property var statusData: repoManager ? repoManager.lastStatus : null
                    readonly property string fileStatus: fileTreeViewRoot.getFileStatus(
                        model.path || "",
                        statusData
                    )
                    readonly property bool isDeleted: fileStatus === "deleted"
                    readonly property bool isLocked: !model.isDir && fileTreeViewRoot.isLockedPath(model.path || "")
                    // Show file if: not in "show only changed" mode, or it's a directory, or file is changed
                    readonly property bool isChanged: fileTreeViewRoot.isFileChanged(model.path || "", statusData)
                    readonly property bool shouldShow: !fileTreeViewRoot.showOnlyChangedFiles || 
                        model.isDir || 
                        isChanged
                    
                    implicitHeight: shouldShow ? 28 : 0
                    height: shouldShow ? 28 : 0
                    width: fileTreeView.width
                    enabled: isClickable && shouldShow
                    visible: shouldShow
                    opacity: shouldShow ? 1.0 : 0.0
                    
                    contentItem: RowLayout {
                        spacing: 6
                        width: treeDelegate.width
                        opacity: matchesFilter ? 1.0 : 0.4
                        
                        // Checkbox for directories (with tristate support)
                        DmCheckBox {
                            id: dirCheckbox
                            theme: fileTreeViewRoot.theme
                            visible: fileTreeViewRoot.showCheckboxes && model.isDir
                            tristate: true
                            property string dirPath: model.path || ""
                            property bool internalUpdate: false
                            property int previousCheckState: Qt.Unchecked
                            property bool isInitialized: false
                            property int lastUserCheckState: Qt.Unchecked
                            property bool userClickInProgress: false
                            
                            Component.onCompleted: {
                                if (dirCheckbox.dirPath) {
                                    dirCheckbox.isInitialized = false
                                    var initialState = fileTreeViewRoot.getDirectoryCheckState(dirCheckbox.dirPath)
                                    dirCheckbox.previousCheckState = initialState
                                    dirCheckbox.internalUpdate = true
                                    dirCheckbox.checkState = initialState
                                    dirCheckbox.internalUpdate = false
                                    dirCheckbox.isInitialized = true
                                }
                            }
                            
                            onDirPathChanged: {
                                if (!dirCheckbox.dirPath) {
                                    dirCheckbox.internalUpdate = true
                                    dirCheckbox.checkState = Qt.Unchecked
                                    dirCheckbox.previousCheckState = Qt.Unchecked
                                    dirCheckbox.internalUpdate = false
                                    dirCheckbox.isInitialized = false
                                    return
                                }
                                dirCheckbox.isInitialized = false
                                var newState = fileTreeViewRoot.getDirectoryCheckState(dirCheckbox.dirPath)
                                dirCheckbox.previousCheckState = newState
                                dirCheckbox.internalUpdate = true
                                dirCheckbox.checkState = newState
                                dirCheckbox.internalUpdate = false
                                dirCheckbox.isInitialized = true
                            }
                            
                            Connections {
                                target: fileTreeViewRoot
                                function onFileCheckboxesChanged() {
                                    if (dirCheckbox.isInitialized && !dirCheckbox.internalUpdate && dirCheckbox.dirPath) {
                                        var newCheckState = fileTreeViewRoot.getDirectoryCheckState(dirCheckbox.dirPath)
                                        if (dirCheckbox.checkState !== newCheckState) {
                                            dirCheckbox.internalUpdate = true
                                            dirCheckbox.checkState = newCheckState
                                            dirCheckbox.previousCheckState = newCheckState
                                            dirCheckbox.internalUpdate = false
                                        }
                                    }
                                }
                            }
                            
                            onPressed: {
                                if (dirCheckbox.isInitialized && dirCheckbox.dirPath) {
                                    dirCheckbox.userClickInProgress = true
                                    dirCheckbox.lastUserCheckState = dirCheckbox.checkState
                                }
                            }
                            
                            onReleased: {
                                dirCheckbox.userClickInProgress = false
                            }
                            
                            onClicked: {
                                if (dirCheckbox.isInitialized && !internalUpdate && dirCheckbox.dirPath) {
                                    var shouldCheck = (lastUserCheckState !== Qt.Checked)
                                    
                                    internalUpdate = true
                                    if (shouldCheck) {
                                        checkState = Qt.Checked
                                    } else {
                                        checkState = Qt.Unchecked
                                    }
                                    internalUpdate = false
                                    
                                    fileTreeViewRoot.toggleDirectoryFiles(dirCheckbox.dirPath, shouldCheck)
                                    
                                    previousCheckState = checkState
                                }
                            }
                            
                            onCheckStateChanged: {
                                if (dirCheckbox.isInitialized && !internalUpdate && dirCheckbox.dirPath && !dirCheckbox.userClickInProgress) {
                                    previousCheckState = checkState
                                }
                            }
                        }
                        
                        // Checkbox for files (disabled for deleted)
                        DmCheckBox {
                            id: fileCheckbox
                            theme: fileTreeViewRoot.theme
                            visible: fileTreeViewRoot.showCheckboxes && !model.isDir
                            enabled: !isDeleted
                            property string filePath: model.path || ""
                            property bool internalUpdate: false
                            property bool isInitialized: false
                            
                            Component.onCompleted: {
                                if (fileCheckbox.filePath) {
                                    fileCheckbox.isInitialized = false
                                    var initialChecked = fileTreeViewRoot.isFileChecked(fileCheckbox.filePath)
                                    fileCheckbox.internalUpdate = true
                                    fileCheckbox.checked = initialChecked
                                    fileCheckbox.internalUpdate = false
                                    fileCheckbox.isInitialized = true
                                }
                            }
                            
                            onFilePathChanged: {
                                if (!fileCheckbox.filePath) {
                                    fileCheckbox.internalUpdate = true
                                    fileCheckbox.checked = false
                                    fileCheckbox.internalUpdate = false
                                    fileCheckbox.isInitialized = false
                                    return
                                }
                                fileCheckbox.isInitialized = false
                                var newChecked = fileTreeViewRoot.isFileChecked(fileCheckbox.filePath)
                                fileCheckbox.internalUpdate = true
                                fileCheckbox.checked = newChecked
                                fileCheckbox.internalUpdate = false
                                fileCheckbox.isInitialized = true
                            }
                            
                            Connections {
                                target: fileTreeViewRoot
                                function onFileCheckboxesChanged() {
                                    if (fileCheckbox.isInitialized && !fileCheckbox.internalUpdate && fileCheckbox.filePath) {
                                        var newChecked = fileTreeViewRoot.isFileChecked(fileCheckbox.filePath)
                                        if (fileCheckbox.checked !== newChecked) {
                                            fileCheckbox.internalUpdate = true
                                            fileCheckbox.checked = newChecked
                                            fileCheckbox.internalUpdate = false
                                        }
                                    }
                                }
                            }
                            
                            onCheckedChanged: {
                                if (isInitialized && !internalUpdate && fileCheckbox.filePath) {
                                    fileTreeViewRoot.setFileChecked(fileCheckbox.filePath, checked)
                                }
                            }
                        }
                        
                        // Icon for file or folder
                        Image {
                            id: itemIcon
                            Layout.preferredWidth: treeDelegate.iconSize
                            Layout.preferredHeight: treeDelegate.iconSize
                            asynchronous: true
                            cache: true
                            source: {
                                if (model.isDir) {
                                    return fileTreeViewRoot.theme.getIconPath("folder.svg")
                                } else if (model.iconType) {
                                    return fileTreeViewRoot.theme.getIconPath(model.iconType)
                                } else {
                                    return fileTreeViewRoot.theme.getIconPath("file.svg")
                                }
                            }
                            fillMode: Image.PreserveAspectFit
                        }
                        
                        // File/folder name
                        Text {
                            Layout.fillWidth: true
                            Layout.minimumWidth: 0
                            text: model.display || ""
                            color: treeDelegate.isSelected ? theme.textSelected : theme.textPrimary
                            font.pixelSize: theme.fontPixelSizeBody
                            font.bold: matchesFilter && fileTreeViewRoot.searchFilter !== ""
                            elide: Text.ElideRight
                            ToolTip.visible: treeDelegate.hovered && (model.path || "").length > 0
                            ToolTip.text: model.path || ""
                            ToolTip.delay: 500
                        }
                        
                        // Status badge (only for files)
                        Rectangle {
                            visible: !model.isDir && fileStatus !== ""
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                            radius: theme.radiusBadge
                            color: {
                                switch (fileStatus) {
                                    case "added":
                                        return theme.diffAdded
                                    case "modified":
                                        return theme.diffModified
                                    case "deleted":
                                        return theme.diffDeleted
                                    default:
                                        return "transparent"
                                }
                            }
                            
                            Text {
                                anchors.centerIn: parent
                                text: {
                                    switch (fileStatus) {
                                        case "added":
                                            return "+"
                                        case "modified":
                                            return "M"
                                        case "deleted":
                                            return "D"
                                        default:
                                            return ""
                                    }
                                }
                                color: Qt.darker(parent.color, 1.6)
                                font.pixelSize: theme.fontPixelSizeCaption
                                font.bold: true
                            }
                        }

                        Rectangle {
                            visible: treeDelegate.isLocked
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                            radius: theme.radiusBadge
                            color: theme.diffRemoved

                            Image {
                                anchors.centerIn: parent
                                width: 10
                                height: 10
                                source: fileTreeViewRoot.theme.getIconPath("lock.svg")
                                fillMode: Image.PreserveAspectFit
                                asynchronous: true
                                opacity: 0.7
                            }
                        }
                        
                        // Menu button (⋮) - inside layout so it doesn't overlap the text
                        Rectangle {
                            visible: (model.path || "").length > 0
                            Layout.preferredWidth: 28
                            Layout.preferredHeight: 24
                            Layout.alignment: Qt.AlignVCenter
                            radius: 4
                            color: treeMenuBtnMouseArea.containsMouse ? theme.backgroundHover : "transparent"
                            opacity: treeMenuBtnMouseArea.containsMouse ? 1.0 : 0.6
                            
                            Image {
                                anchors.centerIn: parent
                                width: 16
                                height: 16
                                source: fileTreeViewRoot.theme.getIconPath("more-vert.svg")
                                fillMode: Image.PreserveAspectFit
                                asynchronous: true
                            }
                            
                            MouseArea {
                                id: treeMenuBtnMouseArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: function(mouse) {
                                    if ((model.path || "").length > 0) {
                                        var overlay = (fileTreeViewRoot.parentPanel && fileTreeViewRoot.parentPanel.overlayItem)
                                            ? fileTreeViewRoot.parentPanel.overlayItem : fileTreeViewRoot
                                        var pos = mapToItem(overlay, mouse.x, mouse.y)
                                        fileTreeContextMenu.filePath = model.path || ""
                                        fileTreeContextMenu.pathUtils = pathUtils
                                        fileTreeContextMenu.repositoryManager = fileTreeViewRoot.repositoryManager
                                        fileTreeContextMenu.parent = overlay
                                        fileTreeContextMenu.popup(pos.x, pos.y)
                                    }
                                }
                            }
                            
                            ToolTip.visible: treeMenuBtnMouseArea.containsMouse
                            ToolTip.text: qsTr("File actions")
                            ToolTip.delay: 500
                        }
                    }
                    
                    background: Rectangle {
                        anchors.fill: parent
                        width: treeDelegate.width
                        color: {
                            if (treeDelegate.isSelected) {
                                return theme.backgroundSelected
                            } else if (treeDelegate.hovered && isClickable) {
                                return theme.backgroundHover
                            } else {
                                return "transparent"
                            }
                        }
                    }
                    
                    // Right-click overlay for context menu
                    Item {
                        anchors.fill: parent
                        z: 5
                        MouseArea {
                            id: rightClickMouseArea
                            anchors.fill: parent
                            acceptedButtons: Qt.RightButton
                            onClicked: function(mouse) {
                                if (mouse.button === Qt.RightButton && (model.path || "").length > 0) {
                                    var overlay = (fileTreeViewRoot.parentPanel && fileTreeViewRoot.parentPanel.overlayItem)
                                        ? fileTreeViewRoot.parentPanel.overlayItem : fileTreeViewRoot
                                    var pos = rightClickMouseArea.mapToItem(overlay, mouse.x, mouse.y)
                                    fileTreeContextMenu.filePath = model.path || ""
                                    fileTreeContextMenu.pathUtils = pathUtils
                                    fileTreeContextMenu.repositoryManager = fileTreeViewRoot.repositoryManager
                                    fileTreeContextMenu.parent = overlay
                                    fileTreeContextMenu.popup(pos.x, pos.y)
                                }
                            }
                        }
                    }
                    
                    onClicked: {
                        if (!isClickable) {
                            return
                        }
                        
                        if (model.isDir) {
                            treeDelegate.expanded = !treeDelegate.expanded
                        } else if (model.path) {
                            fileTreeViewRoot.selectedFilePath = model.path
                            fileTreeViewRoot.fileSelected(model.path)
                        }
                    }
                }
            }
        }
    }
    
    Menu {
        id: fileTreeContextMenu
        property string filePath: ""
        property var pathUtils: null
        property var repositoryManager: null
        
        MenuItem {
            text: qsTr("Copy path")
            visible: fileTreeContextMenu.filePath && fileTreeContextMenu.repositoryManager
            onTriggered: {
                if (fileTreeContextMenu.repositoryManager && fileTreeContextMenu.filePath) {
                    fileTreeContextMenu.repositoryManager.copyToClipboard(fileTreeContextMenu.filePath)
                }
            }
        }
        MenuItem {
            text: qsTr("Copy relative path")
            visible: fileTreeContextMenu.filePath && fileTreeContextMenu.repositoryManager && fileTreeContextMenu.pathUtils
            onTriggered: {
                if (fileTreeContextMenu.repositoryManager && fileTreeContextMenu.pathUtils && fileTreeContextMenu.filePath) {
                    var rel = fileTreeContextMenu.pathUtils.toRepoRelativePath(fileTreeContextMenu.filePath)
                    var toCopy = (rel && rel.length > 0) ? rel : fileTreeContextMenu.filePath
                    fileTreeContextMenu.repositoryManager.copyToClipboard(toCopy)
                }
            }
        }
        MenuSeparator {
            visible: fileTreeContextMenu.filePath && fileTreeContextMenu.repositoryManager
        }
        MenuItem {
            text: qsTr("Open in folder")
            visible: fileTreeContextMenu.filePath && fileTreeContextMenu.repositoryManager
            onTriggered: {
                if (fileTreeContextMenu.repositoryManager && fileTreeContextMenu.filePath && fileTreeContextMenu.repositoryManager.revealInFolder) {
                    fileTreeContextMenu.repositoryManager.revealInFolder(fileTreeContextMenu.filePath)
                }
            }
        }
    }
}
