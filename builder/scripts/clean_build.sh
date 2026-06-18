#!/bin/bash
# clean_build.sh — удаление сборочного мусора (промежуточные артефакты).
# DFM_Installer/ не трогаем — это итоговый результат сборки.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${BUILDER_DIR}/.." && pwd)"

echo ">>> Очистка сборочного мусора"

rm -rf "${BUILDER_DIR}/forester"
rm -rf "${PROJECT_ROOT}/sources/installer/forester"
rm -rf "${PROJECT_ROOT}/installer/forester"
rm -rf "${PROJECT_ROOT}/dist"
rm -rf "${PROJECT_ROOT}/sources/forester/build"
rm -rf "${PROJECT_ROOT}/forester/build" 2>/dev/null || true

echo "Готово."
