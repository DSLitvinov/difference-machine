# Assemble portable install folder for Linux/Windows release archives.
# Source after detect_platform.sh.

INSTALL_FOLDER_NAME="${INSTALL_FOLDER_NAME:-Difference Machine}"
ADDON_REL="addons/blender/difference_machine"
ADDON_ZIP_NAME="difference_machine.zip"
LINUX_DESKTOP_NAME="difference-machine.desktop"

# render_linux_desktop_entry INSTALL_DIR
# Dev helper: copies builder/linux/difference-machine.desktop.in into a folder.
# Linux release tarballs do NOT ship a .desktop file — install.sh generates the final entry.
render_linux_desktop_entry() {
    local install_dir="$1"
    local lib_dir template output

    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    template="${lib_dir}/../../linux/difference-machine.desktop.in"
    output="${install_dir}/${LINUX_DESKTOP_NAME}"

    if [ ! -f "${template}" ]; then
        echo "Desktop template not found: ${template}" >&2
        return 1
    fi

    cp "${template}" "${output}"
    chmod 644 "${output}"
}

# package_blender_addon_for_release DEST_BLENDER_DIR DFM_DIST
# Leaves only difference_machine.zip in DEST_BLENDER_DIR (no unpacked addon folder).
package_blender_addon_for_release() {
    local dest_blender_dir="$1"
    local dfm_dist="$2"
    local script_dir

    if [ ! -d "${dfm_dist}/${ADDON_REL}" ]; then
        echo "Addon not found: ${dfm_dist}/${ADDON_REL}" >&2
        return 1
    fi

    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    rm -rf "${dest_blender_dir}"
    mkdir -p "${dest_blender_dir}"
    "${script_dir}/package_blender_addon_zip.sh" \
        "${dfm_dist}/${ADDON_REL}" \
        "${dest_blender_dir}/${ADDON_ZIP_NAME}"

    # Guard against accidental unpacked trees in release media.
    if [ -d "${dest_blender_dir}/difference_machine" ]; then
        rm -rf "${dest_blender_dir}/difference_machine"
    fi

    shopt -s nullglob
    local entries=("${dest_blender_dir}"/*)
    shopt -u nullglob
    if [ "${#entries[@]}" -ne 1 ] || [ "$(basename "${entries[0]}")" != "${ADDON_ZIP_NAME}" ]; then
        echo "Release addon dir must contain only ${ADDON_ZIP_NAME}, found:" >&2
        ls -la "${dest_blender_dir}" >&2 || true
        return 1
    fi
}

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
    mkdir -p "${install_dir}/bin" "${install_dir}/lib"

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

    package_blender_addon_for_release "${install_dir}/addons/blender" "${dfm_dist}"

    if [ -d "${dfm_dist}/share/icons" ]; then
        mkdir -p "${install_dir}/share"
        cp -R "${dfm_dist}/share/icons" "${install_dir}/share/"
    fi
}
