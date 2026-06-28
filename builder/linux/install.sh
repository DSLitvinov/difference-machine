#!/bin/bash
# Install Difference Machine from an unpacked release folder to /opt (or --prefix).
# Bundled inside DifferenceMachine-*-linux.tar.gz — run after extracting the archive.
#
# Usage:
#   sudo ./install.sh
#   sudo ./install.sh --prefix /opt
#   ./install.sh --user
#   sudo ./install.sh --uninstall

set -euo pipefail

INSTALL_FOLDER_NAME="Difference Machine"
FORESTER_CLI_NAME="forester"
API_LIB_NAME="libforester.so"
FFMPEG_BIN_NAME="ffmpeg"
GUI_BIN_NAME="difference-machine"

DESKTOP_NAME="difference-machine.desktop"
SYMLINK_CLI="/usr/local/bin/forester"
SYMLINK_GUI="/usr/local/bin/difference-machine"
DESKTOP_PATH="/usr/local/share/applications/${DESKTOP_NAME}"

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_PREFIX="/opt"
USER_MODE=false
UNINSTALL=false
CREATE_SYMLINKS=true
CREATE_DESKTOP=true
WRITE_SETUP_CFG=true

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Install Difference Machine to ${INSTALL_PREFIX}/${INSTALL_FOLDER_NAME}/ (default).

Options:
  --prefix PATH       Install root parent directory (default: /opt)
  --user              Install to ~/.local/share/${INSTALL_FOLDER_NAME} (no sudo)
  --uninstall         Remove install, symlinks, and desktop entry
  --no-symlinks       Skip /usr/local/bin symlinks (or ~/.local/bin with --user)
  --no-desktop        Skip .desktop menu entry
  --no-setup-cfg      Do not update ~/.dfm/setup.cfg
  -h, --help          Show this help

Examples:
  sudo ./install.sh
  ./install.sh --user
  sudo ./install.sh --uninstall
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --prefix)
            INSTALL_PREFIX="${2:?--prefix requires a path}"
            shift 2
            ;;
        --user)
            USER_MODE=true
            shift
            ;;
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        --no-symlinks)
            CREATE_SYMLINKS=false
            shift
            ;;
        --no-desktop)
            CREATE_DESKTOP=false
            shift
            ;;
        --no-setup-cfg)
            WRITE_SETUP_CFG=false
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

if [ "$(uname -s)" != "Linux" ]; then
    echo "ERROR: This installer is for Linux only." >&2
    exit 1
fi

TARGET_HOME=""

resolve_target_home() {
    if [ -n "${TARGET_HOME}" ]; then
        echo "${TARGET_HOME}"
        return
    fi
    if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
        getent passwd "${SUDO_USER}" | cut -d: -f6
        return
    fi
    echo "${HOME}"
}

if [ "${USER_MODE}" = true ]; then
    if [ -n "${SUDO_USER:-}" ] && [ "$(id -u)" -eq 0 ]; then
        echo "ERROR: Do not use sudo with --user. Run: ./install.sh --user" >&2
        exit 1
    fi
    TARGET_HOME="$(resolve_target_home)"
    INSTALL_PREFIX="${TARGET_HOME}/.local/share"
fi

INSTALL_ROOT="${INSTALL_PREFIX%/}/${INSTALL_FOLDER_NAME}"

resolve_realpath() {
    if command -v realpath >/dev/null 2>&1; then
        realpath "$1"
    else
        readlink -f "$1"
    fi
}

target_user_home() {
    resolve_target_home
}

run_as_target_user() {
    local home_dir
    home_dir="$(target_user_home)"
    if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
        sudo -u "${SUDO_USER}" -H HOME="${home_dir}" "$@"
    else
        HOME="${home_dir}" "$@"
    fi
}

require_root_for_system_paths() {
    if [ "${USER_MODE}" = true ]; then
        return 0
    fi
    if [ "$(id -u)" -ne 0 ]; then
        echo "ERROR: System install requires root. Re-run with sudo or use --user." >&2
        exit 1
    fi
}

remove_symlinks() {
    local link
    for link in "${SYMLINK_CLI}" "${SYMLINK_GUI}"; do
        if [ -L "${link}" ]; then
            rm -f "${link}"
            echo "Removed symlink: ${link}"
        fi
    done
}

