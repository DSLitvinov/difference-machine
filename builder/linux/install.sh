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

INSTALL_FOLDER_NAME="Difference-Machine"
FORESTER_CLI_NAME="forester"
API_LIB_NAME="libforester.so"
FFMPEG_BIN_NAME="ffmpeg"
GUI_BIN_NAME="difference-machine"

DESKTOP_NAME="difference-machine.desktop"
GUI_ICON_NAME="difference-machine"
FORESTER_ICON_NAME="forester"
SYMLINK_CLI="/usr/local/bin/forester"
SYMLINK_GUI="/usr/local/bin/difference-machine"
DESKTOP_PATH="/usr/share/applications/${DESKTOP_NAME}"
SYSTEM_ICONS_DIR="/usr/share/icons"

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
    local desktop_path
    for desktop_path in \
        "${DESKTOP_PATH}" \
        "/usr/local/share/applications/${DESKTOP_NAME}" \
        "$(target_user_home)/.local/share/applications/${DESKTOP_NAME}"; do
        if [ -f "${desktop_path}" ]; then
            rm -f "${desktop_path}"
            echo "Removed desktop entry: ${desktop_path}"
        fi
    done
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
    mkdir -p "${INSTALL_ROOT}/bin" "${INSTALL_ROOT}/lib"

    cp -a "${SOURCE_DIR}/${GUI_BIN_NAME}" "${INSTALL_ROOT}/"
    cp -a "${SOURCE_DIR}/bin/." "${INSTALL_ROOT}/bin/"
    cp -a "${SOURCE_DIR}/lib/." "${INSTALL_ROOT}/lib/"

    if [ -d "${SOURCE_DIR}/addons" ]; then
        cp -a "${SOURCE_DIR}/addons" "${INSTALL_ROOT}/"
    fi

    if [ -d "${SOURCE_DIR}/share" ]; then
        cp -a "${SOURCE_DIR}/share" "${INSTALL_ROOT}/"
    fi

    if [ -f "${SOURCE_DIR}/README.txt" ]; then
        cp -a "${SOURCE_DIR}/README.txt" "${INSTALL_ROOT}/"
    fi

    chmod +x "${INSTALL_ROOT}/${GUI_BIN_NAME}" 2>/dev/null || true
    chmod +x "${INSTALL_ROOT}/bin/"* 2>/dev/null || true

    fix_install_permissions_and_selinux
}

