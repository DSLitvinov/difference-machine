# Embed Windows icon resources (.syso) for Go 1.26+ (amd64 COFF only).
# Go 1.26 rejects 32-bit relocations in amd64 binaries — see golang/go#77783.

embed_windows_icon_syso() {
    local ico="$1"
    local syso_prefix="$2"

    if [ ! -f "${ico}" ]; then
        echo -e "${YELLOW:-}⚠ Icon not found: ${ico}${NC:-}" >&2
        return 1
    fi

    local syso_dir
    syso_dir="$(dirname "${syso_prefix}")"
    rm -f "${syso_dir}/"*.syso

    if GO111MODULE=on go run github.com/tc-hib/go-winres@v0.3.3 simply \
        --arch amd64 \
        --icon "${ico}" \
        --out "${syso_prefix}"; then
        echo -e "${GREEN:-}✓ Windows resource: ${syso_prefix}_windows_amd64.syso${NC:-}"
        return 0
    fi

    echo -e "${YELLOW:-}⚠ go-winres failed${NC:-}" >&2
    return 1
}

cleanup_windows_icon_syso() {
    local syso_dir="$1"
    rm -f "${syso_dir}/"*.syso
}
