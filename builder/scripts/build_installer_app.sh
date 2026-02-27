#!/bin/bash
# build_installer_app.sh - Сборка PyQt-установщика (sources/installer) через PyInstaller.
# Результат: DFM_Installer/<os>/installer/
# Запускать только если sources/installer существует с installer.spec.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
INSTALLER_SRC="${PROJECT_ROOT}/sources/installer"
DFM_INSTALLER_DIR="${PROJECT_ROOT}/DFM_Installer"
SPEC_PATH="${INSTALLER_SRC}/installer.spec"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ; DFM_OS="linux" ;;
    Darwin*) CURRENT_OS="macos"  ; DFM_OS="osx"  ;;
    *)       echo "Скрипт для Linux/macOS. Windows: build_installer_app.bat"; exit 1 ;;
esac

if [ ! -d "${INSTALLER_SRC}" ] || [ ! -f "${SPEC_PATH}" ]; then
    echo -e "${YELLOW}⚠ sources/installer/ или installer.spec не найдены — пропуск${NC}"
    exit 0
fi

DISTPATH="${DFM_INSTALLER_DIR}/${DFM_OS}"
WORK_DIR="${INSTALLER_SRC}/build/pyinstaller_${CURRENT_OS}"

echo "=========================================="
echo "  Сборка Installer (PyInstaller)"
echo "=========================================="
echo "Исходники: ${INSTALLER_SRC}"
echo "Выход: ${DISTPATH}/installer/"
echo ""

cd "${INSTALLER_SRC}"
mkdir -p "${DISTPATH}" "${WORK_DIR}"

pyinstaller --noconfirm --clean \
    --distpath "${DISTPATH}" \
    --workpath "${WORK_DIR}" \
    "${SPEC_PATH}"

if [ -d "${DISTPATH}/installer" ]; then
    echo ""
    echo -e "${GREEN}✓ Installer собран: ${DISTPATH}/installer/${NC}"
else
    echo -e "${YELLOW}⚠ Ожидалась папка ${DISTPATH}/installer${NC}"
fi
