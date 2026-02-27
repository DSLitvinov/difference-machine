#!/bin/bash
# build_gui_pyinstaller.sh - Сборка difference_machine (GUI) через PyInstaller (Linux/macOS).
# Результат: installer/DFM_Installer/<os>/difference_machine/

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
SOURCES_DIR="${PROJECT_ROOT}/sources"
GUI_DIR="${SOURCES_DIR}/difference_machine"
if [ ! -d "${GUI_DIR}" ]; then
    GUI_DIR="${PROJECT_ROOT}/difference_machine"
fi
DFM_INSTALLER_DIR="${PROJECT_ROOT}/DFM_Installer"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ; DFM_OS="linux" ;;
    Darwin*) CURRENT_OS="macos"  ; DFM_OS="osx"  ;;
    *)       echo "Скрипт предназначен для Linux или macOS. Для Windows используйте build_gui_pyinstaller.bat"; exit 1 ;;
esac

DISTPATH="${DFM_INSTALLER_DIR}/${DFM_OS}"
WORK_DIR="${GUI_DIR}/build/pyinstaller_${CURRENT_OS}"
SPEC_PATH="${GUI_DIR}/difference_machine.spec"

echo "=========================================="
echo "  Сборка GUI (PyInstaller)"
echo "=========================================="
echo "Платформа: ${CURRENT_OS} → ${DFM_OS}/"
echo "Исходники: ${GUI_DIR}"
echo "Выход: ${DISTPATH}/difference_machine/"
echo ""

if [ ! -f "${SPEC_PATH}" ]; then
    echo -e "${RED}Spec не найден: ${SPEC_PATH}${NC}"
    exit 1
fi

# PyInstaller: в PATH или через python -m (типично на macOS после pip install)
PYINSTALLER_CMD=""
if command -v pyinstaller &>/dev/null; then
    PYINSTALLER_CMD="pyinstaller"
elif python3 -c "import PyInstaller" 2>/dev/null; then
    PYINSTALLER_CMD="python3 -m PyInstaller"
elif python -c "import PyInstaller" 2>/dev/null; then
    PYINSTALLER_CMD="python -m PyInstaller"
fi
if [ -z "${PYINSTALLER_CMD}" ]; then
    echo -e "${RED}PyInstaller не найден. Установите: pip install pyinstaller${NC}"
    echo "  Или: pip install -r builder/requirements-build.txt"
    exit 1
fi

cd "${GUI_DIR}"
mkdir -p "${DISTPATH}" "${WORK_DIR}"

${PYINSTALLER_CMD} --noconfirm --clean \
    --distpath "${DISTPATH}" \
    --workpath "${WORK_DIR}" \
    "${SPEC_PATH}"

if [ -d "${DISTPATH}/difference_machine" ]; then
    echo ""
    echo -e "${GREEN}✓ GUI собран: ${DISTPATH}/difference_machine/${NC}"
    # На macOS установщик ожидает исполняемый файл DifferenceMachine в корне папки
    if [ "${CURRENT_OS}" = "macos" ] && [ ! -x "${DISTPATH}/difference_machine/DifferenceMachine" ]; then
        echo -e "${YELLOW}⚠ Исполняемый файл DifferenceMachine не найден или не исполняемый. Проверьте вывод PyInstaller.${NC}"
    fi
else
    echo -e "${RED}Ожидалась папка ${DISTPATH}/difference_machine${NC}"
    exit 1
fi
