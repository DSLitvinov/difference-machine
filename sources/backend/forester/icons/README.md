# Forester app icons

Source artwork lives in `sources/backend/forester/icons/source.svg` (256×256 design grid).

Generated outputs: `sources/backend/forester/icons/build/`.

```bash
bash builder/scripts/generate_forester_icons.sh
```

This runs automatically in `builder/scripts/build_forester.sh`.

| Platform | Output | Used by |
|----------|--------|---------|
| macOS | `build/AppIcon.icns` | `Forester.app` (`CFBundleIconFile`) |
| Windows | `build/forester.ico` | Embedded in `forester.exe` (go-winres) |
| Linux | `build/share/icons/hicolor/...` | Distribution payload `share/icons/` |

Icons use the macOS squircle clip (superellipse n=5) and Apple 824px live area on a 1024 grid.
