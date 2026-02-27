#!/bin/bash
# install.sh - Universal Forester installer for Linux/macOS
# For Windows use install.bat

set -e

# Output colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)
            echo "linux"
            ;;
        Darwin*)
            echo "macos"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)
            echo "x64"
            ;;
        arm64|aarch64)
            echo "arm64"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# Find Python 3 for GUI venv
find_python() {
    if command -v python3 >/dev/null 2>&1; then
        echo "python3"
        return
    fi
    if command -v python >/dev/null 2>&1; then
        echo "python"
        return
    fi
    echo ""
}

OS=$(detect_os)
ARCH=$(detect_arch)

# Папка в установщике: linux, osx (для macOS), windows
case "${OS}" in
    linux) PLATFORM_DIR="linux" ;;
    macos) PLATFORM_DIR="osx" ;;
    *)     PLATFORM_DIR="linux" ;;
esac

echo "=========================================="
echo "  Forester Installer"
echo "=========================================="
echo ""
echo "Обнаружена ОС: ${OS} (${ARCH}) → папка ${PLATFORM_DIR}/"
echo ""

# Check for binary for current OS
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_DIR="${INSTALLER_DIR}/${PLATFORM_DIR}/forester/bin"

if [ ! -d "${BINARY_DIR}" ]; then
    echo -e "${RED}✗ Ошибка: бинарники для ${OS} не найдены!${NC}"
    echo "Проверьте наличие папки: ${BINARY_DIR}"
    exit 1
fi

BINARY_NAME="forester"
BINARY_PATH="${BINARY_DIR}/${BINARY_NAME}"

# Determine API library name
if [ "${OS}" = "linux" ]; then
    API_LIB_NAME="libforester.so"
elif [ "${OS}" = "macos" ]; then
    API_LIB_NAME="libforester.dylib"
else
    API_LIB_NAME="libforester.so"
fi

API_LIB_DIR="${INSTALLER_DIR}/${PLATFORM_DIR}/forester/lib"
API_LIB_PATH="${API_LIB_DIR}/${API_LIB_NAME}"

if [ ! -f "${BINARY_PATH}" ]; then
    echo -e "${RED}✗ Ошибка: бинарник не найден: ${BINARY_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Бинарник найден: ${BINARY_PATH}${NC}"

# Check for API library (optional)
if [ -f "${API_LIB_PATH}" ]; then
    echo -e "${GREEN}✓ Библиотека API найдена: ${API_LIB_PATH}${NC}"
    API_LIB_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ Библиотека API не найдена: ${API_LIB_PATH}${NC}"
    echo "  API будет недоступен, будет использоваться CLI"
    API_LIB_AVAILABLE=false
fi
echo ""

# Choose installation path
if [ "${OS}" = "linux" ]; then
    DEFAULT_INSTALL_PATH="/opt/DiffMachine"
elif [ "${OS}" = "macos" ]; then
    DEFAULT_INSTALL_PATH="/Applications/DiffMachine"
else
    DEFAULT_INSTALL_PATH="${HOME}/DiffMachine"
fi

read -p "Путь установки [${DEFAULT_INSTALL_PATH}]: " INSTALL_PATH
INSTALL_PATH=${INSTALL_PATH:-${DEFAULT_INSTALL_PATH}}

GUI_SRC_DIR="${INSTALLER_DIR}/${PLATFORM_DIR}/difference_machine"
GUI_INSTALL_DIR="${INSTALL_PATH}/difference_machine"
GUI_VENV_DIR="${INSTALL_PATH}/gui-venv"

echo ""
echo "Установка в: ${INSTALL_PATH}"
echo ""

# Create installation directory
echo "=== Создание директорий ==="
if [ "${OS}" = "linux" ] || [ "${OS}" = "macos" ]; then
    # System directories may require sudo
    if [[ "${INSTALL_PATH}" =~ ^/(opt|usr|Applications) ]]; then
        echo -e "${YELLOW}Требуются права администратора для установки в системную директорию${NC}"
        sudo mkdir -p "${INSTALL_PATH}/bin"
        sudo cp "${BINARY_PATH}" "${INSTALL_PATH}/bin/${BINARY_NAME}"
        sudo chmod +x "${INSTALL_PATH}/bin/${BINARY_NAME}"
        INSTALL_CMD="sudo"
    else
        mkdir -p "${INSTALL_PATH}/bin"
        cp "${BINARY_PATH}" "${INSTALL_PATH}/bin/${BINARY_NAME}"
        chmod +x "${INSTALL_PATH}/bin/${BINARY_NAME}"
        INSTALL_CMD=""
    fi
