# Translations

This directory contains translation files for the Difference Machine GUI.

## Files

- `diffmachine_ru.ts` - Russian translation (source language)
- `diffmachine_en.ts` - English translation
- `diffmachine_ru.qm` - Compiled Russian translation (binary)
- `diffmachine_en.qm` - Compiled English translation (binary)

## Compiling Translations

To compile `.ts` files to `.qm` files, you need Qt's `lrelease` tool.

### Install Qt Tools

**Ubuntu/Debian:**
```bash
sudo apt-get install qttools6-dev-tools
```

**Fedora:**
```bash
sudo dnf install qt6-linguist
```

**macOS:**
```bash
brew install qt6
```

**Windows:**
Download and install Qt6 from https://www.qt.io/download

### Compile Translations

Run the compilation script:
```bash
cd diffmachine_gui
python3 compile_translations.py
```

Or manually:
```bash
lrelease-qt6 diffmachine_ru.ts -qm diffmachine_ru.qm
lrelease-qt6 diffmachine_en.ts -qm diffmachine_en.qm
```

## Adding New Translations

1. Add new strings wrapped in `qsTr()` in QML files
2. Update translation files (`.ts`) with new entries
3. Compile to `.qm` files using `lrelease`

## Note

If `.qm` files are not available, the application will use source strings (Russian by default).
