#!/usr/bin/env python3
"""Run the DFM UI Kit gallery (PyQt6 + QML)."""

import sys

from PyQt6.QtGui import QGuiApplication
from PyQt6.QtQml import QQmlApplicationEngine

from dfm import __version__
from dfm.uikit import load_gallery


def main() -> int:
    app = QGuiApplication(sys.argv)
    app.setApplicationName("DFM UI Kit Gallery")
    app.setApplicationVersion(__version__)

    engine = QQmlApplicationEngine()
    if not load_gallery(engine):
        return -1

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
