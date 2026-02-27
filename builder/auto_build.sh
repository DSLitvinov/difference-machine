#!/bin/bash
# auto_build.sh — полная сборка: Forester, GUI, образ в DFM_Installer.
# Запускает скрипты сборки Forester из sources/forester в зависимости от ОС.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCRIPTS_DIR="${SCRIPT_DIR}/scripts"
FORESTER_DIR="${PROJECT_ROOT}/sources/forester"
[ ! -d "${FORESTER_DIR}" ] && FORESTER_DIR="${PROJECT_ROOT}/forester"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ;;
    Darwin*) CURRENT_OS="macos" ;;
    *)       CURRENT_OS="windows" ;;
esac

# Выход forester-скриптов: <parent_of_forester>/installer/forester/<os>/bin
FORESTER_PARENT="$(cd "${FORESTER_DIR}/.." && pwd)"
FORESTER_OUT="${FORESTER_PARENT}/installer/forester/${CURRENT_OS}"

echo ">>> Шаг 1: Forester"
if [ "${CURRENT_OS}" = "linux" ] && [ -f "${FORESTER_DIR}/LINUX_build.sh" ]; then
    bash "${FORESTER_DIR}/LINUX_build.sh"
    mkdir -p "${FORESTER_OUT}/lib"
    (cd "${FORESTER_DIR}" && go build -buildmode=c-shared -o "${FORESTER_OUT}/lib/libforester.so" ./api) 2>/dev/null || true
elif [ "${CURRENT_OS}" = "macos" ] && [ -f "${FORESTER_DIR}/MACOS_build.sh" ]; then
    bash "${FORESTER_DIR}/MACOS_build.sh"
    mkdir -p "${FORESTER_OUT}/lib"
    (cd "${FORESTER_DIR}" && go build -buildmode=c-shared -o "${FORESTER_OUT}/lib/libforester.dylib" ./api) 2>/dev/null || true
    [ "$(uname -m)" = "arm64" ] && (cd "${FORESTER_DIR}" && GOOS=darwin GOARCH=arm64 go build -buildmode=c-shared -o "${FORESTER_OUT}/lib/libforester_arm64.dylib" ./api) 2>/dev/null || true
elif [ "${CURRENT_OS}" = "windows" ] && [ -f "${FORESTER_DIR}/WINDOWS_build.bat" ]; then
    FW="$(cygpath -w "${FORESTER_DIR}" 2>/dev/null || echo "${FORESTER_DIR}")"
    cmd //c "\"${FW}\\WINDOWS_build.bat\"" < /dev/null 2>/dev/null || true
    mkdir -p "${FORESTER_OUT}/lib" 2>/dev/null || true
    (cd "${FORESTER_DIR}" && go build -buildmode=c-shared -o "${FORESTER_OUT}/lib/forester.dll" ./api) 2>/dev/null || true
else
    echo "Скрипт сборки Forester для ${CURRENT_OS} не найден в ${FORESTER_DIR}"
fi

echo ">>> Шаг 2: GUI"
if [ "${CURRENT_OS}" = "linux" ] || [ "${CURRENT_OS}" = "macos" ]; then
    bash "${SCRIPTS_DIR}/build_gui_pyinstaller.sh"
else
    echo "На Windows: builder\\scripts\\build_gui_pyinstaller.bat"
fi

echo ">>> Шаг 2b: Installer (если есть sources/installer)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
[ -d "${PROJECT_ROOT}/sources/installer" ] && [ -f "${PROJECT_ROOT}/sources/installer/installer.spec" ] && bash "${SCRIPTS_DIR}/build_installer_app.sh" 2>/dev/null || true

echo ">>> Шаг 3: Образ (forester, addons, API)"
bash "${SCRIPTS_DIR}/build_installer.sh"

echo ">>> Шаг 4: Очистка сборочного мусора"
bash "${SCRIPTS_DIR}/clean_build.sh"

echo "Готово: ${PROJECT_ROOT}/DFM_Installer/"
