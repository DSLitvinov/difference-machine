#!/bin/bash
# build_installer.sh - Сборка образа установщика: копирование forester в папку ОС, addons, скриптов.
# DFM_Installer не удаляется. ISO не создаётся — для этого отдельно: build_iso.sh.
# Ожидает: installer/forester/ заполнен для текущей ОС; GUI уже собран в DFM_Installer/<os>/diffmachine_gui/.
# Запускать из installer/ или installer/scripts/.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${INSTALLER_DIR}/.." && pwd)"
DFM_INSTALLER_DIR="${INSTALLER_DIR}/DFM_Installer"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ; DFM_OS="linux" ;;
    Darwin*) CURRENT_OS="macos"  ; DFM_OS="osx"  ;;
    *)       CURRENT_OS="windows"; DFM_OS="windows" ;;
esac

echo "=========================================="
echo "  Сборка образа установщика"
echo "=========================================="
echo "Платформа: ${CURRENT_OS} → папка DFM_Installer/${DFM_OS}/"
echo "Цель: ${DFM_INSTALLER_DIR}"
echo ""

# Папки по платформам (не удаляем DFM_Installer)
mkdir -p "${DFM_INSTALLER_DIR}/linux" "${DFM_INSTALLER_DIR}/windows" "${DFM_INSTALLER_DIR}/osx"

# 1. Копирование Forester для текущей ОС в DFM_Installer/<os>/forester/
echo "=== Копирование Forester (${DFM_OS}) ==="
FORESTER_SRC="${INSTALLER_DIR}/forester/${CURRENT_OS}"
FORESTER_DST="${DFM_INSTALLER_DIR}/${DFM_OS}/forester"
if [ -d "${FORESTER_SRC}" ]; then
    rm -rf "${FORESTER_DST}"
    cp -r "${FORESTER_SRC}" "${FORESTER_DST}"
    [ -f "${FORESTER_DST}/bin/forester" ] && chmod +x "${FORESTER_DST}/bin/forester"
    [ -f "${FORESTER_DST}/lib/libforester.so" ] && chmod +x "${FORESTER_DST}/lib/libforester.so"
    [ -f "${FORESTER_DST}/lib/libforester.dylib" ] && chmod +x "${FORESTER_DST}/lib/libforester.dylib"
    echo -e "${GREEN}✓ Forester скопирован в ${DFM_OS}/forester/${NC}"
else
    echo -e "${YELLOW}⚠ installer/forester/${CURRENT_OS}/ не найден${NC}"
fi
echo ""

# 2. Копирование аддонов (общая папка addons/blender/)
echo "=== Копирование аддонов ==="
"${SCRIPT_DIR}/copy_addons.sh" "${DFM_INSTALLER_DIR}"
echo ""

# 3. API в addons/blender/diffmachine/api/ (все платформы из уже собранных в DFM_Installer)
echo "=== Копирование API в аддон ==="
ADDON_API_DIR="${DFM_INSTALLER_DIR}/addons/blender/diffmachine/api"
PY_BINDINGS_SRC="${PROJECT_ROOT}/forester/api"
mkdir -p "${ADDON_API_DIR}" "${ADDON_API_DIR}/python"
for os_folder in linux windows osx; do
    if [ "${os_folder}" = "linux" ]; then
        lib_name="libforester.so"
    elif [ "${os_folder}" = "osx" ]; then
        lib_name="libforester.dylib"
    else
        lib_name="forester.dll"
    fi
    src="${DFM_INSTALLER_DIR}/${os_folder}/forester/lib/${lib_name}"
    if [ -f "${src}" ]; then
        cp "${src}" "${ADDON_API_DIR}/"
    fi
done
if [ -d "${PY_BINDINGS_SRC}" ]; then
    cp "${PY_BINDINGS_SRC}/python_bindings.py" "${ADDON_API_DIR}/python/" 2>/dev/null || true
    cp "${PY_BINDINGS_SRC}/python_bindings_structured.py" "${ADDON_API_DIR}/python/" 2>/dev/null || true
fi
echo -e "${GREEN}✓ API в addons/blender/diffmachine/api/${NC}"
echo ""

# 4. API в diffmachine_gui для текущей платформы (папку api/ создаём и заполняем после PyInstaller)
echo "=== Копирование API в GUI (${DFM_OS}) ==="
GUI_ROOT="${DFM_INSTALLER_DIR}/${DFM_OS}/diffmachine_gui"
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
    if [ -d "${PY_BINDINGS_SRC}" ]; then
        cp "${PY_BINDINGS_SRC}/python_bindings.py" "${GUI_API_DIR}/python/" 2>/dev/null || true
        cp "${PY_BINDINGS_SRC}/python_bindings_structured.py" "${GUI_API_DIR}/python/" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ API в ${DFM_OS}/diffmachine_gui/api/${NC}"
else
    echo -e "${YELLOW}⚠ ${DFM_OS}/diffmachine_gui/ ещё не собран (сначала build_gui)${NC}"
fi
echo ""

# 5. Скрипты установки и README (перезапись)
echo "=== Копирование скриптов установки ==="
[ -f "${INSTALLER_DIR}/install.sh" ] && cp "${INSTALLER_DIR}/install.sh" "${DFM_INSTALLER_DIR}/" && chmod +x "${DFM_INSTALLER_DIR}/install.sh" && echo -e "${GREEN}✓ install.sh${NC}"
[ -f "${INSTALLER_DIR}/install.bat" ] && cp "${INSTALLER_DIR}/install.bat" "${DFM_INSTALLER_DIR}/" && echo -e "${GREEN}✓ install.bat${NC}"
echo ""

# 6. README
echo "=== README ==="
cat > "${DFM_INSTALLER_DIR}/README.txt" << 'EOF'
Forester Installer
==================

Содержимое:
  linux/    - Forester и GUI для Linux
  windows/  - Forester и GUI для Windows
  osx/      - Forester и GUI для macOS
  addons/   - аддоны (Blender и др.)

БЫСТРЫЙ СТАРТ:
  Linux/macOS: ./install.sh
  Windows:     install.bat

Скрипт установки копирует бинарники и GUI из папки вашей ОС в выбранный каталог.
EOF
echo -e "${GREEN}✓ README.txt обновлён${NC}"
echo ""
echo -e "${GREEN}Готово. Образ: ${DFM_INSTALLER_DIR}${NC}"
echo "ISO: scripts/build_iso.sh"
echo ""
