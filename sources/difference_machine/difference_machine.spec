# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for Difference Machine GUI (PyQt6 + QML).
# Запуск из каталога difference_machine: pyinstaller difference_machine.spec

import sys
from pathlib import Path

# Корень приложения (каталог difference_machine)
spec_dir = Path(SPECPATH)
app_root = spec_dir

# Данные: QML, ресурсы, переводы
datas = [
    (str(app_root / 'MainWindow.qml'), '.'),
]
# Папки целиком (QML и ресурсы; file_viewer нужен для FileMetadataPanel, image_viewer и т.д.)
for folder in ('panels', 'components', 'resources', 'translations', 'file_viewer'):
    src = app_root / folder
    if src.exists():
        datas.append((str(src), folder))

# Скрытые импорты (пакеты приложения, PyQt6, stdlib для api/python_bindings_structured)
hiddenimports = [
    'ctypes',  # нужен для загружаемого с диска api/python/python_bindings_structured.py
    'file_management',
    'file_management.file_icons',
    'file_management.icon_associations',
    'file_viewer',
    'file_viewer.file_viewer',
    'file_viewer.file_metadata',
    'file_viewer.syntax_highlighter',
    'repository',
    'repository.repository_manager',
    'repository.config_manager',
    'repository.config_loader',
    'repository.forester_api',
    'repository.branch_model',
    'repository.commit_model',
    'repository.status_model',
    'repository.diff',
    'repository.images',
    'repository.merge',
    'repository.logging_config',
    'diff_viewer',
    'diff_viewer.diff_processor',
    'diff_viewer.image_diff_processor',
    'diff_viewer.unified_diff_parser',
    'translation_manager',
    'PyQt6.QtCore',
    'PyQt6.QtGui',
    'PyQt6.QtWidgets',
    'PyQt6.QtQml',
    'PyQt6.QtQuick',
    'PyQt6.QtQuickControls2',
]
try:
    hiddenimports.append('PyQt6.QtWebEngine')
    hiddenimports.append('PyQt6.QtWebEngineWidgets')
except Exception:
    pass

a = Analysis(
    [str(app_root / 'main.py')],
    pathex=[str(app_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DifferenceMachine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='difference_machine',
)
