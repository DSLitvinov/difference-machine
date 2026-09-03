# Persistent ffmpeg cache and reuse from previous builds.
# Requires detect_platform (FFMPEG_BIN_NAME, CURRENT_OS) and copy_ffmpeg_sidecar.

ffmpeg_archive_cache_dir() {
    echo "${BUILDER_DIR}/.cache/ffmpeg/archives"
}

ffmpeg_bin_cache_dir() {
    echo "${BUILDER_DIR}/.cache/ffmpeg/bin"
}

# Copy bundled ffmpeg into staging from bin cache or the last dist payload.
# Prints the reuse source ("cache" or "dist") on success.
ffmpeg_stage_from_previous_builds() {
    local staging_bin="$1"
    local builder_dir="$2"
    local lib_dir
    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # shellcheck source=copy_ffmpeg_sidecar.sh
    . "${lib_dir}/copy_ffmpeg_sidecar.sh"

    mkdir -p "${staging_bin}"

    local cache_bin
    cache_bin="$(ffmpeg_bin_cache_dir)"
    if [ -f "${cache_bin}/${FFMPEG_BIN_NAME}" ]; then
        copy_ffmpeg_sidecar "${cache_bin}" "${staging_bin}"
        if [ -f "${staging_bin}/${FFMPEG_BIN_NAME}" ]; then
            echo "cache"
            return 0
        fi
    fi

    local dist_bin="${builder_dir}/dist/payload/bin"
    if [ -f "${dist_bin}/${FFMPEG_BIN_NAME}" ]; then
        copy_ffmpeg_sidecar "${dist_bin}" "${staging_bin}"
        if [ -f "${staging_bin}/${FFMPEG_BIN_NAME}" ]; then
            echo "dist"
            return 0
        fi
    fi

    return 1
}

ffmpeg_persist_bin_cache() {
    local staging_bin="$1"
    local cache_bin
    cache_bin="$(ffmpeg_bin_cache_dir)"
    local lib_dir
    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    mkdir -p "${cache_bin}"
    # shellcheck source=copy_ffmpeg_sidecar.sh
    . "${lib_dir}/copy_ffmpeg_sidecar.sh"
    copy_ffmpeg_sidecar "${staging_bin}" "${cache_bin}"
}
