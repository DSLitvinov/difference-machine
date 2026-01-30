import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

MacDialog {
    id: mergeBranchDialog
    centerOnOpen: true  // диалог слияния всегда по центру

    property var repositoryManager: null
    property string selectedBranch: ""
    property string selectedMergeFilePath: ""
    property var branchesModel: ListModel {}
    property var mergeFilesModel: ListModel {}
    property var toMergeObjectsModel: ListModel {}
    property var filteredObjectsModel: ListModel {}
    property string lastCommitAuthor: ""
    property string lastCommitMessage: ""
    property string lastCommitHash: ""
    property int lastCommitTimestamp: 0
    property string headCommitHash: ""
    property var mergeConflictPaths: []

    title: qsTr("Слияние веток")
    minContentWidth: 650
    implicitHeight: 580

    function refreshData() {
        if (!repositoryManager) return
        branchesModel.clear()
        var branches = repositoryManager.getBranches()
        var status = repositoryManager.lastStatus || repositoryManager.getStatus()
        var currentBranch = (status && status.current_branch) ? String(status.current_branch) : ""
        for (var i = 0; i < (branches ? branches.length : 0); i++) {
            var b = branches[i]
            branchesModel.append(b)
        }
        headCommitHash = (status && status.head_commit) ? String(status.head_commit) : ""
        if (selectedBranch && selectedBranch.length > 0) {
            var files = repositoryManager.getMergeFiles(selectedBranch)
            var toMerge = repositoryManager.getToMergeObjects()
            var pathSet = {}
            for (var k = 0; k < (toMerge ? toMerge.length : 0); k++) {
                var fp = (toMerge[k].file_path || "").toString()
                if (fp) pathSet[fp] = true
            }
            mergeFilesModel.clear()
            for (var j = 0; j < (files ? files.length : 0); j++) {
                var p = (files[j] || "").toString()
                mergeFilesModel.append({ "filePath": p, "hasToMerge": !!pathSet[p] })
            }
            toMergeObjectsModel.clear()
            for (var m = 0; m < (toMerge ? toMerge.length : 0); m++) {
                toMergeObjectsModel.append(toMerge[m])
            }
            var commits = repositoryManager.getLog(1, selectedBranch)
            if (commits && commits.length > 0) {
                var c = commits[0]
                lastCommitAuthor = (c.author || "").toString()
                lastCommitMessage = (c.message || "").toString()
                lastCommitHash = (c.hash || "").toString()
                lastCommitTimestamp = c.timestamp || 0
            } else {
                lastCommitAuthor = ""
                lastCommitMessage = ""
                lastCommitHash = ""
                lastCommitTimestamp = 0
            }
        } else {
            mergeFilesModel.clear()
            toMergeObjectsModel.clear()
            lastCommitAuthor = ""
            lastCommitMessage = ""
            lastCommitHash = ""
            lastCommitTimestamp = 0
        }
        if (!status) headCommitHash = ""
        updateFilteredObjects()
    }

    function updateFilteredObjects() {
        filteredObjectsModel.clear()
        if (!selectedMergeFilePath || selectedMergeFilePath.length === 0) return
        if (!selectedBranch || selectedBranch.length === 0) return
        if (!repositoryManager) return
        var raw = repositoryManager.getMergeObjectsForFile(selectedMergeFilePath, selectedBranch)
        var objs = Array.isArray(raw) ? raw : (raw && typeof raw.length === "number" ? Array.from(raw) : [])
        for (var i = 0; i < objs.length; i++) {
            var o = objs[i]
            if (!o || typeof o !== "object") continue
            var src = String(o.source || "ours")
            var tags = o.tags
            var hasMerge = false
            if (Array.isArray(tags) && tags.indexOf("MERGE") >= 0)
                hasMerge = true
            else if (typeof tags === "string" && tags.indexOf("MERGE") >= 0)
                hasMerge = true
            var rec = {
                "object_name": String(o.object_name || ""),
                "object_type": String(o.object_type || ""),
                "file_path": String(o.file_path || ""),
                "source": src,
                "hasMerge": hasMerge
            }
            filteredObjectsModel.append(rec)
        }
    }

    function formatTimestamp(ts) {
        if (ts === undefined || ts === null || ts === "" || (typeof ts === "number" && (ts <= 0 || !isFinite(ts)))) return ""
        var sec = typeof ts === "number" ? ts : parseInt(ts, 10)
        if (!sec || !isFinite(sec)) return ""
        var d = new Date(sec * 1000)
        var y = d.getFullYear()
        var m = ("0" + (d.getMonth() + 1)).slice(-2)
        var day = ("0" + d.getDate()).slice(-2)
        var h = ("0" + d.getHours()).slice(-2)
        var min = ("0" + d.getMinutes()).slice(-2)
        return day + "." + m + "." + y + " " + h + ":" + min
    }

    function hasBlendConflicts() {
        for (var i = 0; i < mergeConflictPaths.length; i++) {
            var p = (mergeConflictPaths[i] || "").toString()
            if (p.toLowerCase().indexOf(".blend") >= 0) return true
        }
        return false
    }

    ColumnLayout {
        spacing: 14
        Layout.fillWidth: true
        Layout.fillHeight: true
        Layout.leftMargin: 12
        Layout.rightMargin: 12
        Layout.topMargin: 4
        Layout.bottomMargin: 12

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 10

            Text {
                text: qsTr("Ветка для слияния:")
                color: theme ? theme.textPrimary : "#000"
                font.pixelSize: theme ? theme.fontPixelSizeBody : 12
                font.bold: true
                Layout.fillWidth: true
            }

            MacComboBox {
                id: branchComboBox
                theme: mergeBranchDialog.theme
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                model: branchesModel
                textRole: "name"
                currentIndex: {
                    var idx = -1
                    for (var i = 0; i < branchesModel.count; i++) {
                        if ((branchesModel.get(i).name || "") === selectedBranch) {
                            idx = i
                            break
                        }
                    }
                    return idx
                }
                displayTextFunction: function(item, index) {
                    if (!item) return ""
                    var text = (item.name || "").toString()
                    if (item.is_current)
                        text += " (текущая)"
                    return text
                }
                delegateText: function(item, index) {
                    if (!item) return ""
                    var text = (item.name || "").toString()
                    if (item.is_current)
                        text += " (текущая)"
                    return text
                }
                onActivated: function(index) {
                    var item = branchesModel.get(index)
                    if (item) {
                        selectedBranch = (item.name || "").toString()
                        selectedMergeFilePath = ""
                        refreshData()
                    }
                }
            }

            ColumnLayout {
                visible: selectedBranch.length > 0 && (lastCommitAuthor.length > 0 || lastCommitHash.length > 0 || lastCommitTimestamp > 0)
                spacing: 2
                Layout.fillWidth: true

                Text {
                    visible: lastCommitHash.length > 0
                    text: qsTr("Хеш: ") + lastCommitHash.substring(0, 8)
                    wrapMode: Text.WordWrap
                    color: theme ? theme.textSecondary : "#666"
                    font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                    Layout.fillWidth: true
                }
                Text {
                    visible: lastCommitAuthor.length > 0
                    text: qsTr("Автор: ") + lastCommitAuthor
                    wrapMode: Text.WordWrap
                    color: theme ? theme.textSecondary : "#666"
                    font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                    Layout.fillWidth: true
                }
                Text {
                    visible: lastCommitTimestamp > 0 && formatTimestamp(lastCommitTimestamp).length > 0
                    text: qsTr("Время: ") + formatTimestamp(lastCommitTimestamp)
                    wrapMode: Text.WordWrap
                    color: theme ? theme.textSecondary : "#666"
                    font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                    Layout.fillWidth: true
                }
            }
            Text {
                visible: selectedBranch.length > 0 && lastCommitMessage.length > 0
                text: qsTr("Сообщение: ") + lastCommitMessage
                wrapMode: Text.WordWrap
                maximumLineCount: 2
                elide: Text.ElideRight
                color: theme ? theme.textSecondary : "#666"
                font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                Layout.fillWidth: true
            }
        }

        SplitView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 200
            orientation: Qt.Horizontal

            handle: Rectangle {
                implicitWidth: 1
                implicitHeight: 1
                color: theme ? theme.divider : "#ddd"
                opacity: SplitHandle.hovered || SplitHandle.pressed ? 0.9 : 0.6
            }

            ColumnLayout {
                SplitView.minimumWidth: 180
                SplitView.preferredWidth: 300
                spacing: 8

                Text {
                    text: qsTr("Файлы для слияния:")
                    color: theme ? theme.textPrimary : "#000"
                    font.pixelSize: theme ? theme.fontPixelSizeBody : 12
                    font.bold: true
                    Layout.fillWidth: true
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    ScrollBar.vertical.policy: ScrollBar.AsNeeded
                    clip: true

                    ListView {
                        id: filesListView
                        model: mergeFilesModel
                        clip: true

                        delegate: Rectangle {
                            width: filesListView.width
                            height: 28
                            color: fileMouse.containsMouse ? (theme ? theme.backgroundHover : "#eee") : (selectedMergeFilePath === (model.filePath || "") ? (theme ? theme.backgroundSelected : "#ddd") : "transparent")

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 8
                                spacing: 6

                                Text {
                                    text: (model.filePath || "").toString()
                                    color: model.hasToMerge ? (theme ? theme.accent : "#007acc") : (theme ? theme.textPrimary : "#000")
                                    font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                                    font.bold: !!model.hasToMerge
                                    Layout.fillWidth: true
                                    elide: Text.ElideMiddle
                                }
                                Rectangle {
                                    visible: !!model.hasToMerge
                                    Layout.preferredWidth: 8
                                    Layout.preferredHeight: 8
                                    radius: 4
                                    color: theme ? theme.accent : "#007acc"
                                }
                            }

                            MouseArea {
                                id: fileMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                onClicked: {
                                    selectedMergeFilePath = (model.filePath || "").toString()
                                    Qt.callLater(updateFilteredObjects)
                                }
                            }

                            Rectangle {
                                anchors.bottom: parent.bottom
                                width: parent.width
                                height: 1
                                color: theme ? theme.divider : "#ddd"
                                opacity: 0.3
                            }
                        }
                    }
                }
            }

            ColumnLayout {
                SplitView.minimumWidth: 180
                SplitView.preferredWidth: 300
                spacing: 8

                Text {
                    text: qsTr("Объекты для слияния:")
                    color: theme ? theme.textPrimary : "#000"
                    font.pixelSize: theme ? theme.fontPixelSizeBody : 12
                    font.bold: true
                    Layout.fillWidth: true
                    Layout.leftMargin: 12
                }

                Item {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.leftMargin: 12

                    Text {
                        anchors.centerIn: parent
                        visible: selectedMergeFilePath.length === 0
                        text: qsTr("Выберите файл в списке слева")
                        color: theme ? theme.textSecondary : "#666"
                        font.pixelSize: theme ? theme.fontPixelSizeBody : 12
                    }

                    Text {
                        anchors.centerIn: parent
                        visible: selectedMergeFilePath.length > 0 && filteredObjectsModel.count === 0 && selectedMergeFilePath.toLowerCase().indexOf(".blend") >= 0
                        text: qsTr("Объекты для этого .blend не найдены в реестре.\nОткройте файл в Blender, выберите коммит (или HEAD) в панели Compare и нажмите «Sync Objects to DB».")
                        color: theme ? theme.textSecondary : "#666"
                        font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                        wrapMode: Text.WordWrap
                        horizontalAlignment: Text.AlignHCenter
                        width: parent.width - 16
                    }

                    ScrollView {
                        anchors.fill: parent
                        visible: selectedMergeFilePath.length > 0 && (filteredObjectsModel.count > 0 || selectedMergeFilePath.toLowerCase().indexOf(".blend") < 0)
                        ScrollBar.vertical.policy: ScrollBar.AsNeeded
                        clip: true

                        ListView {
                            id: objectsListView
                            model: filteredObjectsModel
                            clip: true

                            delegate: Rectangle {
                                width: objectsListView.width
                                height: 40
                                color: objMouse.containsMouse ? (theme ? theme.backgroundHover : "#eee") : "transparent"

                                ColumnLayout {
                                    anchors.left: parent.left
                                    anchors.right: parent.right
                                    anchors.verticalCenter: parent.verticalCenter
                                    anchors.leftMargin: 8
                                    anchors.rightMargin: 8
                                    spacing: 2

                                    RowLayout {
                                        Layout.fillWidth: true
                                        spacing: 6
                                        Text {
                                            text: (model.object_name || "").toString() + " (" + (model.object_type || "").toString() + ")"
                                            color: theme ? theme.textPrimary : "#000"
                                            font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                                            font.bold: true
                                            Layout.fillWidth: true
                                            elide: Text.ElideMiddle
                                        }
                                        Text {
                                            text: (model.source || "").toString() === "theirs" ? qsTr("theirs") : qsTr("ours")
                                            color: (model.source || "").toString() === "theirs" ? (theme ? theme.accent : "#007acc") : (theme ? theme.textSecondary : "#666")
                                            font.pixelSize: (theme ? theme.fontPixelSizeSmall : 11) - 1
                                            Layout.alignment: Qt.AlignRight
                                        }
                                    }
                                    Text {
                                        text: (model.file_path || "").toString()
                                        color: theme ? theme.textSecondary : "#666"
                                        font.pixelSize: (theme ? theme.fontPixelSizeSmall : 11) - 1
                                        Layout.fillWidth: true
                                        elide: Text.ElideMiddle
                                        visible: false
                                    }
                                }

                                MouseArea {
                                    id: objMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                }

                                Rectangle {
                                    anchors.bottom: parent.bottom
                                    width: parent.width
                                    height: 1
                                    color: theme ? theme.divider : "#ddd"
                                    opacity: 0.3
                                }
                            }
                        }
                    }
                }
            }
        }

        Text {
            visible: !!(repositoryManager && repositoryManager.lastError && repositoryManager.lastError.length > 0)
            Layout.fillWidth: true
            text: repositoryManager ? (repositoryManager.lastError || "") : ""
            color: theme ? theme.error : "#c00"
            font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
            wrapMode: Text.WordWrap
        }

        RowLayout {
            visible: mergeConflictPaths.length > 0
            Layout.fillWidth: true
            spacing: 8
            Text {
                text: qsTr("Conflicts: ") + mergeConflictPaths.join(", ")
                color: theme ? theme.textSecondary : "#666"
                font.pixelSize: theme ? theme.fontPixelSizeSmall : 11
                Layout.fillWidth: true
                elide: Text.ElideMiddle
            }
            MacButton {
                theme: mergeBranchDialog.theme
                buttonStyle: "primary"
                text: qsTr("Resolve automatically")
                Layout.preferredHeight: 28
                visible: hasBlendConflicts()
                onClicked: {
                    if (!repositoryManager) return
                    if (repositoryManager.resolveBlendConflictsAutomatically()) {
                        mergeConflictPaths = []
                        refreshData()
                        mergeBranchDialog.close()
                    }
                }
            }
            MacButton {
                theme: mergeBranchDialog.theme
                buttonStyle: "secondary"
                text: qsTr("Resolve in Blender")
                Layout.preferredHeight: 28
                onClicked: {
                    for (var i = 0; i < mergeConflictPaths.length; i++) {
                        var p = (mergeConflictPaths[i] || "").toString()
                        if (p.toLowerCase().indexOf(".blend") >= 0 && repositoryManager)
                            repositoryManager.openBlendForResolve(p)
                    }
                }
            }
            MacButton {
                theme: mergeBranchDialog.theme
                buttonStyle: "secondary"
                text: qsTr("Continue merge")
                Layout.preferredHeight: 28
                onClicked: {
                    if (!repositoryManager) return
                    if (repositoryManager.mergeContinue()) {
                        mergeConflictPaths = []
                        refreshData()
                        mergeBranchDialog.close()
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.topMargin: 4
            spacing: 10
            Item { Layout.fillWidth: true }
            MacButton {
                theme: mergeBranchDialog.theme
                buttonStyle: "secondary"
                text: qsTr("Отмена")
                Layout.minimumWidth: 80
                Layout.preferredHeight: 28
                onClicked: {
                    mergeConflictPaths = []
                    mergeBranchDialog.close()
                }
            }
            MacButton {
                theme: mergeBranchDialog.theme
                buttonStyle: "primary"
                text: qsTr("Выполнить слияние")
                Layout.minimumWidth: 120
                Layout.preferredHeight: 28
                enabled: selectedBranch.length > 0
                onClicked: {
                    if (!repositoryManager || selectedBranch.length === 0) return
                    mergeConflictPaths = []
                    if (repositoryManager.performMerge(selectedBranch, "")) {
                        mergeBranchDialog.close()
                    } else {
                        var list = repositoryManager.getMergeConflicts() || []
                        mergeConflictPaths = list.filter(function(p) { return p && p.length > 0 })
                    }
                }
            }
        }
    }

    onOpened: {
        selectedMergeFilePath = ""
        mergeConflictPaths = []
        refreshData()
    }
}
