cmake_minimum_required(VERSION 3.5)

project(Nosbor_)

set(CMAKE_INCLUDE_CURRENT_DIR ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

set(CMAKE_TOOLCHAIN_FILE "D:/vcpkg/scripts/buildsystems/vcpkg.cmake" )
set(CMAKE_PREFIX_PATH "C:/Qt/6.2.4/mingw_64")

# ------------ Download CmakeRC Resource compiler ----------------#

file(DOWNLOAD "https://raw.githubusercontent.com/vector-of-bool/cmrc/master/CMakeRC.cmake"
        "${CMAKE_BINARY_DIR}/CMakeRC.cmake")
include("${CMAKE_BINARY_DIR}/CMakeRC.cmake")

cmrc_add_resource_library(
        nosbor-resources

        ALIAS nosbor::rc
        NAMESPACE nosbor

        resources/theme.qss
)

find_package(Qt6 COMPONENTS
        Core
        Gui
        Widgets
        REQUIRED)

find_package(PhysFS REQUIRED)


add_executable(Nosbor_ main.cpp resources/theme.qss mainwindow.cpp mainwindow.h mainwindow.ui preferences/preferences.cpp preferences/preferences.h preferences/preferences.ui preferences/settings.cpp preferences/settings.h otlib/graphics/spriteManager.cpp otlib/graphics/spriteManager.h util/constants.h)
target_link_libraries(Nosbor_
        Qt::Core
        Qt::Gui
        Qt::Widgets
        nosbor::rc
        )

if (WIN32)
#    set(DEBUG_SUFFIX)
#    if (CMAKE_BUILD_TYPE MATCHES "Debug")
#        set(DEBUG_SUFFIX "d")
#    endif ()
    set(QT_INSTALL_PATH "${CMAKE_PREFIX_PATH}")
    if (NOT EXISTS "${QT_INSTALL_PATH}/bin")
        set(QT_INSTALL_PATH "${QT_INSTALL_PATH}/..")
        if (NOT EXISTS "${QT_INSTALL_PATH}/bin")
            set(QT_INSTALL_PATH "${QT_INSTALL_PATH}/..")
        endif ()
    endif ()
    if (EXISTS "${QT_INSTALL_PATH}/plugins/platforms/qwindows${DEBUG_SUFFIX}.dll")
        add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E make_directory
                "$<TARGET_FILE_DIR:${PROJECT_NAME}>/plugins/platforms/")
        add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy
                "${QT_INSTALL_PATH}/plugins/platforms/qwindows${DEBUG_SUFFIX}.dll"
                "$<TARGET_FILE_DIR:${PROJECT_NAME}>/plugins/platforms/")
    endif ()
    foreach (QT_LIB Core Gui Widgets)
        add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy
                "${QT_INSTALL_PATH}/bin/Qt6${QT_LIB}${DEBUG_SUFFIX}.dll"
                "$<TARGET_FILE_DIR:${PROJECT_NAME}>")
    endforeach (QT_LIB)
endif ()
