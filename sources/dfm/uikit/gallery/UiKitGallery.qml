import QtQuick 6.6
import QtQuick.Controls 6.6
import QtQuick.Layouts 6.6
import Dfm.UiKit 1.0

ApplicationWindow {
    id: window
    width: 1280
    height: 900
    visible: true
    title: "DFM UI Kit Gallery"
    color: DfmTheme.background

    ScrollView {
        anchors.fill: parent
        anchors.margins: DfmTheme.space500
        clip: true

        ColumnLayout {
            width: window.width - DfmTheme.space500 * 2
            spacing: DfmTheme.space600

            Text {
                text: "DFM UI Kit"
                font.family: DfmTheme.fontFamily
                font.pixelSize: 24
                font.weight: DfmTheme.fontWeightMedium
                color: DfmTheme.contentPrimary
            }

            // Buttons
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Buttons"; fontWeight: DfmTheme.fontWeightMedium }

                Flow {
                    Layout.fillWidth: true
                    spacing: DfmTheme.space200

                    DfmButton { text: "Primary"; buttonStyle: DfmButton.Style.Primary }
                    DfmButton { text: "Primary disabled"; buttonStyle: DfmButton.Style.Primary; enabled: false }
                    DfmButton { text: "Primary loading"; buttonStyle: DfmButton.Style.Primary; loading: true }
                    DfmButton { text: "Secondary"; buttonStyle: DfmButton.Style.Secondary }
                    DfmButton { text: "Secondary disabled"; buttonStyle: DfmButton.Style.Secondary; enabled: false }
                    DfmIconButton { variant: DfmIconButton.Variant.Subtle }
                    DfmIconButton { variant: DfmIconButton.Variant.Subtle; selected: true }
                    DfmIconButton { variant: DfmIconButton.Variant.Secondary }
                }
            }

            // Inputs
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Input / Select"; fontWeight: DfmTheme.fontWeightMedium }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: DfmTheme.space400

                    DfmInput {
                        Layout.preferredWidth: 300
                        labelText: "Label"
                        placeholderText: "Enter value..."
                        helperText: "Helper text"
                        required: true
                    }

                    DfmInput {
                        Layout.preferredWidth: 300
                        labelText: "Error"
                        text: "Value"
                        hasError: true
                        helperText: "Error message"
                        required: true
                    }

                    DfmSelect {
                        Layout.preferredWidth: 300
                        labelText: "Select"
                        valueText: "Value"
                        helperText: "Helper text"
                        required: true
                    }
                }
            }

            // Badges & Toggle
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Badges & Toggle"; fontWeight: DfmTheme.fontWeightMedium }

                Flow {
                    spacing: DfmTheme.space200

                    DfmBadge { badgeStyle: DfmBadge.Style.Accent }
                    DfmBadge { badgeStyle: DfmBadge.Style.Secondary; text: "Secondary" }
                    DfmBadge { badgeStyle: DfmBadge.Style.Outline; text: "Outline" }
                    DfmBadge { badgeStyle: DfmBadge.Style.Negative; text: "Negative"; showLeftIcon: false; showRightIcon: false }
                    DfmToggle { labelText: "Toggle"; checked: true }
                    DfmToggle { labelText: "Disabled"; enabled: false }
                }
            }

            // Tabs
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Tabs"; fontWeight: DfmTheme.fontWeightMedium }

                DfmTabBar {
                    Layout.fillWidth: false
                    DfmTab { text: "Active"; checked: true }
                    DfmTab { text: "Inactive" }
                }

                RowLayout {
                    spacing: DfmTheme.space400
                    DfmUnderlinedTab { text: "Tab Name"; showCounter: true; counterText: "1"; checked: true }
                    DfmUnderlinedTab { text: "Tab Name"; showCounter: true; counterText: "2" }
                }
            }

            // Slider & Accordion
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Slider & Accordion"; fontWeight: DfmTheme.fontWeightMedium }

                DfmSlider { value: 35 }

                DfmAccordion {
                    Layout.fillWidth: true
                    title: "Accordion"
                    Rectangle {
                        width: parent.width
                        height: 48
                        color: Qt.rgba(1, 0, 0, 0.08)
                        border.color: "#d9373e"
                        border.width: 1
                        radius: DfmTheme.radius200
                    }
                }
            }

            // File cards
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Files"; fontWeight: DfmTheme.fontWeightMedium }

                RowLayout {
                    spacing: DfmTheme.space300
                    DfmFileCard { locked: true }
                    DfmFileCard { selected: true; locked: true }
                    DfmFilePreview { width: 160; height: 160; lockLabel: "Lock" }
                }
            }

            // Panels
            ColumnLayout {
                Layout.fillWidth: true
                spacing: DfmTheme.space200

                DfmTextLabel { text: "Panels"; fontWeight: DfmTheme.fontWeightMedium }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 520
                    radius: DfmTheme.radius300
                    color: DfmTheme.background
                    border.color: DfmTheme.borderOnLayer1
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 1
                        spacing: 0

                        DfmSidebar {
                            Layout.fillHeight: true
                            preferredWidth: 256
                            side: DfmSidebar.Side.Left

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: DfmTheme.space200
                                spacing: DfmTheme.space400

                                DfmSelect {
                                    Layout.fillWidth: true
                                    showLabel: false
                                    showHelper: false
                                    valueText: "Project name"
                                }

                                DfmSidebarItem {
                                    Layout.fillWidth: true
                                    text: "Version controls"
                                    checkable: true
                                    checked: true
                                }

                                DfmSidebarItem {
                                    Layout.fillWidth: true
                                    text: "Tasks"
                                }

                                DfmTextLabel {
                                    text: "Project folder"
                                    fontWeight: DfmTheme.fontWeightMedium
                                }

                                DfmSidebarTreeItem {
                                    title: "Project name"
                                    badgeText: "18"
                                    isFolder: true
                                    expanded: true
                                }

                                Item { Layout.fillHeight: true }

                                DfmIconLabel {
                                    text: "User Name"
                                }
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            Layout.fillHeight: true
                            spacing: 0

                            DfmActionBar {
                                Layout.fillWidth: true

                                RowLayout {
                                    anchors.fill: parent
                                    spacing: DfmTheme.space300

                                    RowLayout {
                                        spacing: DfmTheme.space200
                                        DfmIconButton {}
                                        DfmIconButton {}
                                        DfmTextLabel { text: "Folder name" }
                                    }

                                    Item {
                                        Layout.fillWidth: true
                                        DfmSlider {
                                            anchors.centerIn: parent
                                            width: 240
                                        }
                                    }

                                    DfmInput {
                                        Layout.preferredWidth: 188
                                        showLabel: false
                                        showHelper: false
                                        placeholderText: "Search..."
                                    }
                                }
                            }

                            Item { Layout.fillWidth: true; Layout.fillHeight: true }

                            DfmFooter {
                                Layout.fillWidth: true

                                RowLayout {
                                    anchors.fill: parent

                                    DfmIconLabel {
                                        text: "Repository"
                                    }

                                    Item { Layout.fillWidth: true }

                                    DfmTextLabel {
                                        text: "© 2026 Difference Machine"
                                    }
                                }
                            }
                        }

                        DfmSidebar {
                            Layout.fillHeight: true
                            preferredWidth: 300
                            side: DfmSidebar.Side.Right

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: DfmTheme.space200
                                spacing: DfmTheme.space400

                                DfmFilePreview {
                                    Layout.fillWidth: true
                                    height: 200
                                    lockLabel: "Lock"
                                }

                                DfmAccordion {
                                    Layout.fillWidth: true
                                    title: "File info"
                                    DfmInput {
                                        width: parent.width
                                        showLabel: false
                                        showHelper: false
                                        text: "filename.tag"
                                    }
                                }

                                Item { Layout.fillHeight: true }

                                DfmButton {
                                    Layout.fillWidth: true
                                    text: "Create commit"
                                    buttonStyle: DfmButton.Style.Primary
                                    showLeftIcon: false
                                    showRightIcon: false
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