remove_desktop_entry() {
    if [ -f "${DESKTOP_PATH}" ]; then
        rm -f "${DESKTOP_PATH}"
        echo "Removed desktop entry: ${DESKTOP_PATH}"
    fi
    local user_desktop
    user_desktop="$(target_user_home)/.local/share/applications/${DESKTOP_NAME}"
    if [ -f "${user_desktop}" ]; then
        rm -f "${user_desktop}"
        echo "Removed desktop entry: ${user_desktop}"
    fi
}

remove_user_symlinks() {
    local user_bin link
    user_bin="$(resolve_target_home)/.local/bin"
    for link in "${user_bin}/forester" "${user_bin}/difference-machine"; do
        if [ -L "${link}" ]; then
            rm -f "${link}"
            echo "Removed symlink: ${link}"
        fi
    done
}

uninstall_release() {
    if [ "${USER_MODE}" = true ]; then
        remove_user_symlinks
        remove_desktop_entry
        if [ -d "${INSTALL_ROOT}" ]; then
            rm -rf "${INSTALL_ROOT}"
            echo "Removed: ${INSTALL_ROOT}"
        else
            echo "Install folder not found: ${INSTALL_ROOT}"
        fi
        echo "Done. ~/.dfm/setup.cfg was not removed (update or delete manually if needed)."
        return
    fi

    require_root_for_system_paths
    remove_symlinks
    remove_desktop_entry
    if [ -d "${INSTALL_ROOT}" ]; then
        rm -rf "${INSTALL_ROOT}"
        echo "Removed: ${INSTALL_ROOT}"
    else
        echo "Install folder not found: ${INSTALL_ROOT}"
    fi
    echo "Done. ~/.dfm/setup.cfg was not removed (update or delete manually if needed)."
}

verify_source_layout() {
    if [ ! -f "${SOURCE_DIR}/bin/${FORESTER_CLI_NAME}" ]; then
        echo "ERROR: Forester CLI not found: ${SOURCE_DIR}/bin/${FORESTER_CLI_NAME}" >&2
        echo "Run this script from the unpacked '${INSTALL_FOLDER_NAME}' folder." >&2
        exit 1
    fi
    if [ ! -f "${SOURCE_DIR}/${GUI_BIN_NAME}" ]; then
        echo "ERROR: GUI binary not found: ${SOURCE_DIR}/${GUI_BIN_NAME}" >&2
        exit 1
    fi
}

