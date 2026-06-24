# Distribution output path. Default: builder/dist/payload
# Source after BUILDER_DIR is known, then call ensure_dfm_dist.

ensure_dfm_dist() {
    local builder_dir="${1:?builder directory required}"
    DFM_DIST="${DFM_DIST:-${builder_dir}/dist/payload}"
    export DFM_DIST
}
