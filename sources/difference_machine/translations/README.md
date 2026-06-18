# Translations

This directory contains translation files for the Difference Machine GUI.

## Files

- `difference_machine_ru.ts` - Russian translation (source language)
- `difference_machine_en.ts` - English translation
- `difference_machine_ru.qm` - Compiled Russian translation (binary)
- `difference_machine_en.qm` - Compiled English translation (binary)

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
cd difference_machine
python3 compile_translations.py
```

Or manually:
```bash
lrelease-qt6 difference_machine_ru.ts -qm difference_machine_ru.qm
lrelease-qt6 difference_machine_en.ts -qm difference_machine_en.qm
```

## Adding New Translations

1. Add new strings wrapped in `qsTr()` in QML files
2. Update translation files (`.ts`) with new entries
3. Compile to `.qm` files using `lrelease`

## Note

If `.qm` files are not available, the application will use source strings (Russian by default).
