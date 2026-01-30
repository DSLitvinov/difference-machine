#!/bin/bash
# build_installer_full.sh - Полная сборка установщика: Forester, GUI (PyInstaller), образ в DFM_Installer.
# Структура: DFM_Installer/<linux|windows|osx>/forester, .../diffmachine_gui; addons/; install.sh, install.bat, README.txt.
# ISO не создаётся — отдельно: installer/scripts/build_iso.sh
# На Windows GUI собирайте отдельно: installer\scripts\build_gui_pyinstaller.bat, затем снова этот скрипт или только scripts/build_installer.sh.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INSTALLER_DIR="${SCRIPT_DIR}"
SCRIPTS_DIR="${INSTALLER_DIR}/scripts"

case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ;;
    Darwin*) CURRENT_OS="macos" ;;
    *)       CURRENT_OS="windows" ;;
esac

echo "=========================================="
echo "  Полная сборка установщика Forester"
echo "=========================================="
echo "Корень проекта: ${PROJECT_ROOT}"
echo "Установщик: ${INSTALLER_DIR}"
echo "Платформа: ${CURRENT_OS}"
echo ""

# 1. Сборка Forester и API в installer/forester/<os>/
echo ">>> Шаг 1: Сборка Forester и API"
bash "${SCRIPTS_DIR}/build_forester.sh"
echo ""

# 2. Сборка GUI через PyInstaller → DFM_Installer/<os>/diffmachine_gui/
if [ "${CURRENT_OS}" = "linux" ] || [ "${CURRENT_OS}" = "macos" ]; then
    echo ">>> Шаг 2: Сборка GUI (PyInstaller)"
    bash "${SCRIPTS_DIR}/build_gui_pyinstaller.sh"
    echo ""
else
    echo ">>> Шаг 2: GUI (Windows)"
    echo -e "${YELLOW}На Windows запустите: installer\\scripts\\build_gui_pyinstaller.bat${NC}"
    echo "Затем снова этот скрипт или только scripts/build_installer.sh для копирования forester, addons и скриптов."
    echo ""
fi

# 3. Копирование forester в DFM_Installer/<os>/forester, addons, скрипты (без ISO)
echo ">>> Шаг 3: Сборка образа установщика (forester, addons, скрипты)"
bash "${SCRIPTS_DIR}/build_installer.sh"
echo ""

echo "=========================================="
echo -e "${GREEN}Сборка завершена. Образ: ${INSTALLER_DIR}/DFM_Installer/${NC}"
echo "ISO: installer/scripts/build_iso.sh"
echo "=========================================="