copy_payload() {
    local src_real dest_real
    src_real="$(resolve_realpath "${SOURCE_DIR}")"
    dest_real="$(resolve_realpath "${INSTALL_ROOT}" 2>/dev/null || true)"

    if [ "${src_real}" = "${dest_real}" ]; then
        echo "Payload already at ${INSTALL_ROOT}"
        return 0
    fi

    echo "Installing to ${INSTALL_ROOT} ..."
    mkdir -p "${INSTALL_ROOT}"

    shopt -s dotglob nullglob
    for item in "${SOURCE_DIR}"/*; do
        cp -a "${item}" "${INSTALL_ROOT}/"
    done
    shopt -u dotglob nullglob

    chmod +x "${INSTALL_ROOT}/${GUI_BIN_NAME}" 2>/dev/null || true
    chmod +x "${INSTALL_ROOT}/bin/"* 2>/dev/null || true
}

strip_toolchain_sections() {
    awk '
        /^\[/ {
            if (section == "forester" || section == "api") {
                section = ""
            }
            if ($0 == "[forester]" || $0 == "[api]") {
                section = substr($0, 2, length($0) - 2)
                next
            }
            section = substr($0, 2, length($0) - 2)
            print
            next
        }
        section == "forester" || section == "api" { next }
        { print }
    '
}

write_setup_cfg() {
    local home_dir cfg_dir cfg_file tmp_file
    home_dir="$(target_user_home)"
    cfg_dir="${home_dir}/.dfm"
    cfg_file="${cfg_dir}/setup.cfg"
    tmp_file="$(mktemp)"

    local forester_bin="${INSTALL_ROOT}/bin/${FORESTER_CLI_NAME}"
    local ffmpeg_bin="${INSTALL_ROOT}/bin/${FFMPEG_BIN_NAME}"
    local api_lib="${INSTALL_ROOT}/lib/${API_LIB_NAME}"

    if [ -f "${cfg_file}" ]; then
        strip_toolchain_sections < "${cfg_file}" > "${tmp_file}"
    else
        : > "${tmp_file}"
    fi

    cat >> "${tmp_file}" <<EOF

[forester]
installed = true
path = ${forester_bin}
ffmpeg_path = ${ffmpeg_bin}

[api]
installed = true
path = ${api_lib}
EOF

    run_as_target_user mkdir -p "${cfg_dir}"

    if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
        install -o "${SUDO_USER}" -g "$(id -gn "${SUDO_USER}")" -m 0644 "${tmp_file}" "${cfg_file}"
    else
        mv "${tmp_file}" "${cfg_file}"
    fi
    rm -f "${tmp_file}"

    echo "Updated ${cfg_file}"
}

create_symlinks() {
  local cli_target="${INSTALL_ROOT}/bin/${FORESTER_CLI_NAME}"
  local gui_target="${INSTALL_ROOT}/${GUI_BIN_NAME}"

  if [ "${USER_MODE}" = true ]; then
      local user_bin
      user_bin="$(resolve_target_home)/.local/bin"
      mkdir -p "${user_bin}"
      ln -sfn "${cli_target}" "${user_bin}/forester"
      ln -sfn "${gui_target}" "${user_bin}/difference-machine"
      echo "Symlinks: ${user_bin}/forester, ${user_bin}/difference-machine"
      return 0
  fi

  mkdir -p "$(dirname "${SYMLINK_CLI}")"
  ln -sfn "${cli_target}" "${SYMLINK_CLI}"
  ln -sfn "${gui_target}" "${SYMLINK_GUI}"
  echo "Symlinks: ${SYMLINK_CLI}, ${SYMLINK_GUI}"
}

create_desktop_entry() {
  local desktop_path
  local gui_exec="${INSTALL_ROOT}/${GUI_BIN_NAME}"

  if [ "${USER_MODE}" = true ]; then
      desktop_path="$(resolve_target_home)/.local/share/applications/${DESKTOP_NAME}"
      mkdir -p "$(dirname "${desktop_path}")"
  else
      desktop_path="${DESKTOP_PATH}"
      mkdir -p "$(dirname "${desktop_path}")"
  fi

  cat > "${desktop_path}" <<EOF
[Desktop Entry]
Type=Application
Name=Difference Machine
Comment=Forester GUI for Difference Machine
Exec=${gui_exec}
Icon=difference-machine
Terminal=false
Categories=Development;VersionControl;
StartupWMClass=difference-machine
EOF

  if [ "${USER_MODE}" = false ] && [ "$(id -u)" -eq 0 ]; then
      chmod 644 "${desktop_path}"
  fi

  echo "Desktop entry: ${desktop_path}"
}

if [ "${UNINSTALL}" = true ]; then
    uninstall_release
    exit 0
fi

require_root_for_system_paths
verify_source_layout
copy_payload

if [ "${WRITE_SETUP_CFG}" = true ]; then
    write_setup_cfg
fi

if [ "${CREATE_SYMLINKS}" = true ]; then
    create_symlinks
fi

if [ "${CREATE_DESKTOP}" = true ]; then
    create_desktop_entry
fi

install_app_icons() {
    local src="${INSTALL_ROOT}/share/icons"
    if [ ! -d "${src}" ]; then
        return 0
    fi
    local dest
    if [ "${USER_MODE}" = true ]; then
        dest="$(resolve_target_home)/.local/share/icons"
    else
        dest="/usr/local/share/icons"
        mkdir -p "${dest}"
    fi
    mkdir -p "${dest}"
    cp -R "${src}/." "${dest}/"
    if [ -d "${dest}/hicolor" ] && command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -f -t "${dest}/hicolor" 2>/dev/null || true
    fi
    echo "App icons: ${dest}/"
}

install_app_icons

echo ""
echo "Install complete: ${INSTALL_ROOT}"
echo "Launch GUI: ${INSTALL_ROOT}/${GUI_BIN_NAME}"
echo "CLI: ${INSTALL_ROOT}/bin/${FORESTER_CLI_NAME}"
