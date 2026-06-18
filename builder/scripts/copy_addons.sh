#!/bin/bash
# copy_addons.sh - Копирование аддонов в целевую папку установщика
# Использование: copy_addons.sh [TARGET_DIR]
# По умолчанию TARGET_DIR = installer/DFM_Installer (если запуск из installer/ или installer/scripts/)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"
SOURCES_DIR="${PROJECT_ROOT}/sources"
ADDONS_SOURCE="${SOURCES_DIR}/addons"
if [ ! -d "${ADDONS_SOURCE}" ]; then
    ADDONS_SOURCE="${PROJECT_ROOT}/addons"
fi
TARGET_DIR="${1:-${PROJECT_ROOT}/DFM_Installer}"

echo "=== Копирование аддонов ==="
echo "Источник: ${ADDONS_SOURCE}"
echo "Назначение: ${TARGET_DIR}/addons"
echo ""

if [ ! -d "${ADDONS_SOURCE}" ]; then
    echo "Папка addons не найдена: ${ADDONS_SOURCE}"
    exit 1
fi

mkdir -p "${TARGET_DIR}"
cp -r "${ADDONS_SOURCE}" "${TARGET_DIR}/"
echo "Аддоны скопированы в ${TARGET_DIR}/addons"
