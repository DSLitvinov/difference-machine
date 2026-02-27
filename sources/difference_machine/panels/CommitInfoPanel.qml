import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import RepositoryManager 1.0
import resources.styles 1.0
import "."

Rectangle {
    id: commitInfoPanel
    Layout.fillWidth: true
    visible: selectedCommitHash && selectedCommitHash.length > 0

    property var theme: Theme {}
    property var repositoryManager: null
    property string selectedCommitHash: ""

    property string commitMessage: "Commit info"
    property string commitAuthor: ""
    property string commitHash: ""
    property int commitAddedLines: 0
    property int commitRemovedLines: 0

    function refreshCommitInfo() {
        if (!repositoryManager || !selectedCommitHash) {
            commitMessage = "Commit info"
            commitAuthor = ""
            commitHash = ""
            commitAddedLines = 0
            commitRemovedLines = 0
            return
        }
        var info = repositoryManager.getCommitInfo(selectedCommitHash)
        if (info) {
            commitMessage = info.message || "Commit info"
            commitAuthor = info.author || ""
            commitHash = info.hash || ""
            commitAddedLines = info.added_lines || 0
            commitRemovedLines = info.removed_lines || 0
        } else {
            commitMessage = "Commit info"
            commitAuthor = ""
            commitHash = ""
            commitAddedLines = 0
            commitRemovedLines = 0
        }
    }

    function copyHashToClipboard() {
        if (commitHash && repositoryManager) {
            repositoryManager.copyToClipboard(commitHash)
        }
    }

    onSelectedCommitHashChanged: Qt.callLater(refreshCommitInfo)

    color: theme.tabBarBackground || theme.backgroundSecondary

    implicitHeight: visible ? header.implicitHeight : 0

    HeaderPanel {
        id: header
        anchors.fill: parent
        theme: commitInfoPanel.theme
        contentMargins: 12
        contentSpacing: 8

        Text {
            Layout.fillWidth: true
            text: commitMessage && commitMessage.length > 0 ? commitMessage : qsTr("Commit info")
            color: theme.textPrimary
            font.pixelSize: theme.fontPixelSizeTitle
            font.bold: true
            wrapMode: Text.Wrap
            maximumLineCount: 2
            elide: Text.ElideRight
        }

        Text {
            Layout.fillWidth: true
            text: commitAuthor && commitAuthor.length > 0 ? commitAuthor : qsTr("Author: -")
            color: theme.textSecondary
            font.pixelSize: theme.fontPixelSizeSmall
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: qsTr("Hash:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitHash ? commitHash.substring(0, 8) : "-"
                color: theme.textMonospace
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Button {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                flat: true
                icon.source: theme.getIconPath("edit-copy.svg")
                icon.width: 14
                icon.height: 14
                visible: commitHash && commitHash.length > 0
                onClicked: copyHashToClipboard()
            }

            Item { Layout.fillWidth: true }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: qsTr("Added:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitAddedLines > 0 ? (commitAddedLines + " " + qsTr("lines")) : "-"
                color: commitAddedLines > 0 ? theme.diffAdded : theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Text {
                text: qsTr("Removed:")
                color: theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
            }

            Text {
                text: commitRemovedLines > 0 ? (commitRemovedLines + " " + qsTr("lines")) : "-"
                color: commitRemovedLines > 0 ? theme.diffRemoved : theme.textTertiary
                font.pixelSize: theme.fontPixelSizeSmall
                font.family: theme.fontMonospace
            }

            Item { Layout.fillWidth: true }
        }
    }
}
