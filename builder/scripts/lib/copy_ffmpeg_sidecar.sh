# Copy bundled ffmpeg next to a GUI binary directory.
# Usage: copy_ffmpeg_sidecar SOURCE_BIN_DIR DEST_DIR

copy_ffmpeg_sidecar() {
    local source_bin="$1"
    local dest_dir="$2"
    local dest_file="${dest_dir}/${FFMPEG_BIN_NAME}"

    if [ ! -d "${source_bin}" ] || [ ! -d "${dest_dir}" ]; then
        return 0
    fi
    if [ ! -f "${source_bin}/${FFMPEG_BIN_NAME}" ]; then
        return 0
    fi

    # Homebrew and prior builds may leave a read-only destination (555); cp cannot overwrite it.
    rm -f "${dest_file}"
    cp "${source_bin}/${FFMPEG_BIN_NAME}" "${dest_file}"
    chmod 755 "${dest_file}" 2>/dev/null || true

    if [ "${CURRENT_OS}" = "windows" ]; then
        shopt -s nullglob
        for dll in "${source_bin}"/*.dll; do
            cp "${dll}" "${dest_dir}/"
        done
        shopt -u nullglob
    fi
}
