import QtQuick 6.6
import QtQuick.Controls 6.6
import resources.styles 1.0
import "."

Rectangle {
    id: viewPanel
    SplitView.minimumWidth: 100
    SplitView.fillWidth: true
    
    // Theme instance
    property var theme: Theme {}
    
    color: theme.background
    
    // Property to receive fileViewer from parent
    property var fileViewer: null
    // Property to receive repositoryManager from parent
    property var repositoryManager: null
    // Track current file path
    property string currentFilePath: ""
    
    function resetViewer() {
        currentFilePath = ""
        if (fileViewer && fileViewer.clear) {
            fileViewer.clear()
        }
        stackView.clear()
        stackView.push(emptyStateComponent)
    }
    
    // Update syntax style when theme or fileViewer changes using Binding
    Binding {
        id: syntaxStyleBinding
        target: viewPanel.fileViewer
        property: "syntaxStyle"
        value: viewPanel.theme ? viewPanel.theme.syntaxHighlightStyle : "monokai"
        when: viewPanel.fileViewer !== null && viewPanel.theme !== null
    }
    
    // Listen for system theme changes to update syntax style
    Connections {
        target: Qt.application ? Qt.application.styleHints : null
        function onColorSchemeChanged() {
            if (viewPanel.fileViewer && viewPanel.theme) {
                syntaxStyleBinding.value = viewPanel.theme.syntaxHighlightStyle
            }
        }
    }
    
    // Listen to file loaded signal
    Connections {
        target: viewPanel.fileViewer
        enabled: viewPanel.fileViewer !== null
        function onFileLoaded(path, fileType) {
            currentFilePath = path || ""
            // Check if file is deleted
            if (isFileDeleted(currentFilePath)) {
                showDeletedStub()
                return
            }
            // Ensure syntax style is set
            if (viewPanel.theme && viewPanel.fileViewer) {
                viewPanel.fileViewer.setSyntaxStyle(viewPanel.theme.syntaxHighlightStyle)
            }
            updateViewer(fileType)
        }
    }
    
    function isFileDeleted(filePath) {
        if (!filePath || !repositoryManager || !repositoryManager.lastStatus) {
            return false
        }
        var status = repositoryManager.lastStatus
        var path = String(filePath)
        if (status.staged_deleted_files && status.staged_deleted_files.indexOf(path) !== -1) {
            return true
        }
        if (status.unstaged_deleted_files && status.unstaged_deleted_files.indexOf(path) !== -1) {
            return true
        }
        return false
    }
    
    function showDeletedStub() {
        if (stackView.depth === 0) {
            stackView.clear()
        }
        stackView.push("../panels/DeletedFileStub.qml", {
            "theme": viewPanel.theme
        })
    }
    
    function updateViewer(fileType) {
        if (!fileViewer) return
        
        switch(fileType) {
            case "text":
                // Clear initialItem if present, then push
                if (stackView.depth === 0) {
                    stackView.clear()
                }
                stackView.push("../file_viewer/text_viewer.qml", {
                    "fileViewer": fileViewer
                })
                break
            case "image":
                if (stackView.depth === 0) {
                    stackView.clear()
                }
                stackView.push("../file_viewer/image_viewer.qml", {
                    "fileUrl": fileViewer.fileUrl,
                    "filePath": fileViewer.filePath,
                    "theme": viewPanel.theme
                })
                break
            case "gif":
                if (stackView.depth === 0) {
                    stackView.clear()
                }
                stackView.push("../file_viewer/gif_viewer.qml", {
                    "fileUrl": fileViewer.fileUrl,
                    "filePath": fileViewer.filePath,
                    "theme": viewPanel.theme
                })
                break
            case "binary":
                if (stackView.depth === 0) {
                    stackView.clear()
                }
                stackView.push("../file_viewer/binary_stub.qml", {
                    "filePath": fileViewer.filePath
                })
                break
            default:
                stackView.clear()
                break
        }
    }
    
    Column {
        id: mainColumn
        anchors.fill: parent
        spacing: 0

        Rectangle {
            id: headerBar
            width: parent.width
            height: 44
            color: theme.tabBarBackground

            Text {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                anchors.topMargin: 12
                anchors.bottomMargin: 12
                verticalAlignment: Text.AlignVCenter
                text: fileViewer && fileViewer.fileName ? fileViewer.fileName : qsTr("Preview")
                color: theme.textSecondary
                font.pixelSize: theme.fontPixelSizeBody
                font.bold: true
                elide: Text.ElideRight
            }

            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: theme.divider
            }
        }
        
        // File content viewer
        StackView {
            id: stackView
            width: parent.width
            height: parent.height - headerBar.height - (metadataPanelLoader.item ? metadataPanelLoader.item.height : 0)
            anchors.margins: 5
            
            // Disable transitions for instant switching
            pushEnter: null
            pushExit: null
            popEnter: null
            popExit: null
            replaceEnter: null
            replaceExit: null
            
            initialItem: emptyStateComponent
        }
        
        // File metadata panel at the bottom
        Loader {
            id: metadataPanelLoader
            width: parent.width
            source: "../file_viewer/FileMetadataPanel.qml"
            onLoaded: {
                if (item) {
                    item.fileViewer = viewPanel.fileViewer
                }
            }
            
            Connections {
                target: viewPanel
                function onFileViewerChanged() {
                    if (metadataPanelLoader.item) {
                        metadataPanelLoader.item.fileViewer = viewPanel.fileViewer
                    }
                }
            }
        }
    }

    Component {
        id: emptyStateComponent
        Rectangle {
            color: theme.background
            StubTemplate {
                anchors.centerIn: parent
                theme: viewPanel.theme
                iconSource: theme.getIconPath("file.svg")
                titleText: qsTr("Select a file to view")
            }
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
