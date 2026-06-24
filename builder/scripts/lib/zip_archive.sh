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
        if command -v python3 >/dev/null 2>&1; then
            py="python3"
        elif command -v python >/dev/null 2>&1; then
            py="python"
        else
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

    if command -v zip >/dev/null 2>&1; then
        _zip_with_zip
    elif command -v tar >/dev/null 2>&1 && _zip_with_tar; then
        :
    elif _zip_with_python; then
        :
    elif _zip_with_powershell; then
        :
    else
        echo "No zip tool found. Install one of:" >&2
        echo "  - zip (MSYS2: pacman -S zip)" >&2
        echo "  - tar with zip support (Git for Windows)" >&2
        echo "  - python3" >&2
        echo "  - PowerShell (Windows)" >&2
        return 1
    fi

    if [ ! -f "${OUTPUT_ZIP}" ]; then
        echo "Failed to create zip: ${OUTPUT_ZIP}" >&2
        return 1
    fi
}
