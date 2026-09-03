_zip_is_valid() {
    local zip_path="$1"
    [ -f "${zip_path}" ] || return 1
    # ZIP local file header starts with "PK" (0x50 0x4B).
    local magic
    magic="$(head -c 2 "${zip_path}" 2>/dev/null || true)"
    [ "${magic}" = "PK" ]
}

_python_for_zip() {
    local py
    for py in python3 python; do
        if command -v "${py}" >/dev/null 2>&1 \
                && "${py}" -c "import zipfile" >/dev/null 2>&1; then
            printf '%s' "${py}"
            return 0
        fi
    done
    return 1
}

create_zip_archive() {
    OUTPUT_ZIP="${1:?output zip path required}"
    TOP_LEVEL_DIR="${2:?top-level directory required}"

    if [ ! -d "${TOP_LEVEL_DIR}" ]; then
        echo "Directory not found: ${TOP_LEVEL_DIR}" >&2
        return 1
    fi

    local top_level_name parent_dir
    top_level_name="$(basename "${TOP_LEVEL_DIR}")"
    parent_dir="$(cd "$(dirname "${TOP_LEVEL_DIR}")" && pwd)"
    OUTPUT_ZIP="$(cd "$(dirname "${OUTPUT_ZIP}")" && pwd)/$(basename "${OUTPUT_ZIP}")"

    rm -f "${OUTPUT_ZIP}"
    mkdir -p "$(dirname "${OUTPUT_ZIP}")"

    _zip_with_zip() {
        (
            cd "${parent_dir}"
            zip -r -q "${OUTPUT_ZIP}" "${top_level_name}"
        )
    }

    _zip_with_tar() {
        (
            cd "${parent_dir}"
            tar -a -cf "${OUTPUT_ZIP}" "${top_level_name}"
        )
    }

    _zip_with_python() {
        local py=""
        if ! py="$(_python_for_zip)"; then
            return 1
        fi

        "${py}" - "${parent_dir}" "${top_level_name}" "${OUTPUT_ZIP}" <<'PY'
import os
import sys
import zipfile
from pathlib import Path

parent = Path(sys.argv[1])
top_name = sys.argv[2]
output = Path(sys.argv[3])
root = parent / top_name

with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            name for name in dirnames
            if name not in ("__pycache__", ".git")
        ]
        for filename in filenames:
            if filename in (".DS_Store",) or filename.endswith((".pyc", ".pyo")):
                continue
            full = Path(dirpath) / filename
            arcname = full.relative_to(parent).as_posix()
            zf.write(full, arcname)
PY
    }

    _zip_with_powershell() {
        if ! command -v powershell.exe >/dev/null 2>&1; then
            return 1
        fi

        local src="${parent_dir}/${top_level_name}"
        local src_ps="${src//\'/\'\'}"
        local out_ps="${OUTPUT_ZIP//\'/\'\'}"

        powershell.exe -NoProfile -Command \
            "Compress-Archive -LiteralPath '${src_ps}' -DestinationPath '${out_ps}' -Force"
    }

    # Prefer python over tar: Git Bash ships GNU tar, which writes a non-ZIP
    # stream when asked for .zip (-a) and breaks Blender "Install from Disk".
    if command -v zip >/dev/null 2>&1; then
        _zip_with_zip
    elif _zip_with_python; then
        :
    elif command -v tar >/dev/null 2>&1; then
        _zip_with_tar || true
        if ! _zip_is_valid "${OUTPUT_ZIP}"; then
            rm -f "${OUTPUT_ZIP}"
            if _zip_with_python; then
                :
            elif _zip_with_powershell; then
                :
            else
                echo "tar produced an invalid zip (common with GNU tar on Git Bash)." >&2
                echo "Install python3 or zip, then rebuild." >&2
                return 1
            fi
        fi
    elif _zip_with_powershell; then
        :
    else
        echo "No zip tool found. Install one of:" >&2
        echo "  - zip (MSYS2: pacman -S zip)" >&2
        echo "  - python3" >&2
        echo "  - tar with zip support (bsdtar / libarchive)" >&2
        echo "  - PowerShell (Windows)" >&2
        return 1
    fi

    if [ ! -f "${OUTPUT_ZIP}" ]; then
        echo "Failed to create zip: ${OUTPUT_ZIP}" >&2
        return 1
    fi

    if ! _zip_is_valid "${OUTPUT_ZIP}"; then
        echo "Output is not a valid zip archive: ${OUTPUT_ZIP}" >&2
        return 1
    fi
}
