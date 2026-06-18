#!/bin/bash
# build_installer.sh - Сборка forester, addons, API в DFM_Installer (только сборка, без скриптов установки).
# Выход: <project_root>/DFM_Installer/<os>/forester, difference_machine, addons/.
# Запускать из builder/ или builder/scripts/.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
DFM_INSTALLER_DIR="${PROJECT_ROOT}/DFM_Installer"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ; DFM_OS="linux" ;;
    Darwin*) CURRENT_OS="macos"  ; DFM_OS="osx"  ;;
    *)       CURRENT_OS="windows"; DFM_OS="windows" ;;
esac

echo "=========================================="
echo "  Сборка образа установщика (только ${DFM_OS})"
echo "=========================================="
echo "Платформа: ${CURRENT_OS} → папка DFM_Installer/${DFM_OS}/"
echo "Цель: ${DFM_INSTALLER_DIR}"
echo ""

# Только папка текущей платформы
mkdir -p "${DFM_INSTALLER_DIR}/${DFM_OS}"

# 1. Копирование Forester для текущей ОС в DFM_Installer/<os>/forester/
# Ищем в sources/installer/forester/<os>, installer/forester/<os> или builder/forester/<os>
echo "=== Копирование Forester (${DFM_OS}) ==="
FORESTER_SRC=""
for cand in "${PROJECT_ROOT}/sources/installer/forester/${CURRENT_OS}" "${PROJECT_ROOT}/installer/forester/${CURRENT_OS}" "${BUILDER_DIR}/forester/${CURRENT_OS}"; do
    if [ -d "${cand}" ] && { [ -f "${cand}/bin/forester" ] || [ -f "${cand}/bin/forester.exe" ]; }; then
        FORESTER_SRC="${cand}"
        break
    fi
done
FORESTER_DST="${DFM_INSTALLER_DIR}/${DFM_OS}/forester"
if [ -n "${FORESTER_SRC}" ]; then
    rm -rf "${FORESTER_DST}"
    mkdir -p "${FORESTER_DST}/bin" "${FORESTER_DST}/lib"
    [ -f "${FORESTER_SRC}/bin/forester" ] && cp "${FORESTER_SRC}/bin/forester" "${FORESTER_DST}/bin/" && chmod +x "${FORESTER_DST}/bin/forester"
    [ -f "${FORESTER_SRC}/bin/forester.exe" ] && cp "${FORESTER_SRC}/bin/forester.exe" "${FORESTER_DST}/bin/"
    for lib in libforester.so libforester.dylib libforester_arm64.dylib forester.dll; do
        [ -f "${FORESTER_SRC}/lib/${lib}" ] && cp "${FORESTER_SRC}/lib/${lib}" "${FORESTER_DST}/lib/"
    done
    [ -f "${FORESTER_DST}/lib/libforester.so" ] && chmod +x "${FORESTER_DST}/lib/libforester.so"
    [ -f "${FORESTER_DST}/lib/libforester.dylib" ] && chmod +x "${FORESTER_DST}/lib/libforester.dylib"
    echo -e "${GREEN}✓ Forester скопирован в ${DFM_OS}/forester/${NC}"
else
    echo -e "${YELLOW}⚠ Forester не найден (sources/installer/forester/${CURRENT_OS} или builder/forester/${CURRENT_OS})${NC}"
fi
echo ""

# 2. Копирование аддонов (общая папка addons/blender/)
echo "=== Копирование аддонов ==="
"${SCRIPT_DIR}/copy_addons.sh" "${DFM_INSTALLER_DIR}"
echo ""

# 3. API в addons/blender/difference_machine/api/ (только текущая платформа)
echo "=== Копирование API в аддон ==="
ADDON_API_DIR="${DFM_INSTALLER_DIR}/addons/blender/difference_machine/api"
SOURCES_DIR="${PROJECT_ROOT}/sources"
FORESTER_API_SRC="${SOURCES_DIR}/forester/api"
if [ ! -d "${FORESTER_API_SRC}" ]; then
    FORESTER_API_SRC="${PROJECT_ROOT}/forester/api"
fi
mkdir -p "${ADDON_API_DIR}" "${ADDON_API_DIR}/python"
if [ "${DFM_OS}" = "linux" ]; then
    lib_name="libforester.so"
elif [ "${DFM_OS}" = "osx" ]; then
    lib_name="libforester.dylib"
else
    lib_name="forester.dll"
fi
src="${DFM_INSTALLER_DIR}/${DFM_OS}/forester/lib/${lib_name}"
if [ -f "${src}" ]; then
    cp "${src}" "${ADDON_API_DIR}/"
fi
if [ -d "${FORESTER_API_SRC}" ]; then
    cp "${FORESTER_API_SRC}/python_bindings.py" "${ADDON_API_DIR}/python/" 2>/dev/null || true
    cp "${FORESTER_API_SRC}/python_bindings_structured.py" "${ADDON_API_DIR}/python/" 2>/dev/null || true
fi
echo -e "${GREEN}✓ API в addons/blender/difference_machine/api/${NC}"
echo ""

# 4. API в difference_machine для текущей платформы (папку api/ создаём и заполняем после PyInstaller)
echo "=== Копирование API в GUI (${DFM_OS}) ==="
GUI_ROOT="${DFM_INSTALLER_DIR}/${DFM_OS}/difference_machine"
GUI_API_DIR="${GUI_ROOT}/api"
if [ -d "${GUI_ROOT}" ]; then
    mkdir -p "${GUI_API_DIR}" "${GUI_API_DIR}/python"
    if [ "${DFM_OS}" = "linux" ]; then
        lib_name="libforester.so"
    elif [ "${DFM_OS}" = "osx" ]; then
        lib_name="libforester.dylib"
    else
        lib_name="forester.dll"
    fi
    src="${DFM_INSTALLER_DIR}/${DFM_OS}/forester/lib/${lib_name}"
    if [ -f "${src}" ]; then
        cp "${src}" "${GUI_API_DIR}/"
    fi
    if [ -d "${FORESTER_API_SRC}" ]; then
        cp "${FORESTER_API_SRC}/python_bindings.py" "${GUI_API_DIR}/python/" 2>/dev/null || true
        cp "${FORESTER_API_SRC}/python_bindings_structured.py" "${GUI_API_DIR}/python/" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ API в ${DFM_OS}/difference_machine/api/${NC}"
else
    echo -e "${YELLOW}⚠ ${DFM_OS}/difference_machine/ ещё не собран (сначала build_gui)${NC}"
fi
echo ""

echo -e "${GREEN}Готово. Образ: ${DFM_INSTALLER_DIR}${NC}"
echo "ISO: scripts/build_iso.sh"
echo ""
