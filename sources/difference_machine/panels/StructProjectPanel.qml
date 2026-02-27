import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import FileManager 1.0
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: structProjectPanel
    // Header row layout constants
    readonly property int headerRowMargin: 12
    readonly property int headerRowSpacing: 12
    readonly property int headerRowVerticalMargin: 12
    readonly property int headerSegmentControlWidth: 180
    readonly property int segmentControlHeight: 32
    readonly property int searchFieldHeight: 36
    readonly property int segmentSearchPanelHeight: headerRowVerticalMargin + segmentControlHeight + headerRowSpacing + searchFieldHeight + headerRowVerticalMargin
    SplitView.minimumWidth: 0
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
    // Signal emitted after a commit was created successfully (so center panel can refresh list)
    signal commitCreated()
    
    // Track selected file path
    property string selectedFilePath: ""
    
    // Store signal handler to prevent duplicates
    property var directorySelectedHandler: null
    
    // Search filter
    property string searchFilter: ""
    // Commit form state
    property string commitMessage: ""
    property string commitAuthor: ""
    property string commitEmail: ""
    property string commitTag: ""
    property string commitError: ""
    property bool commitInProgress: false
    // Expose current tab index (0 = Explorer, 1 = Changed)
    property alias currentTabIndex: tabBar.currentIndex

    // Changed files model removed - now in ChangedFilesList component

    // Deleted files model
    ListModel {
        id: deletedFilesModel
    }

    // Deleted files accordion state
    property bool deletedPanelExpanded: false
    property bool deletedPanelAutoExpand: true
    
    // Commit panel collapsed/expanded (user can hide the commit form)
    property bool commitPanelExpanded: true
    
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
        
        if (explorerFileTreeView) {
            // Both tabs use the same tree; collect from fileCheckboxes
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
        
        // Then create commit with message, author, email, and tag
        var commitOk = repositoryManager.createCommit(
            trimmedMessage,
            commitAuthor.trim(),
            commitEmail.trim(),
            commitTag.trim()
        )
        commitInProgress = false
        
        if (commitOk) {
            commitMessage = ""
            commitTag = ""
            commitEmail = ""
            structProjectPanel.commitCreated()
            // Clear file checkboxes after successful commit (both tabs use the same tree)
            if (explorerFileTreeView) {
                explorerFileTreeView.fileCheckboxes = {}
            } else {
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
                updateLockedFiles()
                // Pre-fill author and email from config when repository changes
                if (repositoryManager.defaultAuthor && !commitAuthor) {
                    commitAuthor = repositoryManager.defaultAuthor
                }
                if (repositoryManager.defaultEmail && !commitEmail) {
                    commitEmail = repositoryManager.defaultEmail
                }
                }
            } catch (e) {
                console.error("Error in onRepositoryChanged:", e)
            }
        }
        function onBranchChanged(branchName) {
            try {
                if (repositoryManager && repositoryManager.isRepository) {
                    repositoryManager.refreshStatus()
                }
            } catch (e) {
                console.error("Error in onBranchChanged:", e)
            }
        }
    }
    
    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 0
        spacing: 0
        
        // Переключение Все/Изменены, затем поиск (высота по контенту)
        Item {
            id: segmentControlRow
            Layout.fillWidth: true
            Layout.preferredHeight: structProjectPanel.segmentSearchPanelHeight
            Layout.minimumHeight: structProjectPanel.segmentSearchPanelHeight
            
            property int currentIndex: 0
            onCurrentIndexChanged: {
                if (segmentControlRow.currentIndex !== tabBar.currentIndex) {
                    tabBar.currentIndex = segmentControlRow.currentIndex
                }
            }
            
            ColumnLayout {
                anchors.fill: parent
                anchors.leftMargin: structProjectPanel.headerRowMargin
                anchors.rightMargin: structProjectPanel.headerRowMargin
                anchors.topMargin: structProjectPanel.headerRowVerticalMargin
                anchors.bottomMargin: structProjectPanel.headerRowVerticalMargin
                spacing: structProjectPanel.headerRowSpacing
                
                // Segment control (Все / Изменены)
                Rectangle {
                    id: segmentControl
                    Layout.fillWidth: true
                    Layout.preferredHeight: structProjectPanel.segmentControlHeight
                    radius: theme.radiusLarge
                    color: theme.tabBarBackground
                    clip: true
                    
                    Row {
                        anchors.fill: parent
                        spacing: 0
                        
                        Item {
                            width: segmentControl.width / 2
                            height: segmentControl.height
                            Rectangle {
                                anchors.fill: parent
                                color: segmentControlRow.currentIndex === 0 ? theme.backgroundSelected : "transparent"
                                radius: segmentControlRow.currentIndex === 0 ? theme.radiusLarge : 0
                            }
                            Text {
                                anchors.centerIn: parent
                                text: qsTr("All")
                                color: segmentControlRow.currentIndex === 0 ? theme.textSelected : theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSubhead
                                font.bold: segmentControlRow.currentIndex === 0
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    segmentControlRow.currentIndex = 0
                                    tabBar.currentIndex = 0
                                }
                            }
                        }
                        Item {
                            width: segmentControl.width / 2
                            height: segmentControl.height
                            Rectangle {
                                anchors.fill: parent
                                color: segmentControlRow.currentIndex === 1 ? theme.backgroundSelected : "transparent"
                                radius: segmentControlRow.currentIndex === 1 ? theme.radiusLarge : 0
                            }
                            Text {
                                anchors.centerIn: parent
                                text: qsTr("Changed")
                                color: segmentControlRow.currentIndex === 1 ? theme.textSelected : theme.textPrimary
                                font.pixelSize: theme.fontPixelSizeSubhead
                                font.bold: segmentControlRow.currentIndex === 1
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    segmentControlRow.currentIndex = 1
                                    tabBar.currentIndex = 1
                                }
                            }
                        }
                    }
                }
                
                // Search field — ниже переключения
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: structProjectPanel.searchFieldHeight
                    Layout.minimumHeight: structProjectPanel.searchFieldHeight
                    Layout.minimumWidth: 0
                    color: theme.tabBarBackground
                    radius: theme.radiusMedium
                    border.width: 1
                    border.color: theme.divider
                    
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 6
                        anchors.topMargin: 6
                        anchors.bottomMargin: 6
                        spacing: 6
                        
                        TextField {
                            id: projectSearchField
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            Layout.minimumWidth: 0
                            leftPadding: 0
                            rightPadding: 4
                            topPadding: 2
                            bottomPadding: 2
                            verticalAlignment: TextInput.AlignVCenter
                            placeholderText: qsTr("Search files...")
                            placeholderTextColor: theme.textPlaceholder
                            onTextChanged: structProjectPanel.searchFilter = text.toLowerCase()
                            background: Item {}
                            color: theme.textPrimary
                            font.pixelSize: theme.fontPixelSizeBody
                        }
                        Text {
                            visible: projectSearchField.text.length > 0
                            Layout.preferredWidth: 20
                            Layout.alignment: Qt.AlignVCenter
                            text: "✕"
                            color: theme.textPlaceholder
                            font.pixelSize: theme.fontPixelSizeSmall
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            MouseArea {
                                anchors.fill: parent
                                anchors.margins: -4
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    projectSearchField.text = ""
                                    projectSearchField.focus = false
                                    structProjectPanel.searchFilter = ""
                                }
                            }
                        }
                    }
                }
            }
            
            Connections {
                target: tabBar
                function onCurrentIndexChanged() {
                    if (segmentControlRow.currentIndex !== tabBar.currentIndex) {
                        segmentControlRow.currentIndex = tabBar.currentIndex
                    }
                }
            }
            
            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: theme.divider
            }
        }
        
        // Hidden TabBar (used for StackLayout binding)
        TabBar {
            id: tabBar
            Layout.fillWidth: true
            Layout.preferredHeight: 0
            visible: false
            currentIndex: 0
            onCurrentIndexChanged: {
                structProjectPanel.tabChanged(currentIndex)
                // When switching to "Changed", refresh status so tree can show only changed files
                if (currentIndex === 1 && repositoryManager && repositoryManager.isRepository) {
                    repositoryManager.refreshStatus()
                }
            }
            
            TabButton { text: qsTr("Explorer") }
            TabButton { text: qsTr("Changed") }
        }
        
        // Single file tree for both "All" and "Changed" — unchanged files are never hidden
        FileTreeView {
            id: explorerFileTreeView
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 120
            Layout.topMargin: 4
            theme: structProjectPanel.theme
            fileManager: structProjectPanel.fileManager
            repositoryManager: structProjectPanel.repositoryManager
            parentPanel: structProjectPanel
            searchFilter: structProjectPanel.searchFilter
            selectedFilePath: structProjectPanel.selectedFilePath
            fileCheckboxes: structProjectPanel.fileCheckboxes
            showCheckboxes: tabBar.currentIndex === 1
            showOnlyChangedFiles: tabBar.currentIndex === 1
                
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

        // Commit form - can be collapsed by clicking the header (hidden on "Все" tab, shown on "Изменены")
        // Height depends on content, no scroll
        Rectangle {
            id: commitPanel
            visible: tabBar.currentIndex === 1
            Layout.fillWidth: true
            readonly property int commitFormMargins: 20
            Layout.preferredHeight: (tabBar.currentIndex === 1 && structProjectPanel.commitPanelExpanded)
                    ? (commitHeader.height + commitPanelContent.implicitHeight + commitFormMargins)
                    : (tabBar.currentIndex === 1 ? commitHeader.height : 0)
            Layout.minimumHeight: (tabBar.currentIndex === 1 && structProjectPanel.commitPanelExpanded)
                    ? (commitHeader.height + commitPanelContent.implicitHeight + commitFormMargins)
                    : (tabBar.currentIndex === 1 ? commitHeader.height : 0)
            color: theme.background

            Rectangle {
                id: commitHeader
                anchors.top: parent.top
                anchors.left: parent.left
                anchors.right: parent.right
                height: 44
                color: commitHeaderMouse.pressed ? theme.backgroundHover : theme.backgroundSecondary

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    anchors.topMargin: 12
                    anchors.bottomMargin: 12
                    spacing: 8

                    Text {
                        Layout.fillWidth: true
                        verticalAlignment: Text.AlignVCenter
                        text: qsTr("COMMIT")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeBody
                        font.bold: true
                    }
                    Text {
                        id: commitToggleIcon
                        text: structProjectPanel.commitPanelExpanded ? "▾" : "▸"
                        color: theme.textSecondary
                        font.pixelSize: theme.fontPixelSizeBody
                        Layout.alignment: Qt.AlignVCenter
                        Layout.rightMargin: 0
                    }
                }

                MouseArea {
                    id: commitHeaderMouse
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: { if (tabBar.currentIndex === 1) structProjectPanel.commitPanelExpanded = !structProjectPanel.commitPanelExpanded }
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
                visible: structProjectPanel.commitPanelExpanded
                anchors.top: commitHeader.bottom
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.topMargin: 8
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                anchors.bottomMargin: 12
                spacing: 8

                ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Text {
                            text: qsTr("Message *")
                            color: theme.textPrimary
                            font.pixelSize: theme.fontPixelSizeSmall
                            font.bold: true
                        }

                        TextArea {
                            id: commitMessageField
                            Layout.fillWidth: true
                            Layout.preferredHeight: 64
                            Layout.minimumHeight: 64
                            placeholderText: qsTr("Enter commit message...")
                            placeholderTextColor: theme.textPlaceholder
                            wrapMode: TextArea.Wrap
                            text: commitMessage
                            onTextChanged: commitMessage = text
                            color: theme.textPrimary
                            inputMethodHints: Qt.ImhNoPredictiveText | Qt.ImhSensitiveData
                            background: Rectangle {
                                color: theme.backgroundSecondary
                                border.color: theme.divider
                                border.width: 1
                                radius: theme.radiusMedium
                            }
                        }
                    }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: qsTr("Author")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSmall
                        font.bold: true
                    }

                    TextField {
                        id: commitAuthorField
                        Layout.fillWidth: true
                        placeholderText: qsTr("Optional author name")
                        placeholderTextColor: theme.textPlaceholder
                        text: commitAuthor
                        onTextChanged: commitAuthor = text
                        color: theme.textPrimary
                        background: Rectangle {
                            color: theme.backgroundSecondary
                            border.color: theme.divider
                            border.width: 1
                            radius: theme.radiusMedium
                        }
                        
                        Component.onCompleted: {
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
                                if (repositoryManager && repositoryManager.defaultAuthor && !commitAuthor) {
                                    commitAuthor = repositoryManager.defaultAuthor
                                }
                                if (repositoryManager && repositoryManager.defaultEmail && !commitEmail) {
                                    commitEmail = repositoryManager.defaultEmail
                                }
                            }
                            function onDefaultAuthorChanged() {
                                if (repositoryManager && repositoryManager.defaultAuthor && !commitAuthor) {
                                    commitAuthor = repositoryManager.defaultAuthor
                                }
                            }
                            function onDefaultEmailChanged() {
                                if (repositoryManager && repositoryManager.defaultEmail && !commitEmail) {
                                    commitEmail = repositoryManager.defaultEmail
                                }
                            }
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: qsTr("Email")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSmall
                        font.bold: true
                    }

                    TextField {
                        id: commitEmailField
                        Layout.fillWidth: true
                        placeholderText: qsTr("Optional email")
                        placeholderTextColor: theme.textPlaceholder
                        text: commitEmail
                        onTextChanged: commitEmail = text
                        color: theme.textPrimary
                        background: Rectangle {
                            color: theme.backgroundSecondary
                            border.color: theme.divider
                            border.width: 1
                            radius: theme.radiusMedium
                        }
                        
                        Component.onCompleted: {
                            Qt.callLater(function() {
                                if (repositoryManager && repositoryManager.defaultEmail && !commitEmail) {
                                    commitEmail = repositoryManager.defaultEmail
                                }
                            })
                        }
                        
                        Connections {
                            target: repositoryManager
                            enabled: repositoryManager !== null
                            function onRepositoryChanged() {
                                if (repositoryManager && repositoryManager.defaultEmail && !commitEmail) {
                                    commitEmail = repositoryManager.defaultEmail
                                }
                            }
                            function onDefaultEmailChanged() {
                                if (repositoryManager && repositoryManager.defaultEmail && !commitEmail) {
                                    commitEmail = repositoryManager.defaultEmail
                                }
                            }
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: qsTr("Tag")
                        color: theme.textPrimary
                        font.pixelSize: theme.fontPixelSizeSmall
                        font.bold: true
                    }

                    TextField {
                        id: commitTagField
                        Layout.fillWidth: true
                        placeholderText: qsTr("Optional tag name")
                        placeholderTextColor: theme.textPlaceholder
                        text: commitTag
                        onTextChanged: commitTag = text
                        color: theme.textPrimary
                        background: Rectangle {
                            color: theme.backgroundSecondary
                            border.color: theme.divider
                            border.width: 1
                            radius: theme.radiusMedium
                        }
                    }
                }

                Text {
                    visible: commitError.length > 0
                    text: commitError
                    color: theme.error
                    font.pixelSize: theme.fontPixelSizeSmall
                    wrapMode: Text.Wrap
                }

                Button {
                    Layout.fillWidth: true
                    enabled: !commitInProgress && commitMessage.trim().length > 0
                    text: qsTr("Создать коммит")
                    onClicked: submitCommit()
                }
            }
        }

    }

    Rectangle {
        anchors.right: parent.right
        width: 1
        height: parent.height
        color: theme.divider
    }
}

