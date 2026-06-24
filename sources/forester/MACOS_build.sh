#!/bin/bash
# Script to build Forester binary for macOS
# Copies the built binary to installer/forester/macos/bin/

set -e  # Stop on error

# Check that this is macOS
if [ "$(uname -s)" != "Darwin" ]; then
    echo "✗ Ошибка: Этот скрипт предназначен только для macOS!"
    echo "  Для Linux используйте: LINUX_build_and_install.sh"
    echo "  Для Windows используйте: WINDOWS_build_and_install.bat"
    exit 1
fi

FORESTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${FORESTER_DIR}/.." && pwd)"
BUILD_DIR="${FORESTER_DIR}/build"
TARGET_DIR="${PROJECT_ROOT}/installer/forester/macos/bin"

echo "=========================================="
echo "  Сборка бинарника Forester (macOS, Go)"
echo "  (CLI only - для аддона Blender)"
echo "=========================================="
echo ""
echo "Директория исходников: ${FORESTER_DIR}"
echo "Директория сборки: ${BUILD_DIR}"
echo "Целевая директория: ${TARGET_DIR}"
echo ""

# Dependency checks
echo "=== Проверка зависимостей ==="

# Check Go
if ! command -v go &> /dev/null; then
    echo "✗ Go не найден!"
    echo "Установите Go:"
    echo "  Homebrew: brew install go"
    echo "  Или скачайте с https://go.dev/dl/"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}')
echo "✓ Go найден: ${GO_VERSION}"

# Check Go version (1.21+ required)
GO_MAJOR=$(go version | grep -oE 'go[0-9]+' | sed 's/go//' | head -1)
GO_MINOR=$(go version | grep -oE 'go[0-9]+\.[0-9]+' | sed 's/go[0-9]\.//' | head -1)

if [ "${GO_MAJOR}" -lt 1 ] || ([ "${GO_MAJOR}" -eq 1 ] && [ "${GO_MINOR}" -lt 21 ]); then
    echo "✗ Требуется Go 1.21 или выше!"
    echo "  Текущая версия: ${GO_VERSION}"
    exit 1
fi

# Check C compiler (for native API library builds)
if ! command -v clang &> /dev/null && ! command -v gcc &> /dev/null; then
    echo "⚠ Компилятор C не найден (нужен для CGO)"
    echo "  Установите Xcode Command Line Tools:"
    echo "  xcode-select --install"
    echo "  Продолжим сборку без CGO..."
else
    echo "✓ Компилятор C найден"
fi

echo ""
echo "=== Загрузка зависимостей ==="
cd "${FORESTER_DIR}"
go mod download
go mod tidy

echo ""
echo "=== Сборка проекта ==="
mkdir -p "${BUILD_DIR}"

# Build with version
VERSION="${VERSION:-0.7.5}"
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

go build -ldflags "${LDFLAGS}" -o "${BUILD_DIR}/forester" ./cmd/forester

if [ ! -f "${BUILD_DIR}/forester" ]; then
    echo "✗ Ошибка сборки!"
    exit 1
fi

echo "✓ Сборка завершена: ${BUILD_DIR}/forester"

echo ""
echo "=== Запуск тестов ==="
if go test ./... > /dev/null 2>&1; then
    echo "✓ Тесты пройдены"
else
    echo "⚠ Некоторые тесты не прошли (продолжаем установку)"
fi

echo ""
echo "=== Копирование бинарника в installer/forester/macos/bin/ ==="
mkdir -p "${TARGET_DIR}"
cp "${BUILD_DIR}/forester" "${TARGET_DIR}/forester"
chmod +x "${TARGET_DIR}/forester"

echo ""
echo "=== Проверка бинарника ==="

# Verify binary
BINARY_PATH="${TARGET_DIR}/forester"
if [ -f "${BINARY_PATH}" ]; then
    echo "✓ Бинарник скопирован: ${BINARY_PATH}"
    
    # Verify the binary runs
    if [ -x "${BINARY_PATH}" ]; then
        echo "✓ Файл исполняемый"
        
        # Try to get version
        VERSION_OUTPUT=$("${BINARY_PATH}" --version 2>&1 || echo "")
        if [ -n "${VERSION_OUTPUT}" ]; then
            echo "✓ Версия: ${VERSION_OUTPUT}"
        else
            # Try to run help
            HELP_OUTPUT=$("${BINARY_PATH}" --help 2>&1 | head -3 || echo "")
            if [ -n "${HELP_OUTPUT}" ]; then
                echo "✓ Бинарник работает (help доступен)"
            else
                echo "⚠ Не удалось проверить работу бинарника"
            fi
        fi
    else
        echo "⚠ Файл не исполняемый! Исправление прав..."
        chmod +x "${BINARY_PATH}"
        echo "✓ Права исправлены"
    fi
else
    echo "✗ Бинарник не найден!"
    echo "Проверьте логи сборки выше."
    exit 1
fi

# Clean temporary files
echo ""
echo "=== Очистка временных файлов ==="

# Remove binary from build directory
if [ -f "${BUILD_DIR}/forester" ]; then
    rm -f "${BUILD_DIR}/forester"
    echo "✓ Временный бинарник удален из ${BUILD_DIR}"
fi

# Remove binary from repository root (if created by mistake)
if [ -f "${FORESTER_DIR}/forester" ]; then
    rm -f "${FORESTER_DIR}/forester"
    echo "✓ Бинарник удален из корня проекта"
fi

# Clean bin directory (if it exists)
if [ -d "${FORESTER_DIR}/bin" ]; then
    rm -rf "${FORESTER_DIR}/bin"
    echo "✓ Директория bin/ очищена"
fi

echo ""
echo "=========================================="
echo "  ✓ Сборка завершена успешно!"
echo "=========================================="
echo ""
echo "Бинарник: ${BINARY_PATH}"
echo ""