else
    mkdir -p "${INSTALL_PATH}/bin"
    cp "${BINARY_PATH}" "${INSTALL_PATH}/bin/${BINARY_NAME}"
    chmod +x "${INSTALL_PATH}/bin/${BINARY_NAME}"
    INSTALL_CMD=""
fi

echo -e "${GREEN}✓ Бинарник установлен: ${INSTALL_PATH}/bin/${BINARY_NAME}${NC}"
echo ""

# Verify binary works
echo "=== Проверка установки ==="
INSTALLED_BINARY="${INSTALL_PATH}/bin/${BINARY_NAME}"
if [ -x "${INSTALLED_BINARY}" ]; then
    VERSION_OUTPUT=$("${INSTALLED_BINARY}" --version 2>&1 || "${INSTALLED_BINARY}" --help 2>&1 | head -1)
    echo -e "${GREEN}✓ Бинарник работает${NC}"
    if [ -n "${VERSION_OUTPUT}" ]; then
        echo "  Версия: ${VERSION_OUTPUT}"
    fi
else
    echo -e "${YELLOW}⚠ Не удалось проверить работу бинарника${NC}"
fi

echo ""

# Install GUI (difference_machine): PyInstaller-сборка или исходники + venv
GUI_INSTALLED=false
GUI_LAUNCHER=""

if [ -d "${GUI_SRC_DIR}" ]; then
    echo "=== Установка GUI (Difference Machine) ==="
    set +e

    # Сборка PyInstaller: исполняемый файл DifferenceMachine в корне difference_machine
    # На macOS бандл содержит симлинки; копировать с -RP (preserve symlinks), иначе segfault при запуске
    if [ -x "${GUI_SRC_DIR}/DifferenceMachine" ]; then
        if [ -n "${INSTALL_CMD}" ]; then
            ${INSTALL_CMD} mkdir -p "${GUI_INSTALL_DIR}"
            ${INSTALL_CMD} cp -RP "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/" 2>/dev/null || ${INSTALL_CMD} cp -r "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/"
            ${INSTALL_CMD} chmod a+rx "${GUI_INSTALL_DIR}/DifferenceMachine"
        else
            mkdir -p "${GUI_INSTALL_DIR}"
            cp -RP "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/" 2>/dev/null || cp -r "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/"
            chmod a+rx "${GUI_INSTALL_DIR}/DifferenceMachine"
        fi
        echo -e "${GREEN}✓ GUI (PyInstaller) скопирован: ${GUI_INSTALL_DIR}${NC}"
        GUI_LAUNCHER="${INSTALL_PATH}/bin/dfm-gui"
        TMP_LAUNCHER=$(mktemp)
        # На macOS запуск из каталога бандла (CWD) помогает загрузчику найти .dylib и плагины Qt
        if [ "${OS}" = "macos" ]; then
            cat > "${TMP_LAUNCHER}" << LAUNCHEREOF
#!/bin/bash
cd "${GUI_INSTALL_DIR}" && exec ./DifferenceMachine "\$@"
LAUNCHEREOF
        else
            cat > "${TMP_LAUNCHER}" << LAUNCHEREOF
