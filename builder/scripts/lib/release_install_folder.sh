# Assemble portable install folder for Linux/Windows release archives.
# Source after detect_platform.sh.

INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"
ADDON_REL="addons/blender/difference_machine"

# resolve_gui_artifact DFM_DIST
# Sets GUI_SRC_PATH and GUI_DEST_NAME for the install folder root.
resolve_gui_artifact() {
    local dfm_dist="$1"
    local apps_dir="${dfm_dist}/apps"

    GUI_SRC_PATH=""
    GUI_DEST_NAME=""

    if [ ! -d "${apps_dir}" ]; then
        return 1
    fi

    case "${CURRENT_OS}" in
        macos)
            shopt -s nullglob
            local apps=("${apps_dir}"/*.app)
            shopt -u nullglob
            if [ "${#apps[@]}" -eq 0 ]; then
                return 1
            fi
            GUI_SRC_PATH="${apps[0]}"
            GUI_DEST_NAME="$(basename "${GUI_SRC_PATH}")"
            ;;
        linux)
            if [ -f "${apps_dir}/${GUI_STAGE_NAME}" ]; then
                GUI_SRC_PATH="${apps_dir}/${GUI_STAGE_NAME}"
                GUI_DEST_NAME="${GUI_STAGE_NAME}"
            fi
            ;;
        windows)
            if [ -f "${apps_dir}/${GUI_STAGE_NAME}" ]; then
                GUI_SRC_PATH="${apps_dir}/${GUI_STAGE_NAME}"
                GUI_DEST_NAME="${GUI_STAGE_NAME}"
            fi
            ;;
    esac

    [ -n "${GUI_SRC_PATH}" ]
}

# assemble_portable_install_dir INSTALL_DIR DFM_DIST
# Populates INSTALL_DIR with GUI, Forester bin/lib, and addon zip.
assemble_portable_install_dir() {
    local install_dir="$1"
    local dfm_dist="$2"
    local addon_zip_rel="${ADDON_REL}.zip"

    if ! resolve_gui_artifact "${dfm_dist}"; then
        echo "GUI artifact not found under ${dfm_dist}/apps" >&2
        echo "Build with: ./builder/macos/build.sh --gui or ./builder/windows/build.sh --gui" >&2
        return 1
    fi

    if [ ! -d "${dfm_dist}/${ADDON_REL}" ]; then
        echo "Addon not found: ${dfm_dist}/${ADDON_REL}" >&2
        return 1
    fi

    rm -rf "${install_dir}"
    mkdir -p "${install_dir}/bin" "${install_dir}/lib" "${install_dir}/addons/blender"

    if [ -d "${GUI_SRC_PATH}" ]; then
        cp -R "${GUI_SRC_PATH}" "${install_dir}/${GUI_DEST_NAME}"
    else
        cp "${GUI_SRC_PATH}" "${install_dir}/${GUI_DEST_NAME}"
        if [ "${CURRENT_OS}" = "linux" ]; then
            chmod +x "${install_dir}/${GUI_DEST_NAME}"
        fi
    fi

    cp -R "${dfm_dist}/bin/." "${install_dir}/bin/"
    for lib in "${dfm_dist}/lib/"*.so "${dfm_dist}/lib/"*.dylib "${dfm_dist}/lib/"*.dll; do
        [ -f "${lib}" ] || continue
        cp "${lib}" "${install_dir}/lib/"
    done
    chmod +x "${install_dir}/bin/"* 2>/dev/null || true

    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    "${script_dir}/package_blender_addon_zip.sh" \
        "${dfm_dist}/${ADDON_REL}" \
        "${install_dir}/addons/blender/difference_machine.zip"
}
