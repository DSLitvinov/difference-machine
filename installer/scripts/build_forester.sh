#!/bin/bash
# build_forester.sh - Сборка Forester CLI и API библиотек в installer/forester/
# Запускать из корня проекта или из installer/. Для сборки под текущую ОС — запуск на Linux/macOS.
# Windows: бинарник и API можно кросс-компилировать с Linux/macOS (Go); иначе запустить WINDOWS_build.bat на Windows.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${INSTALLER_DIR}/.." && pwd)"
FORESTER_DIR="${PROJECT_ROOT}/forester"

# Текущая ОС
CURRENT_OS=""
case "$(uname -s)" in
    Linux*)   CURRENT_OS="linux" ;;
    Darwin*) CURRENT_OS="macos" ;;
    MINGW*|MSYS*|CYGWIN*) CURRENT_OS="windows" ;;
    *)       CURRENT_OS="unknown" ;;
esac

echo "=========================================="
echo "  Сборка Forester и API"
echo "=========================================="
echo "Корень проекта: ${PROJECT_ROOT}"
echo "Выход: ${INSTALLER_DIR}/forester/"
echo "Текущая ОС: ${CURRENT_OS}"
echo ""

BUILD_ERRORS=0
set +e

# --- Linux ---
if [ -f "${FORESTER_DIR}/LINUX_build.sh" ]; then
    echo "--- Сборка бинарника для Linux ---"
    if [ "${CURRENT_OS}" = "linux" ]; then
        if bash "${FORESTER_DIR}/LINUX_build.sh"; then
            echo -e "${GREEN}✓ Linux бинарник собран${NC}"
        else
            echo -e "${RED}✗ Ошибка сборки Linux бинарника${NC}"
            BUILD_ERRORS=$((BUILD_ERRORS + 1))
        fi
        LINUX_API_TARGET_DIR="${INSTALLER_DIR}/forester/linux/lib"
        mkdir -p "${LINUX_API_TARGET_DIR}"
        (cd "${FORESTER_DIR}" && GOOS=linux GOARCH=amd64 go build -buildmode=c-shared -o "${LINUX_API_TARGET_DIR}/libforester.so" ./api) && echo -e "${GREEN}✓ Linux API собрана${NC}" || { echo -e "${YELLOW}⚠ Ошибка Linux API${NC}"; BUILD_ERRORS=$((BUILD_ERRORS + 1)); }
    else
        echo -e "${YELLOW}⚠ Пропущено (нужен Linux)${NC}"
    fi
    echo ""
fi

# --- macOS ---
if [ -f "${FORESTER_DIR}/MACOS_build.sh" ]; then
    echo "--- Сборка бинарника для macOS ---"
    if [ "${CURRENT_OS}" = "macos" ]; then
        if bash "${FORESTER_DIR}/MACOS_build.sh"; then
            echo -e "${GREEN}✓ macOS бинарник собран${NC}"
        else
            echo -e "${RED}✗ Ошибка сборки macOS бинарника${NC}"
            BUILD_ERRORS=$((BUILD_ERRORS + 1))
        fi
        MACOS_API_TARGET_DIR="${INSTALLER_DIR}/forester/macos/lib"
        mkdir -p "${MACOS_API_TARGET_DIR}"
        (cd "${FORESTER_DIR}" && GOOS=darwin GOARCH=amd64 go build -buildmode=c-shared -o "${MACOS_API_TARGET_DIR}/libforester.dylib" ./api) && echo -e "${GREEN}✓ macOS API (amd64) собрана${NC}" || true
        if (cd "${FORESTER_DIR}" && GOOS=darwin GOARCH=arm64 go build -buildmode=c-shared -o "${MACOS_API_TARGET_DIR}/libforester_arm64.dylib" ./api); then
            echo -e "${GREEN}✓ macOS API (arm64) собрана${NC}"
            [ "$(uname -m)" = "arm64" ] && cp "${MACOS_API_TARGET_DIR}/libforester_arm64.dylib" "${MACOS_API_TARGET_DIR}/libforester.dylib"
        fi
    else
        echo -e "${YELLOW}⚠ Пропущено (нужен macOS)${NC}"
    fi
    echo ""
fi

# --- Windows (кросс-компиляция) ---
if command -v go &>/dev/null; then
    echo "--- Сборка бинарника и API для Windows (кросс) ---"
    WINDOWS_BIN_DIR="${INSTALLER_DIR}/forester/windows/bin"
    WINDOWS_LIB_DIR="${INSTALLER_DIR}/forester/windows/lib"
    mkdir -p "${WINDOWS_BIN_DIR}" "${WINDOWS_LIB_DIR}"
    VERSION="${VERSION:-0.7.5}"
    BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
    GIT_COMMIT=$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"
    (cd "${FORESTER_DIR}" && GOOS=windows GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o "${WINDOWS_BIN_DIR}/forester.exe" ./cmd/forester) && echo -e "${GREEN}✓ Windows forester.exe собран${NC}" || echo -e "${YELLOW}⚠ Ошибка Windows forester${NC}"
    (cd "${FORESTER_DIR}" && GOOS=windows GOARCH=amd64 go build -buildmode=c-shared -o "${WINDOWS_LIB_DIR}/forester.dll" ./api) && echo -e "${GREEN}✓ Windows forester.dll собрана${NC}" || echo -e "${YELLOW}⚠ Ошибка Windows API${NC}"
    echo ""
fi

set -e

echo "=== Проверка ==="
for os in linux macos windows; do
    [ -f "${INSTALLER_DIR}/forester/${os}/bin/forester" ] || [ -f "${INSTALLER_DIR}/forester/${os}/bin/forester.exe" ] && echo -e "${GREEN}✓ ${os} бинарник${NC}" || echo -e "${YELLOW}⚠ ${os} бинарник отсутствует${NC}"
    [ -f "${INSTALLER_DIR}/forester/${os}/lib/libforester.so" ] || [ -f "${INSTALLER_DIR}/forester/${os}/lib/libforester.dylib" ] || [ -f "${INSTALLER_DIR}/forester/${os}/lib/forester.dll" ] && echo -e "${GREEN}✓ ${os} API${NC}" || echo -e "${YELLOW}⚠ ${os} API отсутствует${NC}"
done
echo ""
echo -e "${GREEN}Готово. Результат в ${INSTALLER_DIR}/forester/${NC}"
