import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: diffPanel
    SplitView.minimumWidth: 100
    SplitView.fillWidth: true

    property var theme: Theme {}
    property var repositoryManager: null
    property string commitHash: ""
    property string filePath: ""
    property string diffText: ""
    property string diffFormat: "text"  // "text" or "html"
    property bool isLoading: false
    property string diffHtml: ""
    property string commitMessage: ""
    property string commitAuthor: ""
    property string fileType: "text"  // "text", "image", "gif", "binary"
    property string currentImageUrl: ""
    property string commitImageUrl: ""
    property string currentFilePath: ""
    
    // Diff source selection properties
    property bool extendedDiff: false  // Show extended diff controls
    property string source1Type: "working"  // "working", "commit", "branch"
    property string source1Value: ""  // commit hash or branch name
    property string source2Type: "commit"  // "working", "commit", "branch"
    property string source2Value: ""  // commit hash or branch name
    
    // Models for dropdowns
    ListModel {
        id: branchesModel
    }
    
    ListModel {
        id: commitsModel
    }

    color: theme.background
    
    function determineFileType(path) {
        if (!path) return "binary"
        var lower = String(path).toLowerCase()
        var dot = lower.lastIndexOf(".")
        var ext = dot >= 0 ? lower.slice(dot + 1) : ""
        var imageExts = [
            "png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff", "webp", "svg", "exr", "hdr"
        ]
        var textExts = [
            "txt", "md", "markdown", "rst", "log",
            "py", "js", "ts", "tsx", "jsx", "json", "yaml", "yml",
            "go", "rs", "java", "kt", "swift", "c", "h", "cpp", "hpp", "cs",
            "html", "css", "scss", "less", "xml", "ini", "conf",
            "sh", "bash", "zsh", "ps1", "sql"
        ]
        if (imageExts.indexOf(ext) !== -1) return "image"
        if (textExts.indexOf(ext) !== -1) return "text"
        return "binary"
    }

    function formatCommitLabel(item) {
        if (!item || !item.hash) return ""
        var shortHash = item.hash.substring(0, 8)
        var message = item.message || ""
        return shortHash + " - " + message
    }

    function resetState() {
        diffText = ""
        diffFormat = "text"
        isLoading = false
        commitMessage = ""
        commitAuthor = ""
        fileType = determineFileType(filePath)
        currentImageUrl = ""
        commitImageUrl = ""
        currentFilePath = ""
        diffHtml = ""
    }

    function refreshBranches() {
        branchesModel.clear()
        if (!repositoryManager) return
        var branches = repositoryManager.getBranches()
        if (branches) {
            for (var i = 0; i < branches.length; i++) {
                branchesModel.append({
                    "name": branches[i].name,
                    "commit_hash": branches[i].commit_hash || ""
                })
            }
        }
    }
    
    function refreshCommits() {
        commitsModel.clear()
        if (!repositoryManager) return
        var commits = repositoryManager.getLog(100, null)
        if (commits) {
            for (var i = 0; i < commits.length; i++) {
                var c = commits[i]
                var h = c.hash || ""
                var msg = c.message || ""
                commitsModel.append({
                    "hash": h,
                    "message": msg,
                    "author": c.author || "",
                    "displayLabel": h.substring(0, 8) + " - " + msg
                })
            }
        }
    }
    
    function loadTextDiff() {
        if (!repositoryManager || !filePath) {
            return
        }
        if (fileType !== "text") {
            return
        }
        isLoading = true
        
        if (extendedDiff) {
            // Use advanced diff with selected sources
            diffHtml = repositoryManager.getDiffHtmlAdvanced(
                source1Type, source1Value,
                source2Type, source2Value,
                filePath, theme.isDark
            )
        } else {
            // Use default diff: working directory vs commit (if commitHash is set)
            if (commitHash) {
                diffHtml = repositoryManager.getDiffHtml(commitHash, filePath, theme.isDark)
            } else {
                diffHtml = ""
            }
        }
        isLoading = false
    }

    function loadImageDiff() {
        if (!repositoryManager || !filePath) {
            currentImageUrl = ""
            commitImageUrl = ""
            return
        }
        if (fileType !== "image") {
            currentImageUrl = ""
            commitImageUrl = ""
            return
        }
        isLoading = true
        
        try {
            if (extendedDiff) {
                // Load images from selected sources
                if (source1Type === "working") {
                    currentImageUrl = repositoryManager.getImageFromWorkingDir(filePath)
                } else if (source1Type === "commit" && source1Value) {
                    currentImageUrl = repositoryManager.getImageFromCommit(source1Value, filePath)
                } else if (source1Type === "branch" && source1Value) {
                    // For branch, we need to get the commit hash first
                    // For now, use empty - can be enhanced later
                    currentImageUrl = ""
                } else {
                    currentImageUrl = ""
                }
                
                if (source2Type === "working") {
                    commitImageUrl = repositoryManager.getImageFromWorkingDir(filePath)
                } else if (source2Type === "commit" && source2Value) {
                    commitImageUrl = repositoryManager.getImageFromCommit(source2Value, filePath)
                } else if (source2Type === "branch" && source2Value) {
                    // For branch, we need to get the commit hash first
                    // For now, use empty - can be enhanced later
                    commitImageUrl = ""
                } else {
                    commitImageUrl = ""
                }
            } else {
                // Default: commit vs its parent (like git show)
                // For commit diff: old = parent commit, new = commit
                if (commitHash) {
                    // Get parent commit hash
                    var parentHash = repositoryManager.getCommitParentHash(commitHash)
                    
                    if (parentHash && parentHash.length > 0) {
                        // Compare commit with its parent (like getDiffHtml)
                        commitImageUrl = repositoryManager.getImageFromCommit(parentHash, filePath)  // Old (Deleted, left, red)
                        currentImageUrl = repositoryManager.getImageFromCommit(commitHash, filePath)  // New (Added, right, green)
                    } else {
                        // Initial commit - no parent, so only show the commit (ONE image only)
                        commitImageUrl = ""  // Old (Deleted) - explicitly empty, no old version
                        currentImageUrl = repositoryManager.getImageFromCommit(commitHash, filePath)  // New (Added) - only this one
                    }
                } else {
                    // No commit selected - compare working directory with HEAD
                    commitImageUrl = ""  // Old (Deleted) - no old version
                    currentImageUrl = repositoryManager.getImageFromWorkingDir(filePath)  // New (Added)
                }
            }
        } catch (e) {
            console.log("Error in loadImageDiff:", e)
            currentImageUrl = ""
            commitImageUrl = ""
        }
        
        isLoading = false
    }
    
    onCommitHashChanged: {
        try {
            resetState()
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        } catch (e) {
            console.log("Error in onCommitHashChanged:", e)
            isLoading = false
            diffText = "Diff functionality is not available."
            diffFormat = "text"
        }
    }
    
    onFilePathChanged: {
        try {
            resetState()
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        } catch (e) {
            console.log("Error in onFilePathChanged:", e)
            isLoading = false
            diffText = "Diff functionality is not available."
            diffFormat = "text"
        }
    }
    
    onExtendedDiffChanged: {
        if (fileType === "image") {
            loadImageDiff()
        } else {
            loadTextDiff()
        }
    }
    
    onSource1TypeChanged: {
        if (extendedDiff) {
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        }
    }
    
    onSource1ValueChanged: {
        if (extendedDiff) {
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        }
    }
    
    onSource2TypeChanged: {
        if (extendedDiff) {
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        }
    }
    
    onSource2ValueChanged: {
        if (extendedDiff) {
            if (fileType === "image") {
                loadImageDiff()
            } else {
                loadTextDiff()
            }
        }
    }
    
    onRepositoryManagerChanged: {
        if (repositoryManager) {
            refreshBranches()
            refreshCommits()
        }
    }
    
    Connections {
        target: repositoryManager
        function onStatusChanged() {
            refreshBranches()
            refreshCommits()
        }
        function onRepositoryChanged() {
            refreshBranches()
            refreshCommits()
        }
    }
    
    Component.onCompleted: {
        if (repositoryManager) {
            refreshBranches()
            refreshCommits()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        HeaderPanel {
            Layout.fillWidth: true
            theme: diffPanel.theme
            contentMargins: 12
            contentSpacing: 6

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: qsTr("Diff")
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeBody
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    text: filePath && filePath.length > 0 ? filePath : qsTr("Select a file to view diff")
                    color: theme.textPrimary
                    font.pixelSize: theme.fontPixelSizeSmall
                    elide: Text.ElideMiddle
                }

                CheckBox {
                    id: extendedDiffCheckbox
                    text: qsTr("Extended diff")
                    checked: diffPanel.extendedDiff
                    onCheckedChanged: {
                        diffPanel.extendedDiff = checked
                        loadTextDiff()
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                visible: extendedDiff
                spacing: 8

                Text {
                    text: qsTr("From:")
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeSmall
                }

                ComboBox {
                    id: source1TypeCombo
                    Layout.preferredWidth: 120
                    model: ["Working Directory", "Commit", "Branch"]
                    currentIndex: source1Type === "working" ? 0 : (source1Type === "commit" ? 1 : 2)
                    onActivated: function(index) {
                        var oldType = source1Type
                        if (index === 0) source1Type = "working"
                        else if (index === 1) source1Type = "commit"
                        else source1Type = "branch"
                        if (oldType !== source1Type) {
                            source1Value = ""
                        }
                        loadTextDiff()
                    }
                }

                ComboBox {
                    id: source1ValueCombo
                    Layout.preferredWidth: 200
                    enabled: source1Type !== "working"
                    visible: source1Type !== "working"
                    model: source1Type === "branch" ? branchesModel : commitsModel
                    textRole: source1Type === "branch" ? "name" : "displayLabel"
                    currentIndex: {
                        var m = source1Type === "branch" ? branchesModel : commitsModel
                        if (!m || m.count === undefined) return -1
                        var role = source1Type === "branch" ? "name" : "hash"
                        for (var i = 0; i < m.count; i++) {
                            if ((m.get(i)[role] || "") === source1Value) return i
                        }
                        return -1
                    }
                    onActivated: function(index) {
                        var m = source1Type === "branch" ? branchesModel : commitsModel
                        if (index >= 0 && m && index < m.count) {
                            var item = m.get(index)
                            if (item) {
                                source1Value = source1Type === "branch" ? (item.name || "") : (item.hash || "")
                                loadTextDiff()
                            }
                        }
                    }
                }

                Text {
                    text: qsTr("vs")
                    color: theme.textSecondary
                    font.pixelSize: theme.fontPixelSizeSmall
                }

                ComboBox {
                    id: source2TypeCombo
                    Layout.preferredWidth: 120
                    model: ["Working Directory", "Commit", "Branch"]
                    currentIndex: source2Type === "working" ? 0 : (source2Type === "commit" ? 1 : 2)
                    onActivated: function(index) {
                        var oldType = source2Type
                        if (index === 0) source2Type = "working"
                        else if (index === 1) source2Type = "commit"
                        else source2Type = "branch"
                        if (oldType !== source2Type) {
                            source2Value = ""
                        }
                        loadTextDiff()
                    }
                }

                ComboBox {
                    id: source2ValueCombo
                    Layout.preferredWidth: 200
                    enabled: source2Type !== "working"
                    visible: source2Type !== "working"
                    model: source2Type === "branch" ? branchesModel : commitsModel
                    textRole: source2Type === "branch" ? "name" : "displayLabel"
                    currentIndex: {
                        var m = source2Type === "branch" ? branchesModel : commitsModel
                        if (!m || m.count === undefined) return -1
                        var role = source2Type === "branch" ? "name" : "hash"
                        for (var i = 0; i < m.count; i++) {
                            if ((m.get(i)[role] || "") === source2Value) return i
                        }
                        return -1
                    }
                    onActivated: function(index) {
                        var m = source2Type === "branch" ? branchesModel : commitsModel
                        if (index >= 0 && m && index < m.count) {
                            var item = m.get(index)
                            if (item) {
                                source2Value = source2Type === "branch" ? (item.name || "") : (item.hash || "")
                                loadTextDiff()
                            }
                        }
                    }
                }
            }
        }

        StackLayout {
            id: diffStack
            Layout.fillWidth: true
            Layout.fillHeight: true
            currentIndex: fileType === "image" ? 1 : (fileType === "text" ? 0 : 2)

            DiffItemText {
                theme: diffPanel.theme
                commitHash: diffPanel.commitHash
                filePath: diffPanel.filePath
                isLoading: diffPanel.isLoading
                diffHtml: diffPanel.diffHtml
                repositoryManager: diffPanel.repositoryManager
            }

            DiffItemImage {
                theme: diffPanel.theme
                commitHash: diffPanel.commitHash
                filePath: diffPanel.filePath
                isLoading: diffPanel.isLoading
                currentImageUrl: diffPanel.currentImageUrl
                commitImageUrl: diffPanel.commitImageUrl
                repositoryManager: diffPanel.repositoryManager
            }

            DiffItemBinary {
                theme: diffPanel.theme
                commitHash: diffPanel.commitHash
                filePath: diffPanel.filePath
                isLoading: diffPanel.isLoading
                repositoryManager: diffPanel.repositoryManager
            }
        }

        DiffMetadataPanel {
            Layout.fillWidth: true
            Layout.preferredHeight: implicitHeight
            theme: diffPanel.theme
            repositoryManager: diffPanel.repositoryManager
            commitHash: diffPanel.commitHash
            filePath: diffPanel.filePath
        }
    }

    // Vertical divider line on the left
    Rectangle {
        anchors.left: parent.left
        width: 1
        height: parent.height
        color: theme.divider
    }
}
