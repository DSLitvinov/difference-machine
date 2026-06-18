cmake_minimum_required(VERSION 3.16)

project(dfm_uikit VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS Quick)

qt_standard_project_setup(REQUIRES 6.5)

qt_add_executable(dfm_uikit_gallery
    main.cpp
)

set_source_files_properties(
    uikit/theme/DfmTheme.qml
    PROPERTIES QT_QML_SINGLETON_TYPE TRUE
)

qt_add_qml_module(dfm_uikit_gallery
    URI Dfm.UiKit
    VERSION 1.0
    QML_FILES
        uikit/theme/DfmTheme.qml
        uikit/controls/DfmTextLabel.qml
        uikit/controls/DfmIconLabel.qml
        uikit/controls/DfmButton.qml
        uikit/controls/DfmIconButton.qml
        uikit/controls/DfmInput.qml
        uikit/controls/DfmSelect.qml
        uikit/controls/DfmBadge.qml
        uikit/controls/DfmToggle.qml
        uikit/controls/DfmTab.qml
        uikit/controls/DfmUnderlinedTab.qml
        uikit/controls/DfmTabBar.qml
        uikit/controls/DfmSlider.qml
        uikit/controls/DfmAccordion.qml
        uikit/controls/DfmFileCard.qml
        uikit/controls/DfmFilePreview.qml
        uikit/controls/DfmSidebarItem.qml
        uikit/controls/DfmSidebarTreeItem.qml
        uikit/panels/DfmSidebar.qml
        uikit/panels/DfmActionBar.qml
        uikit/panels/DfmFooter.qml
        uikit/gallery/UiKitGallery.qml
)

target_link_libraries(dfm_uikit_gallery
    PRIVATE
        Qt6::Quick
)

install(TARGETS dfm_uikit_gallery
    BUNDLE DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
