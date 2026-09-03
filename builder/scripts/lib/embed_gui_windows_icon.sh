# Prepare Windows GUI build: drop stale .syso files (Go 1.26+ is strict about amd64 relocations).
# Wails embeds icon.ico via its own winres step during `wails build -clean`.

prepare_gui_windows_build() {
    local gui_dir="$1"
    rm -f "${gui_dir}"/*-res.syso "${gui_dir}/"rsrc_*.syso "${gui_dir}/cmd/"*/*.syso 2>/dev/null || true
}
