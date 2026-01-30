#!/usr/bin/env python3
"""
Difference Machine - Qt QML Application
Main entry point for the application.
"""

__version__ = "0.7.5"

import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtQml import QQmlApplicationEngine, qmlRegisterType
from PyQt6.QtCore import QUrl, QLocale
from PyQt6.QtGui import QIcon
from pathlib import Path
try:
    from PyQt6.QtWebEngine import QtWebEngine
    QtWebEngine.initialize()
except ImportError:
    pass  # QtWebEngine may not be available
from file_management import FileManager
from file_viewer import FileViewer
from repository import RepositoryManager, ConfigManager
from translation_manager import TranslationManager


class StderrFilter:
    """Filter to suppress WebEngine Skia Graphite warnings during Qt/WebEngine init.
    Used only until the first QML load; stderr is then restored."""
    def __init__(self, original_stderr):
        self.original_stderr = original_stderr
        self.suppress_patterns = [
            "Skia Graphite backend",
            "falling back to Ganesh"
        ]
    
    def write(self, message):
        # Suppress messages containing the patterns
        if not any(pattern in message for pattern in self.suppress_patterns):
            self.original_stderr.write(message)
    
    def flush(self):
        self.original_stderr.flush()


def main():
    """Initialize and run the QML application."""
    from repository.logging_config import setup_logging
    setup_logging()

    # Set QML style to Basic to support customization (fixes warnings about native style)
    os.environ.setdefault("QT_QUICK_CONTROLS_STYLE", "Basic")
    
    # Suppress WebEngine Skia Graphite warnings only during init
    original_stderr = sys.stderr
    sys.stderr = StderrFilter(original_stderr)
    
    # Use QApplication instead of QGuiApplication for QFileDialog
    app = QApplication(sys.argv)
    app.setApplicationName("Difference Machine")
    app.setApplicationVersion(__version__)
    if getattr(sys, "frozen", False):
        base_path = Path(sys._MEIPASS)
    else:
        base_path = Path(__file__).parent.absolute()
    icon_path = base_path / "resources" / "icons" / "DFM.svg"
    app_icon = QIcon(str(icon_path)) if icon_path.exists() else None
    if app_icon is not None:
        app.setWindowIcon(app_icon)
    
    # Register types for QML so that "import FileManager 1.0" etc. resolve.
    # QML uses these imports; actual instances are injected via setContextProperty below.
    qmlRegisterType(FileManager, "FileManager", 1, 0, "FileManager")
    qmlRegisterType(FileViewer, "FileViewer", 1, 0, "FileViewer")
    qmlRegisterType(RepositoryManager, "RepositoryManager", 1, 0, "RepositoryManager")
    qmlRegisterType(ConfigManager, "ConfigManager", 1, 0, "ConfigManager")
    qmlRegisterType(TranslationManager, "TranslationManager", 1, 0, "TranslationManager")
    
    # Create translation manager
    translation_manager = TranslationManager()
    translation_manager.setApplication(app)
    
    # Set default locale to Russian
    locale = QLocale(QLocale.Language.Russian, QLocale.Country.Russia)
    QLocale.setDefault(locale)
    
    # Load default translation (Russian)
    translation_manager.setLanguage("ru")
    
    engine = QQmlApplicationEngine()
    
    # Set base URL for QML resources
    engine.setBaseUrl(QUrl.fromLocalFile(str(base_path)))
    
    # Add import path for QML modules
    engine.addImportPath(str(base_path))
    
    # Singleton-like instances for QML (file_management, file_viewer, repository packages)
    file_manager = FileManager()
    engine.rootContext().setContextProperty("fileManager", file_manager)
    
    file_viewer = FileViewer()
    engine.rootContext().setContextProperty("fileViewer", file_viewer)
    
    repository_manager = RepositoryManager()
    engine.rootContext().setContextProperty("repositoryManager", repository_manager)
    config_manager = ConfigManager()
    engine.rootContext().setContextProperty("configManager", config_manager)
    engine.rootContext().setContextProperty("appVersion", __version__)
    engine.rootContext().setContextProperty("translationManager", translation_manager)
    
    # Connect language change to retranslate UI
    def onLanguageChanged(lang_code):
        engine.retranslate()
    translation_manager.languageChanged.connect(onLanguageChanged)
    
    # Get the path to MainWindow.qml
    qml_file = base_path / "MainWindow.qml"
    engine.load(QUrl.fromLocalFile(str(qml_file)))
    
    # Restore stderr after Qt/WebEngine and first QML load
    sys.stderr = original_stderr
    
    if not engine.rootObjects():
        sys.exit(-1)
    
    # Set icon on main window (Linux taskbar, macOS dock)
    root = engine.rootObjects()[0]
    if app_icon is not None and hasattr(root, "setIcon"):
        root.setIcon(app_icon)
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

