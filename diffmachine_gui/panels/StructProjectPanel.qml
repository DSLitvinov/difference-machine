import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import FileManager 1.0
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: structProjectPanel
    SplitView.minimumWidth: 100
    SplitView.preferredWidth: 300
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.background
    
    // Property to receive fileManager from parent
    property var fileManager: null
    // Property to receive repositoryManager from parent
    property var repositoryManager: null
    // Property to receive branchSelectorPanel from parent
    property var branchSelectorPanel: null
    // Overlay for popups (window.contentItem), set from MainWindow
    property var overlayItem: null
    
    // Path utilities
    PathUtils {
        id: pathUtils
        repositoryManager: structProjectPanel.repositoryManager
    }
    
    // Signal emitted when a file is selected
    signal fileSelected(string filePath)
    // Signal emitted when tab changes
    signal tabChanged(int tabIndex)
    // Signal emitted when a commit is selected
    signal commitSelected(string commitHash)
    
    // Track selected file path
    property string selectedFilePath: ""
    
    // Store signal handler to prevent duplicates
    property var directorySelectedHandler: null
    
    // Search filter
    property string searchFilter: ""
    // Commit form state
    property string commitMessage: ""
    property string commitAuthor: ""
    property string commitTag: ""
    property string commitError: ""
    property bool commitInProgress: false
    // Expose current tab index (0 = Explorer, 1 = Changed, 2 = Commits)
    property alias currentTabIndex: tabBar.currentIndex
    // Selected commit hash
    property string selectedCommitHash: ""

    // Commit context menu: hash for which menu is shown
    property string contextMenuCommitHash: ""
    // Create branch from commit dialog
    property string createBranchFromCommitName: ""
    property string createBranchFromCommitError: ""

    // Changed files model removed - now in ChangedFilesList component

    // Deleted files model
    ListModel {
        id: deletedFilesModel
    }
    
    // Commits model
    ListModel {
        id: commitsModel
    }

    // Deleted files accordion state
    property bool deletedPanelExpanded: false
    property bool deletedPanelAutoExpand: true
    
    function refreshCommits() {
        commitsModel.clear()
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        // Use the selected branch from branchSelectorPanel if available, otherwise the current branch
        var branchName = ""
        if (branchSelectorPanel && branchSelectorPanel.selectedBranch) {
            branchName = branchSelectorPanel.selectedBranch
        }
        var commits = repositoryManager.getLog(100, branchName)
        if (!commits || commits.length === 0) {
            return
        }
        for (var i = 0; i < commits.length; i++) {
            commitsModel.append(commits[i])
        }
    }
    
    // File checkboxes state (filePath -> checked)
    property var fileCheckboxes: ({})
    
    // Track which files were staged before (for dropped detection)
    property var previouslyStagedFiles: ({})
    // Locked files (path -> true)
    property var lockedFiles: ({})

    function getStatusLabel(status) {
        switch (status) {
            case "staged_new":
                return qsTr("Added")
            case "staged_modified":
                return qsTr("Modified")
            case "staged_deleted":
                return qsTr("Deleted")
            case "unstaged_modified":
                return qsTr("Modified")
            case "unstaged_deleted":
                return qsTr("Deleted")
            case "untracked":
                return qsTr("New")
            default:
                return "?"
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
            // Check if it was previously staged (dropped)
            if (previouslyStagedFiles[path]) {
                return "dropped"
            }
            return "modified"
        }
        if (pathUtils.statusListHasPath(status.unstaged_deleted_files, path)) {
            return "deleted"
        }
        
        // Check untracked files
        if (pathUtils.statusListHasPath(status.untracked_files, path)) {
            // Check if it was previously staged (dropped)
            if (previouslyStagedFiles[path]) {
                return "dropped"
            }
            return "added"
        }
        
        return ""
    }

    function isLockedPath(filePath) {
        if (!filePath) {
            return false
        }
        var path = String(filePath)
        if (lockedFiles[path]) {
            return true
        }
        var relPath = pathUtils.toRepoRelativePath(path)
        if (relPath && lockedFiles[relPath]) {
            return true
        }
        var normalized = pathUtils.normalizeStatusPath(path)
        if (normalized && lockedFiles[normalized]) {
            return true
        }
        return false
    }

    function updateLockedFiles() {
        var newLocked = {}
        if (repositoryManager && repositoryManager.currentRepository) {
            var locks = repositoryManager.getLocks()
            if (locks && locks.length) {
                for (var i = 0; i < locks.length; i++) {
                    var rawPath = String(locks[i].file_path || "")
                    if (!rawPath) {
                        continue
                    }
                    newLocked[rawPath] = true
                    var normalized = pathUtils.normalizeStatusPath(rawPath)
                    if (normalized) {
                        newLocked[normalized] = true
                    }
                    var relPath = pathUtils.toRepoRelativePath(normalized || rawPath)
                    if (relPath) {
                        newLocked[relPath] = true
                    }
                }
            }
        }
        lockedFiles = newLocked
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
        fileCheckboxes = newCheckboxes
        // QML automatically emits fileCheckboxesChanged signal when property changes
        // Don't update select all state immediately to avoid binding loop
        // It will be updated when needed
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
                    // Check if this file/dir is within the target directory
                    if (path.startsWith(dirPath + "/") || path === dirPath) {
                        if (!isDir) {
                            // It's a file - add to collection if not deleted
                            if (!isDeletedPath(path)) {
                                files.push(path)
                            }
                        } else {
                            // It's a directory - recurse
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
    
    // Functions toggleDirectoryFiles, getDirectoryCheckState, selectAllFiles, updateSelectAllFilesState
    // are now in FileTreeView component and accessed through parentPanel property

    // Function updateSelectAllState removed - now handled by ChangedFilesList component

    // Function updateChangedFilesModel is now in ChangedFilesList component

    function updateDeletedFilesModel(statusData) {
        deletedFilesModel.clear()
        if (!statusData) {
            return
        }
        var seen = {}
        function addDeleted(list, statusText) {
            if (!list) {
                return
            }
            for (var i = 0; i < list.length; i++) {
                var rawPath = String(list[i])
                var normalized = pathUtils.normalizeStatusPath(rawPath)
                var key = normalized || rawPath
                if (key && !seen[key]) {
                    seen[key] = true
                    deletedFilesModel.append({
                        "path": key,
                        "displayPath": pathUtils.displayPathForStatus(rawPath),
                        "statusText": statusText
                    })
                }
            }
        }
        addDeleted(statusData.staged_deleted_files || [], "D")
        addDeleted(statusData.unstaged_deleted_files || [], "D")

        if (deletedFilesModel.count > 0 && deletedPanelAutoExpand && !deletedPanelExpanded) {
            deletedPanelExpanded = true
            deletedPanelAutoExpand = false
        }
    }
    
    // Timer removed - FileTreeView components handle their own initialization

    // Periodic refresh of repository status and dependent lists.
    Timer {
        id: statusRefreshTimer
        interval: 2000
        running: true
        repeat: true
        onTriggered: {
            if (repositoryManager && repositoryManager.currentRepository) {
                repositoryManager.refreshStatus()
                updateDeletedFilesModel(repositoryManager.lastStatus)
                if (structProjectPanel.currentTabIndex === 2) {
                    refreshCommits()
                }
            }
        }
    }

    // Periodic refresh of the file tree model.
    Timer {
        id: projectTreeRefreshTimer
        interval: 3000
        running: true
        repeat: true
        onTriggered: {
            if (fileManager && fileManager.currentDirectory && typeof fileManager.refreshModel === "function") {
                fileManager.refreshModel()
            }
        }
    }

    // Periodic refresh of locks list.
    Timer {
        id: locksRefreshTimer
        interval: 4000
        running: true
        repeat: true
        onTriggered: {
            if (repositoryManager && repositoryManager.currentRepository) {
                updateLockedFiles()
            }
        }
    }

    // Periodic refresh of commits list (commits tab only).
    Timer {
        id: commitsRefreshTimer
        interval: 5000
        running: true
        repeat: true
        onTriggered: {
            if (repositoryManager && repositoryManager.currentRepository) {
                if (structProjectPanel.currentTabIndex === 2) {
                    refreshCommits()
                }
            }
        }
    }
    
    // Functions updateModel and connectSignals are now handled by FileTreeView components

    function submitCommit() {
        if (!repositoryManager || !repositoryManager.isRepository) {
            return
        }
        var trimmedMessage = commitMessage.trim()
        if (trimmedMessage.length === 0) {
            commitError = qsTr("Укажите сообщение коммита")
            return
        }
        
        // Collect selected files - use changedFilesModel if we're in Changed tab, otherwise use fileCheckboxes
        var selectedFiles = []
        function pushPaths(arr, path) {
            var p = String(path || "").trim()
            if (!p || p.length === 0) return
            if (p.indexOf(",") >= 0) {
                var parts = p.split(",")
                for (var k = 0; k < parts.length; k++) {
                    var q = String(parts[k]).trim()
                    if (q && q.length > 0) arr.push(q)
                }
            } else {
                arr.push(p)
            }
        }
        
        if (currentTabIndex === 1 && changedFilesList && changedFilesList.changedFilesModel) {
            // Changed tab - collect from changedFilesModel
            for (var i = 0; i < changedFilesList.changedFilesModel.count; i++) {
                var item = changedFilesList.changedFilesModel.get(i)
                if (item && item.checked) {
                    var filePath = String(item.filePath || "")
                    if (filePath && filePath.length > 0) {
                        // Convert to relative path for forester API
                        var path = filePath
                        var isDeleted = item.status === "staged_deleted" || item.status === "unstaged_deleted"
                        
                        if (repositoryManager && repositoryManager.currentRepository) {
                            var repoRoot = String(repositoryManager.currentRepository)
                            var normalizedRoot = repoRoot.endsWith("/") ? repoRoot.slice(0, -1) : repoRoot
                            
                            // Check if path is absolute and within repo
                            if (path.indexOf(normalizedRoot + "/") === 0 || path === normalizedRoot) {
                                // Make relative to repo root
                                if (path === normalizedRoot) {
                                    // Root directory selected - skip or handle specially
                                    continue
                                } else {
                                    path = path.slice(normalizedRoot.length + 1)
                                }
                            } else if (pathUtils) {
                                // Try to normalize using pathUtils (handles relative paths from status)
                                var normalized = pathUtils.normalizeStatusPath(path)
                                if (normalized && normalized.length > 0) {
                                    // Convert normalized absolute path back to relative
                                    if (normalized.indexOf(normalizedRoot + "/") === 0) {
                                        path = normalized.slice(normalizedRoot.length + 1)
                                    } else {
                                        path = normalized
                                    }
                                } else {
                                    // If normalization failed, try to get relative path
                                    var relPath = pathUtils.toRepoRelativePath(path)
                                    if (relPath && relPath.length > 0) {
                                        path = relPath
                                    }
                                }
                            }
                        }
                        
                        if (path && path.length > 0) {
                            pushPaths(selectedFiles, path)
                        }
                    }
                }
            }
        } else if (currentTabIndex === 0 && explorerFileTreeView) {
            // Explorer tab - use fileCheckboxes from explorerFileTreeView
            var checkboxesToUse = explorerFileTreeView.fileCheckboxes || {}
            for (var filePath in checkboxesToUse) {
                if (checkboxesToUse[filePath]) {
                    var path = String(filePath)
                    // Convert to relative path if it's absolute and within repo
                    if (repositoryManager && repositoryManager.currentRepository) {
                        var repoRoot = String(repositoryManager.currentRepository)
                        var normalizedRoot = repoRoot.endsWith("/") ? repoRoot.slice(0, -1) : repoRoot
                        // Check if path starts with repo root
                        if (path.indexOf(normalizedRoot + "/") === 0 || path === normalizedRoot) {
                            // Make relative to repo root
                            if (path === normalizedRoot) {
                                // Root directory selected - skip or handle specially
                                continue
        } else {
                                path = path.slice(normalizedRoot.length + 1)
                            }
                        }
                    }
                    if (path && path.length > 0) {
                        pushPaths(selectedFiles, path)
                    }
                }
            }
        } else {
            // Fallback to structProjectPanel.fileCheckboxes
            var checkboxesToUse = fileCheckboxes || {}
            for (var filePath in checkboxesToUse) {
                if (checkboxesToUse[filePath]) {
                    var path = String(filePath)
                    // Convert to relative path if it's absolute and within repo
                    if (repositoryManager && repositoryManager.currentRepository) {
                        var repoRoot = String(repositoryManager.currentRepository)
                        var normalizedRoot = repoRoot.endsWith("/") ? repoRoot.slice(0, -1) : repoRoot
                        // Check if path starts with repo root
                        if (path.indexOf(normalizedRoot + "/") === 0 || path === normalizedRoot) {
                            // Make relative to repo root
                            if (path === normalizedRoot) {
                                // Root directory selected - skip or handle specially
                                continue
                            } else {
                                path = path.slice(normalizedRoot.length + 1)
                            }
                        }
                    }
                    if (path && path.length > 0) {
                        pushPaths(selectedFiles, path)
                    }
                }
            }
        }
        
        if (selectedFiles.length === 0) {
            commitError = qsTr("Выберите файлы для коммита")
            return
        }
        
        commitError = ""
        commitInProgress = true
        
        // First, add selected files to staging area
        var addOk = repositoryManager.addFiles(selectedFiles)
        if (!addOk) {
            commitInProgress = false
            commitError = repositoryManager ? repositoryManager.lastError : qsTr("Не удалось добавить файлы в staging area")
            return
        }
        
        // Then create commit with message, author, and tag
        var commitOk = repositoryManager.createCommit(
            trimmedMessage,
            commitAuthor.trim(),
            commitTag.trim()
        )
        commitInProgress = false
        
        if (commitOk) {
            commitMessage = ""
            commitTag = ""
            // Clear file checkboxes after successful commit
            if (currentTabIndex === 1 && changedFilesList && changedFilesList.changedFilesModel) {
                // Clear checkboxes in changedFilesModel
                for (var j = 0; j < changedFilesList.changedFilesModel.count; j++) {
                    changedFilesList.changedFilesModel.setProperty(j, "checked", false)
                }
            } else if (currentTabIndex === 0 && explorerFileTreeView) {
                // Clear fileCheckboxes in explorerFileTreeView
                explorerFileTreeView.fileCheckboxes = {}
            } else {
                // Fallback - clear fileCheckboxes
                fileCheckboxes = {}
            }
            // Reset author to default from config
            if (repositoryManager && repositoryManager.defaultAuthor) {
                commitAuthor = repositoryManager.defaultAuthor
            } else {
                commitAuthor = ""
            }
        } else {
            commitError = repositoryManager ? repositoryManager.lastError : qsTr("Не удалось создать коммит")
        }
    }
    
    Component.onCompleted: {
        // Use timer to ensure fileManager is available
        // initTimer was removed; no delayed init needed here
        // Pre-fill author from config after a delay to ensure repositoryManager is ready
        Qt.callLater(function() {
            if (repositoryManager && repositoryManager.defaultAuthor) {
                commitAuthor = repositoryManager.defaultAuthor
            }
        })
    }

    Connections {
        target: repositoryManager
        enabled: repositoryManager !== null
        function onStatusChanged() {
            try {
            if (repositoryManager && repositoryManager.lastStatus) {
                // Update previously staged files before updating status
                var status = repositoryManager.lastStatus
                var newPreviouslyStaged = {}
                if (status.staged_new_files) {
                    for (var i = 0; i < status.staged_new_files.length; i++) {
                        newPreviouslyStaged[String(status.staged_new_files[i])] = true
                    }
                }
                if (status.staged_modified_files) {
                    for (var j = 0; j < status.staged_modified_files.length; j++) {
                        newPreviouslyStaged[String(status.staged_modified_files[j])] = true
                    }
                }
                // Keep old staged files that are no longer staged (for dropped detection)
                for (var key in previouslyStagedFiles) {
                    if (!newPreviouslyStaged[key]) {
                        // File was staged before but not now - keep it for dropped detection
                        newPreviouslyStaged[key] = true
                    }
                }
                previouslyStagedFiles = newPreviouslyStaged
                
                // updateChangedFilesModel removed - handled by ChangedFilesList component
                updateDeletedFilesModel(repositoryManager.lastStatus)
                updateLockedFiles()
                // updateSelectAllFilesState removed - handled by FileTreeView components
            } else {
                    updateDeletedFilesModel(null)
                    updateLockedFiles()
                }
            } catch (e) {
                console.error("Error in onStatusChanged:", e)
                updateDeletedFilesModel(null)
                updateLockedFiles()
            }
        }
        function onRepositoryChanged() {
            try {
            if (repositoryManager) {
                repositoryManager.refreshStatus()
                refreshCommits()
                updateLockedFiles()
                // Pre-fill author from config when repository changes
                if (repositoryManager.defaultAuthor && !commitAuthor) {
                    commitAuthor = repositoryManager.defaultAuthor
                }
                }
            } catch (e) {
                console.error("Error in onRepositoryChanged:", e)
            }
        }
        function onBranchChanged(branchName) {
            try {
                // Refresh commits when switching branches
                if (repositoryManager && repositoryManager.isRepository) {
                    // Refresh status to get the current branch info
                    repositoryManager.refreshStatus()
                    // Use a short delay to ensure status is updated
                    // and the current branch has actually changed
                    Qt.callLater(function() {
                        if (repositoryManager && repositoryManager.isRepository) {
                            refreshCommits()
                        }
                    })
                }
            } catch (e) {
                console.error("Error in onBranchChanged:", e)
            }
        }
    }
    
    // Track branch selection changes in BranchSelectorPanel
    Connections {
        target: branchSelectorPanel
        enabled: branchSelectorPanel !== null
        function onBranchSelectionChanged(branchName) {
            // Refresh content when the selected branch changes in the selector
            // updateChangedFilesModel removed - handled by ChangedFilesList component
            if (currentTabIndex === 2 && repositoryManager && repositoryManager.isRepository) {
                refreshCommits()
            }
        }
    }
    
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 0
        spacing: 0
        
        // Tab bar
        Rectangle {
            id: tabBarContainer
            Layout.fillWidth: true
            Layout.preferredHeight: 40
            color: theme.tabBarBackground
            
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                spacing: 0
                
                // Explorer tab
                Rectangle {
                    id: explorerTab
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: tabBar.currentIndex === 0 ? theme.tabBarActiveBackground : theme.tabBarBackground
                    
                    Text {
                        anchors.centerIn: parent
                        text: qsTr("Explorer")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSubhead
                        font.bold: true
                    }
                    
                    // Active indicator line
                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 2
                        color: tabBar.currentIndex === 0 ? theme.tabBarActiveIndicator : "transparent"
                    }
                    
                    MouseArea {
                        anchors.fill: parent
                        onClicked: tabBar.currentIndex = 0
                    }
                }
                
                // Changed tab
                Rectangle {
                    id: changedTab
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: tabBar.currentIndex === 1 ? theme.tabBarActiveBackground : theme.tabBarBackground
                    
                    Text {
                        anchors.centerIn: parent
                        text: qsTr("Changed")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSubhead
                        font.bold: true
                    }
                    
                    // Active indicator line
                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 2
                        color: tabBar.currentIndex === 1 ? theme.tabBarActiveIndicator : "transparent"
                    }
                    
                    MouseArea {
                        anchors.fill: parent
                        onClicked: tabBar.currentIndex = 1
                    }
                }
                
                // Commits tab
                Rectangle {
                    id: commitsTab
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: tabBar.currentIndex === 2 ? theme.tabBarActiveBackground : theme.tabBarBackground
                    
                    Text {
                        anchors.centerIn: parent
                        text: qsTr("Commits")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSubhead
                        font.bold: true
                    }
                    
                    // Active indicator line
                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 2
                        color: tabBar.currentIndex === 2 ? theme.tabBarActiveIndicator : "transparent"
                    }
                    
                    MouseArea {
                        anchors.fill: parent
                        onClicked: tabBar.currentIndex = 2
                    }
                }
            }
            
            // Divider line below tabs
            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: theme.divider
            }
        }
        
        // Tab bar (hidden, used for StackLayout binding)
        TabBar {
            id: tabBar
            Layout.fillWidth: true
            Layout.preferredHeight: 0
            visible: false
            currentIndex: 0
            onCurrentIndexChanged: {
                structProjectPanel.tabChanged(currentIndex)
            }
            
            TabButton { text: qsTr("Explorer") }
            TabButton { text: qsTr("Changed") }
            TabButton { text: qsTr("Commits") }
        }
        
        // Stack layout for tab content
        StackLayout {
            id: stackLayout
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 0
            currentIndex: tabBar.currentIndex

            onCurrentIndexChanged: {
                // updateChangedFilesModel removed - handled by ChangedFilesList component
                if (currentIndex === 2 && repositoryManager) {
                    refreshCommits()
                }
            }
            
            // Explorer tab content
            FileTreeView {
                id: explorerFileTreeView
                Layout.fillWidth: true
                Layout.fillHeight: true
                theme: structProjectPanel.theme
                fileManager: structProjectPanel.fileManager
                repositoryManager: structProjectPanel.repositoryManager
                parentPanel: structProjectPanel
                searchFilter: structProjectPanel.searchFilter
                selectedFilePath: structProjectPanel.selectedFilePath
                fileCheckboxes: structProjectPanel.fileCheckboxes
                showCheckboxes: false
                
                onFileSelected: function(filePath) {
                    structProjectPanel.selectedFilePath = filePath
                    structProjectPanel.fileSelected(filePath)
                }
                
                onFileCheckboxesUpdated: {
                    if (structProjectPanel.fileCheckboxes === explorerFileTreeView.fileCheckboxes)
                        return
                    explorerFileTreeView._receivingCheckboxesFromParent = true
                    structProjectPanel.fileCheckboxes = explorerFileTreeView.fileCheckboxes
                    Qt.callLater(function() {
                        explorerFileTreeView._receivingCheckboxesFromParent = false
                    })
                }
            }
            
            // Changed tab content - file tree view and commit panel
            SplitView {
                id: changedSplitView
                Layout.fillWidth: true
                Layout.fillHeight: true
                orientation: Qt.Vertical

                handle: Rectangle {
                    implicitWidth: 1
                    implicitHeight: 1
                    color: theme.divider
                    opacity: SplitHandle.hovered || SplitHandle.pressed ? 0.9 : 0.6
                }
                
                // Changed files list
                ChangedFilesList {
                    id: changedFilesList
                    SplitView.fillHeight: true
                    SplitView.minimumHeight: 200
                    theme: structProjectPanel.theme
                    repositoryManager: structProjectPanel.repositoryManager
                    selectedFilePath: structProjectPanel.selectedFilePath
                    searchFilter: structProjectPanel.searchFilter
                    
                    onFileSelected: function(filePath) {
                        structProjectPanel.selectedFilePath = filePath
                        structProjectPanel.fileSelected(filePath)
                    }
                }
                
                // Commit panel - always visible
                Rectangle {
                    id: commitPanel
                    SplitView.preferredHeight: implicitHeight
                    SplitView.minimumHeight: implicitHeight
                    implicitHeight: commitHeader.height + commitPanelContent.implicitHeight + 20
                    color: theme.background
                    visible: true

                    Rectangle {
                        id: commitHeader
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        height: 32
                        color: theme.backgroundSecondary

                        Text {
                            anchors.left: parent.left
                            anchors.leftMargin: 10
                            anchors.verticalCenter: parent.verticalCenter
                            text: qsTr("COMMIT")
                            color: theme.textPrimary
                            font.pixelSize: theme.fontPixelSizeBody
                            font.bold: true
                        }

                        Rectangle {
                            anchors.bottom: parent.bottom
                            width: parent.width
                            height: 1
                            color: theme.divider
                        }
                    }

                    ColumnLayout {
                        id: commitPanelContent
                        anchors.fill: parent
                        anchors.topMargin: commitHeader.height + 10
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        anchors.bottomMargin: 10
                        spacing: 10

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 5

                            Text {
                                text: qsTr("Message *")
                                color: theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSmall
                                font.bold: true
                            }

                            ScrollView {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 120
                                ScrollBar.vertical.policy: ScrollBar.AsNeeded

                                MacTextArea {
                                    id: commitMessageField
                                    theme: structProjectPanel.theme
                                    placeholderText: qsTr("Enter commit message...")
                                    wrapMode: TextArea.Wrap
                                    text: commitMessage
                                    onTextChanged: commitMessage = text
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 5

                            Text {
                                text: qsTr("Author")
                                color: theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSmall
                                font.bold: true
                            }

                            MacTextField {
                                id: commitAuthorField
                                theme: structProjectPanel.theme
                                Layout.fillWidth: true
                                placeholderText: qsTr("Optional author name")
                                text: commitAuthor
                                onTextChanged: commitAuthor = text
                                
                                Component.onCompleted: {
                                    // Pre-fill author from config when field is created
                                    // Use a small delay to ensure repositoryManager is ready
                                    Qt.callLater(function() {
                                        if (repositoryManager && repositoryManager.defaultAuthor && !commitAuthor) {
                                            commitAuthor = repositoryManager.defaultAuthor
                                        }
                                    })
                                }
                                
                                Connections {
                                    target: repositoryManager
                                    enabled: repositoryManager !== null
                                    function onRepositoryChanged() {
                                        // Update author from config when repository changes
                                        if (repositoryManager && repositoryManager.defaultAuthor && !commitAuthor) {
                                            commitAuthor = repositoryManager.defaultAuthor
                                        }
                                    }
                                    function onDefaultAuthorChanged() {
                                        // Update author from config when default author changes
                                        if (repositoryManager && repositoryManager.defaultAuthor && !commitAuthor) {
                                            commitAuthor = repositoryManager.defaultAuthor
                                        }
                                    }
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 5

                            Text {
                                text: qsTr("Tag")
                                color: theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSmall
                                font.bold: true
                            }

                            MacTextField {
                                id: commitTagField
                                theme: structProjectPanel.theme
                                Layout.fillWidth: true
                                placeholderText: qsTr("Optional tag name")
                                text: commitTag
                                onTextChanged: commitTag = text
                            }
                        }

                        Item {
                            Layout.fillHeight: true
                        }

                        Text {
                            visible: commitError.length > 0
                            text: commitError
                            color: theme.error
                                        font.pixelSize: theme.fontPixelSizeSmall
                            wrapMode: Text.Wrap
                        }

                        MacButton {
                            Layout.fillWidth: true
                            theme: structProjectPanel.theme
                            buttonStyle: "primary"
                            enabled: !commitInProgress && commitMessage.trim().length > 0
                            text: qsTr("Создать коммит")
                            onClicked: submitCommit()
                        }
                    }
                }
            }
            
            // Commits tab content
            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 0
                
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    color: theme.backgroundSecondary
                    
                    Text {
                        anchors.left: parent.left
                        anchors.leftMargin: 10
                        anchors.verticalCenter: parent.verticalCenter
                        text: qsTr("Commits")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeBody
                        font.bold: true
                    }
                    
                    Rectangle {
                        anchors.bottom: parent.bottom
                        width: parent.width
                        height: 1
                        color: theme.divider
                    }
                }
                
                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded

                    ListView {
                        id: commitsList
                        anchors.fill: parent
                        model: commitsModel
                        clip: true

                        delegate: Rectangle {
                            width: commitsList.width
                            height: 60
                            color: commitMouseArea.containsMouse ? theme.backgroundHover :
                                  (structProjectPanel.selectedCommitHash === model.hash ? theme.backgroundSelected : "transparent")

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 12
                                anchors.rightMargin: 12
                                anchors.topMargin: 8
                                anchors.bottomMargin: 8
                                spacing: 4

                                Text {
                                    Layout.fillWidth: true
                                    text: model.message || "(no message)"
                                    color: theme.textPrimary
                                    font.pixelSize: theme.fontPixelSizeSubhead
                                    font.bold: true
                                    elide: Text.ElideRight
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    spacing: 12

                                    Text {
                                        text: model.author || qsTr("Unknown")
                                        color: theme.textSecondary
                                        font.pixelSize: theme.fontPixelSizeSmall
                                    }

                                    Text {
                                        text: model.hash ? model.hash.slice(0, 8) : ""
                                        color: theme.textTertiary
                                        font.pixelSize: theme.fontPixelSizeSmall
                                        font.family: theme.fontMonospace
                                    }

                                    Item { Layout.fillWidth: true }
                                }
                            }

                            MouseArea {
                                id: commitMouseArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                acceptedButtons: Qt.LeftButton | Qt.RightButton
                                onClicked: function(mouse) {
                                    if (mouse.button === Qt.RightButton) {
                                        var overlay = structProjectPanel.overlayItem || structProjectPanel
                                        var pos = commitMouseArea.mapToItem(overlay, mouse.x, mouse.y)
                                        structProjectPanel.openCommitContextMenu(model.hash || "", pos.x, pos.y)
                                    } else if (model.hash) {
                                        structProjectPanel.selectedCommitHash = model.hash
                                        structProjectPanel.commitSelected(model.hash)
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
                    }
                }
            }
        }

    }
    
    // Vertical divider line on the right
    Rectangle {
        anchors.right: parent.right
        width: 1
        height: parent.height
        color: theme.divider
    }

    function openCommitContextMenu(hash, x, y) {
        contextMenuCommitHash = hash
        commitContextMenu.openAt(x, y)
    }

    ListModel {
        id: commitContextMenuModel
        ListElement { label: "Проверить до этого коммита"; action: "checkout" }
        ListElement { label: "Откатить коммит"; action: "revert" }
        ListElement { label: "Создать ветку от коммита"; action: "branch" }
        ListElement { label: ""; action: "sep" }
        ListElement { label: "Скопировать хеш"; action: "copy" }
    }

    MacContextMenu {
        id: commitContextMenu
        theme: structProjectPanel.theme
        model: commitContextMenuModel
        overlayItem: structProjectPanel.overlayItem
        onItemTriggered: function(action) {
            var hash = contextMenuCommitHash || ""
            if (action === "copy") {
                if (repositoryManager && hash.length > 0)
                    repositoryManager.copyToClipboard(hash)
                return
            }
            if (action === "checkout") {
                if (repositoryManager && hash.length > 0 && repositoryManager.checkoutToCommit(hash)) {
                    refreshCommits()
                    if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                        branchSelectorPanel.refreshBranches()
                }
                return
            }
            if (action === "revert") {
                if (repositoryManager && hash.length > 0 && repositoryManager.revertCommit(hash)) {
                    refreshCommits()
                    if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                        branchSelectorPanel.refreshBranches()
                }
                return
            }
            if (action === "branch") {
                createBranchFromCommitName = ""
                createBranchFromCommitError = ""
                createBranchFromCommitDialog.open()
            }
        }
    }

    MacDialog {
        id: createBranchFromCommitDialog
        centerOnOpen: true
        theme: structProjectPanel.theme
        title: qsTr("Создать ветку от коммита")
        minContentWidth: 280
        parent: (structProjectPanel.overlayItem && structProjectPanel.overlayItem.width > 0) ? structProjectPanel.overlayItem : structProjectPanel

        onOpened: createBranchFromCommitNameField.forceActiveFocus()

        MacTextField {
            id: createBranchFromCommitNameField
            theme: createBranchFromCommitDialog.theme
            Layout.fillWidth: true
            placeholderText: qsTr("Введите имя ветки")
            text: createBranchFromCommitName
            onTextChanged: {
                createBranchFromCommitName = text
                createBranchFromCommitError = ""
            }
        }

        Text {
            visible: createBranchFromCommitError.length > 0
            text: createBranchFromCommitError
            color: createBranchFromCommitDialog.theme ? createBranchFromCommitDialog.theme.error : "#cc0000"
            font.pixelSize: createBranchFromCommitDialog.theme ? createBranchFromCommitDialog.theme.fontPixelSizeSmall : 11
            wrapMode: Text.WordWrap
            Layout.fillWidth: true
        }

        Item { Layout.fillHeight: true }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            spacing: 8

            Item { Layout.fillWidth: true }

            MacButton {
                theme: createBranchFromCommitDialog.theme
                buttonStyle: "secondary"
                text: qsTr("Отмена")
                Layout.minimumWidth: 80
                Layout.preferredWidth: 80
                Layout.preferredHeight: 28
                onClicked: createBranchFromCommitDialog.close()
            }

            MacButton {
                theme: createBranchFromCommitDialog.theme
                buttonStyle: "primary"
                text: qsTr("Создать")
                Layout.minimumWidth: 80
                Layout.preferredWidth: 80
                Layout.preferredHeight: 28
                enabled: createBranchFromCommitName.trim().length > 0
                onClicked: {
                    if (!repositoryManager) {
                        createBranchFromCommitError = qsTr("Репозиторий недоступен")
                        return
                    }
                    var h = contextMenuCommitHash || ""
                    if (h.length === 0) {
                        createBranchFromCommitError = qsTr("Коммит не выбран")
                        return
                    }
                    var ok = repositoryManager.createBranchFromCommit(createBranchFromCommitName.trim(), h)
                    if (ok) {
                        createBranchFromCommitDialog.close()
                        if (branchSelectorPanel && typeof branchSelectorPanel.refreshBranches === "function")
                            branchSelectorPanel.refreshBranches()
                    } else {
                        createBranchFromCommitError = repositoryManager.lastError || qsTr("Не удалось создать ветку")
                    }
                }
            }
        }
    }
}

