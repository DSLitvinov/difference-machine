"""Helpers for loading the Dfm.UiKit QML module from Python (PyQt6)."""

from __future__ import annotations

import os
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtQml import QQmlApplicationEngine


def uikit_root() -> Path:
    """Absolute path to the `uikit/` directory (QML sources and qmldir)."""
    return Path(__file__).resolve().parent.parent / "uikit"


def configure_engine(engine: QQmlApplicationEngine) -> Path:
    """
    Register import paths so `import Dfm.UiKit 1.0` resolves in QML.

    Returns the uikit root path (also set as the engine base URL).
    """
    root = uikit_root()
    os.environ.setdefault("QT_QUICK_CONTROLS_STYLE", "Fusion")
    engine.addImportPath(str(root))
    engine.setBaseUrl(QUrl.fromLocalFile(str(root)))
    return root


def load_qml(engine: QQmlApplicationEngine, qml_path: Path | str) -> bool:
    """Load a QML file after :func:`configure_engine`. Returns True on success."""
    configure_engine(engine)
    path = Path(qml_path)
    if not path.is_absolute():
        path = uikit_root() / path
    engine.load(QUrl.fromLocalFile(str(path)))
    return bool(engine.rootObjects())


def load_gallery(engine: QQmlApplicationEngine) -> bool:
    """Load the UI Kit gallery window."""
    return load_qml(engine, uikit_root() / "gallery" / "UiKitGallery.qml")