#!/bin/bash
exec "${GUI_INSTALL_DIR}/DifferenceMachine" "\$@"
LAUNCHEREOF
        fi
        if [ -n "${INSTALL_CMD}" ]; then
            ${INSTALL_CMD} cp "${TMP_LAUNCHER}" "${GUI_LAUNCHER}"
            ${INSTALL_CMD} chmod a+rx "${GUI_LAUNCHER}"
        else
            cp "${TMP_LAUNCHER}" "${GUI_LAUNCHER}"
            chmod a+rx "${GUI_LAUNCHER}"
        fi
        rm -f "${TMP_LAUNCHER}"
        echo -e "${GREEN}✓ Лаунчер создан: ${GUI_LAUNCHER}${NC}"
        GUI_INSTALLED=true
    # Исходники: venv + pip
    elif [ -f "${GUI_SRC_DIR}/main.py" ] && [ -f "${GUI_SRC_DIR}/requirements.txt" ]; then
        if [ -n "${INSTALL_CMD}" ]; then
            ${INSTALL_CMD} mkdir -p "${GUI_INSTALL_DIR}"
            ${INSTALL_CMD} cp -r "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/"
        else
            mkdir -p "${GUI_INSTALL_DIR}"
            cp -r "${GUI_SRC_DIR}"/* "${GUI_INSTALL_DIR}/"
        fi
        if [ ! -f "${GUI_INSTALL_DIR}/main.py" ]; then
            echo -e "${YELLOW}⚠ Не удалось скопировать GUI${NC}"
        else
            echo -e "${GREEN}✓ Исходники GUI скопированы: ${GUI_INSTALL_DIR}${NC}"
            PYTHON=$(find_python)
            if [ -z "${PYTHON}" ]; then
                echo -e "${YELLOW}⚠ Python 3 не найден, зависимости GUI не установлены${NC}"
                echo "  Установите Python 3 и создайте venv вручную или запустите установщик снова"
            else
                if [ -n "${INSTALL_CMD}" ]; then
                    ${INSTALL_CMD} "${PYTHON}" -m venv "${GUI_VENV_DIR}"
                    ${INSTALL_CMD} "${GUI_VENV_DIR}/bin/pip" install --upgrade pip
                    ${INSTALL_CMD} "${GUI_VENV_DIR}/bin/pip" install -r "${GUI_INSTALL_DIR}/requirements.txt"
                else
                    "${PYTHON}" -m venv "${GUI_VENV_DIR}"
                    "${GUI_VENV_DIR}/bin/pip" install --upgrade pip
                    "${GUI_VENV_DIR}/bin/pip" install -r "${GUI_INSTALL_DIR}/requirements.txt"
                fi
                if [ -f "${GUI_VENV_DIR}/bin/python" ]; then
                    echo -e "${GREEN}✓ Virtualenv и зависимости GUI установлены: ${GUI_VENV_DIR}${NC}"
                    GUI_LAUNCHER="${INSTALL_PATH}/bin/dfm-gui"
                    TMP_LAUNCHER=$(mktemp)
                    cat > "${TMP_LAUNCHER}" << LAUNCHEREOF
#!/bin/bash
cd "${GUI_INSTALL_DIR}" && exec "${GUI_VENV_DIR}/bin/python" main.py "\$@"
LAUNCHEREOF
                    if [ -n "${INSTALL_CMD}" ]; then
                        ${INSTALL_CMD} cp "${TMP_LAUNCHER}" "${GUI_LAUNCHER}"
                        ${INSTALL_CMD} chmod a+rx "${GUI_LAUNCHER}"
                    else
                        cp "${TMP_LAUNCHER}" "${GUI_LAUNCHER}"
                        chmod a+rx "${GUI_LAUNCHER}"
                    fi
                    rm -f "${TMP_LAUNCHER}"
                    echo -e "${GREEN}✓ Лаунчер создан: ${GUI_LAUNCHER}${NC}"
                    GUI_INSTALLED=true
                else
                    echo -e "${YELLOW}⚠ Не удалось создать virtualenv для GUI${NC}"
                fi
            fi
        fi
    fi

    # Ярлыки приложений (общие для PyInstaller и venv)
    if [ "${GUI_INSTALLED}" = "true" ] && [ -n "${GUI_LAUNCHER}" ]; then
        if [ "${OS}" = "linux" ]; then
            # Иконка в тему (Icon=dfm) — копируем и обновляем кэш, чтобы отображалась в меню
            ICON_SRC="${GUI_INSTALL_DIR}/resources/icons/DFM.svg"
            ICON_THEME_ROOT="${HOME}/.local/share/icons/hicolor"
            ICON_DIR="${ICON_THEME_ROOT}/scalable/apps"
            if [ -f "${ICON_SRC}" ]; then
                mkdir -p "${ICON_DIR}"
                cp "${ICON_SRC}" "${ICON_DIR}/dfm.svg"
                # index.theme нужен, чтобы hicolor в домашней папке считался валидной темой
                if [ ! -f "${ICON_THEME_ROOT}/index.theme" ]; then
                    mkdir -p "${ICON_THEME_ROOT}"
                    cat > "${ICON_THEME_ROOT}/index.theme" << 'ICONTHEME'
[Icon Theme]
Name=Hicolor
Comment=Default icon theme
Directories=scalable/apps

[scalable/apps]
Size=256
Context=Applications
Type=Scalable
ICONTHEME
                fi
                if command -v gtk-update-icon-cache >/dev/null 2>&1; then
                    gtk-update-icon-cache -f -t "${ICON_THEME_ROOT}" 2>/dev/null || true
                fi
                echo -e "${GREEN}✓ Иконка установлена: ${ICON_DIR}/dfm.svg${NC}"
            fi
            # Файл запуска создаём кодом (без шаблона)
            DESKTOP_DIR="${HOME}/.local/share/applications"
            mkdir -p "${DESKTOP_DIR}"
            DESKTOP_FILE="${DESKTOP_DIR}/DFM.desktop"
            cat > "${DESKTOP_FILE}" << DESKTOPEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Difference Machine
GenericName=Forester GUI
Comment=Difference Machine - GUI для репозиториев Forester
Exec=${GUI_LAUNCHER}
Icon=dfm
Categories=Development;
Keywords=forester;version control;diff;blender;
Terminal=false
StartupNotify=true
DESKTOPEOF
            chmod +x "${DESKTOP_FILE}"
            if command -v update-desktop-database >/dev/null 2>&1; then
                update-desktop-database "${DESKTOP_DIR}" 2>/dev/null || true
            fi
            echo -e "${GREEN}✓ Ярлык в меню приложений: ${DESKTOP_FILE}${NC}"
        fi
        if [ "${OS}" = "macos" ]; then
            MAC_APPS="${HOME}/Applications"
            [ ! -d "${MAC_APPS}" ] && MAC_APPS="${HOME}/Desktop"
            COMMAND_FILE="${MAC_APPS}/Difference Machine.command"
            cat > "${COMMAND_FILE}" << CMDEOF
#!/bin/bash
exec "${GUI_LAUNCHER}"
CMDEOF
            chmod +x "${COMMAND_FILE}"
            echo -e "${GREEN}✓ Ярлык запуска: ${COMMAND_FILE}${NC}"
        fi
    fi
    set -e
else
    echo -e "${YELLOW}⚠ GUI не найден в установщике (${GUI_SRC_DIR}), пропуск${NC}"
fi
echo ""

# Install addons
ADDON_INSTALLED_PATH=""

if [ -d "${INSTALLER_DIR}/addons" ]; then
    echo "=== Установка аддонов ==="
    
    # Blender addon
    if [ -d "${INSTALLER_DIR}/addons/blender" ]; then
        read -p "Установить аддон для Blender? [Y/n]: " INSTALL_BLENDER
        INSTALL_BLENDER=${INSTALL_BLENDER:-Y}
        
        if [[ "${INSTALL_BLENDER}" =~ ^[Yy]$ ]]; then
            # Determine Blender addons path
            if [ "${OS}" = "linux" ]; then
                BLENDER_ADDON_PATH="${HOME}/.config/blender"
            elif [ "${OS}" = "macos" ]; then
                BLENDER_ADDON_PATH="${HOME}/Library/Application Support/Blender"
            else
                BLENDER_ADDON_PATH="${HOME}/.config/blender"
            fi
            
            # Search for Blender versions
            if [ -d "${BLENDER_ADDON_PATH}" ]; then
                BLENDER_VERSIONS=$(find "${BLENDER_ADDON_PATH}" -maxdepth 1 -type d -name "[0-9]*" 2>/dev/null | sort -V -r)
                
                if [ -n "${BLENDER_VERSIONS}" ]; then
                    echo ""
                    echo -e "${BLUE}Найдены версии Blender:${NC}"
                    echo "${BLENDER_VERSIONS}" | sed 's|.*/|  |'
                    echo ""
                    
                    read -p "Установить для всех версий? [Y/n]: " INSTALL_ALL
                    INSTALL_ALL=${INSTALL_ALL:-Y}
                    
                    if [[ "${INSTALL_ALL}" =~ ^[Yy]$ ]]; then
                        for BLENDER_VERSION in ${BLENDER_VERSIONS}; do
                            ADDON_DEST="${BLENDER_VERSION}/extensions/user_default/difference_machine"
                            mkdir -p "${ADDON_DEST}"
                            cp -r "${INSTALLER_DIR}/addons/blender/difference_machine"/* "${ADDON_DEST}/" 2>/dev/null || {
                                echo -e "${YELLOW}⚠ Не удалось установить для $(basename ${BLENDER_VERSION})${NC}"
                                continue
                            }
                            echo -e "${GREEN}✓ Установлен для Blender $(basename ${BLENDER_VERSION})${NC}"
                            # Save last installed path for config
                            ADDON_INSTALLED_PATH="${ADDON_DEST}"
                        done
                    else
                        echo ""
                        read -p "Введите версию Blender (например: 5.0): " BLENDER_VERSION
                        ADDON_DEST="${BLENDER_ADDON_PATH}/${BLENDER_VERSION}/extensions/user_default/difference_machine"
                        if [ -d "${BLENDER_ADDON_PATH}/${BLENDER_VERSION}" ]; then
                            mkdir -p "${ADDON_DEST}"
                            cp -r "${INSTALLER_DIR}/addons/blender/difference_machine"/* "${ADDON_DEST}/"
                            echo -e "${GREEN}✓ Установлен для Blender ${BLENDER_VERSION}${NC}"
                            ADDON_INSTALLED_PATH="${ADDON_DEST}"
                        else
                            echo -e "${RED}✗ Версия Blender ${BLENDER_VERSION} не найдена${NC}"
                        fi
                    fi
                else
                    echo -e "${YELLOW}⚠ Blender не найден в стандартном расположении${NC}"
                    echo ""
                    read -p "Введите путь к папке extensions/user_default Blender: " CUSTOM_BLENDER_PATH
                    if [ -d "${CUSTOM_BLENDER_PATH}" ]; then
                        ADDON_DEST="${CUSTOM_BLENDER_PATH}/difference_machine"
                        mkdir -p "${ADDON_DEST}"
                        cp -r "${INSTALLER_DIR}/addons/blender/difference_machine"/* "${ADDON_DEST}/"
                        echo -e "${GREEN}✓ Установлен в: ${ADDON_DEST}${NC}"
                        ADDON_INSTALLED_PATH="${ADDON_DEST}"
                    else
                        echo -e "${RED}✗ Путь не найден: ${CUSTOM_BLENDER_PATH}${NC}"
                    fi
                fi
            else
                echo -e "${YELLOW}⚠ Blender не найден в стандартном расположении${NC}"
                echo ""
                read -p "Введите путь к папке extensions/user_default Blender: " CUSTOM_BLENDER_PATH
                if [ -d "${CUSTOM_BLENDER_PATH}" ]; then
                    ADDON_DEST="${CUSTOM_BLENDER_PATH}/difference_machine"
                    mkdir -p "${ADDON_DEST}"
                    cp -r "${INSTALLER_DIR}/addons/blender/difference_machine"/* "${ADDON_DEST}/"
                    echo -e "${GREEN}✓ Установлен в: ${ADDON_DEST}${NC}"
                    ADDON_INSTALLED_PATH="${ADDON_DEST}"
                else
                    echo -e "${RED}✗ Путь не найден: ${CUSTOM_BLENDER_PATH}${NC}"
                fi
            fi
        fi
    fi
    
    # You can add other addon installs here (Maya, C4D)
fi

# Create configuration file
echo ""
echo "=== Создание конфигурационного файла ==="
DFM_SETUP_DIR="${HOME}/.dfm"
DFM_CONFIG_FILE="${DFM_SETUP_DIR}/setup.cfg"

mkdir -p "${DFM_SETUP_DIR}"

# Create configuration file
cat > "${DFM_CONFIG_FILE}" << EOF
[forester]
installed = true
path = ${INSTALL_PATH}/bin/${BINARY_NAME}
EOF

if [ "${GUI_INSTALLED}" = "true" ]; then
    cat >> "${DFM_CONFIG_FILE}" << EOF

[difference machine gui]
installed = true
enabled = true
path = ${INSTALL_PATH}/bin/dfm-gui
EOF
else
    cat >> "${DFM_CONFIG_FILE}" << EOF

[difference machine gui]
installed = false
enabled = false
path = 
EOF
fi

# Add addon path if installed
if [ -n "${ADDON_INSTALLED_PATH}" ]; then
    cat >> "${DFM_CONFIG_FILE}" << EOF

[addons]
diffmachine_path = ${ADDON_INSTALLED_PATH}
EOF
    echo -e "${GREEN}✓ Путь к аддону записан в конфиг: ${ADDON_INSTALLED_PATH}${NC}"
fi

if [ -f "${DFM_CONFIG_FILE}" ]; then
    echo -e "${GREEN}✓ Конфигурационный файл создан: ${DFM_CONFIG_FILE}${NC}"
else
    echo -e "${YELLOW}⚠ Не удалось создать конфигурационный файл${NC}"
    echo "Создайте вручную: ${DFM_CONFIG_FILE}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Установка завершена!${NC}"
echo "=========================================="
echo ""
echo "Forester CLI установлен в: ${INSTALL_PATH}/bin/${BINARY_NAME}"
echo "Конфигурация аддона: ${DFM_CONFIG_FILE}"
if [ "${GUI_INSTALLED}" = "true" ]; then
    echo "GUI: запуск по ярлыку программы или: ${INSTALL_PATH}/bin/dfm-gui"
fi
echo ""
echo "Добавьте в PATH для удобства:"
echo "  export PATH=\"${INSTALL_PATH}/bin:\$PATH\""
echo ""
echo "Или создайте симлинк:"
if [ "${OS}" = "linux" ]; then
    echo "  sudo ln -s ${INSTALL_PATH}/bin/${BINARY_NAME} /usr/local/bin/forester"
elif [ "${OS}" = "macos" ]; then
    echo "  sudo ln -s ${INSTALL_PATH}/bin/${BINARY_NAME} /usr/local/bin/forester"
fi
echo ""
