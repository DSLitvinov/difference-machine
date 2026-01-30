#!/bin/bash
# build_gui_pyinstaller.sh - Сборка diffmachine_gui через PyInstaller (Linux/macOS).
# Результат: installer/DFM_Installer/<os>/diffmachine_gui/

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${INSTALLER_DIR}/.." && pwd)"
GUI_DIR="${PROJECT_ROOT}/diffmachine_gui"
DFM_INSTALLER_DIR="${INSTALLER_DIR}/DFM_Installer"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ; DFM_OS="linux" ;;
    Darwin*) CURRENT_OS="macos"  ; DFM_OS="osx"  ;;
    *)       echo "Скрипт предназначен для Linux или macOS. Для Windows используйте build_gui_pyinstaller.bat"; exit 1 ;;
esac

DISTPATH="${DFM_INSTALLER_DIR}/${DFM_OS}"
WORK_DIR="${GUI_DIR}/build/pyinstaller_${CURRENT_OS}"
SPEC_PATH="${GUI_DIR}/diffmachine.spec"

echo "=========================================="
echo "  Сборка GUI (PyInstaller)"
echo "=========================================="
echo "Платформа: ${CURRENT_OS} → ${DFM_OS}/"
echo "Исходники: ${GUI_DIR}"
echo "Выход: ${DISTPATH}/diffmachine_gui/"
echo ""

if [ ! -f "${SPEC_PATH}" ]; then
    echo -e "${RED}Spec не найден: ${SPEC_PATH}${NC}"
    exit 1
fi

if ! command -v pyinstaller &>/dev/null; then
    echo -e "${RED}PyInstaller не найден. Установите: pip install pyinstaller${NC}"
    exit 1
fi

cd "${GUI_DIR}"
mkdir -p "${DISTPATH}" "${WORK_DIR}"

pyinstaller --noconfirm --clean \
    --distpath "${DISTPATH}" \
    --workpath "${WORK_DIR}" \
    "${SPEC_PATH}"

if [ -d "${DISTPATH}/diffmachine_gui" ]; then
    echo ""
    echo -e "${GREEN}✓ GUI собран: ${DISTPATH}/diffmachine_gui/${NC}"
else
    echo -e "${RED}Ожидалась папка ${DISTPATH}/diffmachine_gui${NC}"
    exit 1
fi
