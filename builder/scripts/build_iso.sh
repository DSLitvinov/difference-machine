#!/bin/bash
# build_iso.sh - Создание ISO-образа из папки DFM_Installer.
# Ожидает: DFM_Installer/ уже собран (auto_build.sh или build_installer.sh).
# Результат: installer/DFM_Installer_<os>.iso (xorriso, genisoimage или mkisofs).
# Запускать из installer/ или installer/scripts/.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
DFM_INSTALLER_DIR="${PROJECT_ROOT}/DFM_Installer"

case "$(uname -s)" in
    Linux*)   DFM_OS="linux" ;;
    Darwin*)  DFM_OS="osx" ;;
    *)        DFM_OS="windows" ;;
esac

echo "=========================================="
echo "  Создание ISO из DFM_Installer"
echo "=========================================="
echo "Источник: ${DFM_INSTALLER_DIR}"
echo "Платформа: ${DFM_OS}"
echo ""

if [ ! -d "${DFM_INSTALLER_DIR}" ]; then
    echo -e "${YELLOW}⚠ Папка ${DFM_INSTALLER_DIR} не найдена. Сначала запустите auto_build.sh или build_installer.sh.${NC}"
    exit 1
fi

ISO_NAME="DFM_Installer_${DFM_OS}.iso"
ISO_PATH="${INSTALLER_DIR}/${ISO_NAME}"

if command -v xorriso >/dev/null 2>&1; then
    rm -f "${ISO_PATH}"
    xorriso -as mkisofs -r -V "DFM_Installer" -o "${ISO_PATH}" "${DFM_INSTALLER_DIR}"
    echo -e "${GREEN}✓ ISO создан (xorriso): ${ISO_PATH}${NC}"
elif command -v genisoimage >/dev/null 2>&1; then
    rm -f "${ISO_PATH}"
    genisoimage -r -V "DFM_Installer" -o "${ISO_PATH}" "${DFM_INSTALLER_DIR}"
    echo -e "${GREEN}✓ ISO создан (genisoimage): ${ISO_PATH}${NC}"
elif command -v mkisofs >/dev/null 2>&1; then
    rm -f "${ISO_PATH}"
    mkisofs -r -V "DFM_Installer" -o "${ISO_PATH}" "${DFM_INSTALLER_DIR}"
    echo -e "${GREEN}✓ ISO создан (mkisofs): ${ISO_PATH}${NC}"
else
    echo -e "${YELLOW}⚠ Инструмент для ISO не найден (xorriso, genisoimage или mkisofs). Установите один из них.${NC}"
    exit 1
fi
echo ""
