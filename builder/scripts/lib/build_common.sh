# Shared build pipeline steps. Source after SCRIPTS_DIR is set.

build_common_forester() {
    bash "${SCRIPTS_DIR}/build_forester.sh"
}

build_common_gui() {
    bash "${SCRIPTS_DIR}/build_gui.sh"
}

build_common_stage() {
    BUILD_GUI="${1:-false}" bash "${SCRIPTS_DIR}/stage_dist.sh"
}

build_common_write_config() {
    bash "${SCRIPTS_DIR}/write_setup_cfg.sh"
}

build_common_clean() {
    bash "${SCRIPTS_DIR}/clean_build.sh"
}

build_common_print_done() {
    echo ""
    echo "Done: ${DFM_DIST}"
}