fix_install_permissions_and_selinux() {
    if [ "${USER_MODE}" = true ]; then
        return 0
    fi
    if [ "$(id -u)" -ne 0 ]; then
        return 0
    fi

    chown -R root:root "${INSTALL_ROOT}" 2>/dev/null || true
    chmod +x "${INSTALL_ROOT}/${GUI_BIN_NAME}" 2>/dev/null || true
    chmod +x "${INSTALL_ROOT}/bin/"* 2>/dev/null || true

    if command -v restorecon >/dev/null 2>&1; then
        restorecon -RF "${INSTALL_ROOT}" 2>/dev/null || true
    fi
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

# resolve_hicolor_icon_path INSTALL_ROOT ICON_BASENAME
# Prints an absolute path to the best available PNG/SVG icon under share/icons/hicolor.
resolve_hicolor_icon_path() {
    local install_root="$1"
    local icon_basename="$2"
    local hicolor="${install_root}/share/icons/hicolor"
    local size_dir icon_file

    if [ ! -d "${hicolor}" ]; then
        return 1
    fi

    for size_dir in \
        "${hicolor}/256x256/apps" \
        "${hicolor}/128x128/apps" \
        "${hicolor}/64x64/apps" \
        "${hicolor}/48x48/apps" \
        "${hicolor}/32x32/apps" \
        "${hicolor}/scalable/apps"; do
        for icon_file in \
            "${size_dir}/${icon_basename}.png" \
            "${size_dir}/${icon_basename}.svg"; do
            if [ -f "${icon_file}" ]; then
                printf '%s\n' "${icon_file}"
                return 0
            fi
        done
    done

    return 1
}

# desktop_icon_name INSTALL_ROOT
# Prefer hicolor theme lookup (Icon=difference-machine) when PNGs are bundled.
desktop_icon_name() {
    local install_root="$1"
    if resolve_hicolor_icon_path "${install_root}" "${GUI_ICON_NAME}" >/dev/null 2>&1; then
        printf '%s\n' "${GUI_ICON_NAME}"
        return 0
    fi
    printf '%s\n' "${GUI_ICON_NAME}"
}

# write_desktop_entry_file OUTPUT_PATH
write_desktop_entry_file() {
    local output_path="$1"
    local gui_exec="${INSTALL_ROOT}/${GUI_BIN_NAME}"
    local icon_name
    icon_name="$(desktop_icon_name "${INSTALL_ROOT}")"

    cat > "${output_path}" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Difference Machine
GenericName=Version Control
Comment=Forester GUI for Difference Machine
Exec=${gui_exec} %F
TryExec=${gui_exec}
Path=${INSTALL_ROOT}
Icon=${icon_name}
Terminal=false
Categories=Development;
Keywords=forester;vcs;git;blender;
StartupWMClass=difference-machine
EOF
}

# install_hicolor_icons_to_theme SOURCE_HICOLOR DEST_HICOLOR
# Merges PNG/SVG app icons into the system or user hicolor theme.
install_hicolor_icons_to_theme() {
    local source_hicolor="$1"
    local dest_hicolor="$2"
    local size_dir apps_dir icon_file dest_apps

    if [ ! -d "${source_hicolor}" ]; then
        return 1
    fi

    mkdir -p "${dest_hicolor}"

    shopt -s nullglob
    for size_dir in "${source_hicolor}"/*/; do
        apps_dir="${size_dir}apps"
        [ -d "${apps_dir}" ] || continue
        dest_apps="${dest_hicolor}/$(basename "${size_dir}")/apps"
        mkdir -p "${dest_apps}"
        for icon_file in "${apps_dir}/"*; do
            [ -f "${icon_file}" ] || continue
            case "${icon_file}" in
                *.png|*.svg|*.xpm)
                    cp -a "${icon_file}" "${dest_apps}/"
                    ;;
            esac
        done
    done
    shopt -u nullglob

    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -f -t "${dest_hicolor}" 2>/dev/null || true
    fi
}

update_applications_database() {
    local apps_dir="$1"
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "${apps_dir}" 2>/dev/null || true
    fi
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
    local desktop_path tmp_dir tmp_desktop apps_dir

    if [ "${USER_MODE}" = true ]; then
        desktop_path="$(resolve_target_home)/.local/share/applications/${DESKTOP_NAME}"
    else
        desktop_path="${DESKTOP_PATH}"
    fi
    apps_dir="$(dirname "${desktop_path}")"

    remove_desktop_entry
    mkdir -p "${apps_dir}"

    tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/dfm-desktop.XXXXXX")"
    tmp_desktop="${tmp_dir}/${DESKTOP_NAME}"
    write_desktop_entry_file "${tmp_desktop}"

    if command -v desktop-file-validate >/dev/null 2>&1; then
        if ! desktop-file-validate "${tmp_desktop}" >/dev/null 2>&1; then
            echo "WARNING: desktop entry validation failed; installing anyway." >&2
            desktop-file-validate "${tmp_desktop}" >&2 || true
        fi
    fi

    install -m 0644 "${tmp_desktop}" "${desktop_path}"
    install -m 0644 "${tmp_desktop}" "${INSTALL_ROOT}/${DESKTOP_NAME}"
    rm -rf "${tmp_dir}"

    update_applications_database "${apps_dir}"
    update_applications_database "/usr/local/share/applications"
    echo "Desktop entry: ${desktop_path}"
}

install_app_icons() {
    local src_hicolor="${INSTALL_ROOT}/share/icons/hicolor"
    local dest_hicolor

    if [ ! -d "${src_hicolor}" ]; then
        src_hicolor="${SOURCE_DIR}/share/icons/hicolor"
    fi
    if [ ! -d "${src_hicolor}" ]; then
        echo "WARNING: No hicolor icons found; menu entry may use a generic icon." >&2
        return 0
    fi

    if [ "${USER_MODE}" = true ]; then
        dest_hicolor="$(resolve_target_home)/.local/share/icons/hicolor"
    else
        dest_hicolor="${SYSTEM_ICONS_DIR}/hicolor"
    fi

    install_hicolor_icons_to_theme "${src_hicolor}" "${dest_hicolor}"
    echo "Theme icons: ${dest_hicolor}/ (GUI: ${GUI_ICON_NAME}, CLI: ${FORESTER_ICON_NAME})"
    echo "Bundled icons remain at: ${INSTALL_ROOT}/share/icons/"
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
    install_app_icons
    create_desktop_entry
else
    install_app_icons
fi

echo ""
echo "Install complete: ${INSTALL_ROOT}"
echo "Launch GUI: ${INSTALL_ROOT}/${GUI_BIN_NAME}"
echo "CLI: ${INSTALL_ROOT}/bin/${FORESTER_CLI_NAME}"
