#!/usr/bin/env python3
"""
Translation Manager for Difference Machine GUI
Handles language switching and translation loading.
"""

import sys
from PyQt6.QtCore import QObject, pyqtSignal, QTranslator, QLocale, pyqtSlot, pyqtProperty
from PyQt6.QtQml import qmlRegisterType
from pathlib import Path


def _app_base_path() -> Path:
    """Base path for app resources (works when frozen with PyInstaller)."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.absolute()


class TranslationManager(QObject):
    """Manages translations for the application."""
    
    languageChanged = pyqtSignal(str)  # Emitted when language changes
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._translator = QTranslator()
        self._current_language = "ru"  # Default to Russian
        self._base_path = _app_base_path()
        self._translations_path = self._base_path / "translations"
        self._app = None
        
    def setApplication(self, app):
        """Set the QApplication instance for translation management."""
        self._app = app
    
    @pyqtProperty(str, notify=languageChanged)
    def currentLanguage(self):
        """Return current language code (QML property)."""
        return self._current_language
    
    @pyqtSlot(result='QVariantList')
    def getAvailableLanguages(self):
        """Return list of available languages."""
        return [
            {"code": "ru", "name": "Русский"},
            {"code": "en", "name": "English"}
        ]
    
    @pyqtSlot(result=str)
    def getCurrentLanguage(self):
        """Return current language code."""
        return self._current_language
    
    @pyqtSlot('QObject')
    def retranslate(self, engine):
        """Trigger retranslation of QML UI."""
        if engine:
            engine.retranslate()
    
    @pyqtSlot(str, result=bool)
    def setLanguage(self, language_code):
        """Set application language and load translation."""
        if language_code not in ["ru", "en"]:
            return False
        
        # Update locale
        if language_code == "ru":
            locale = QLocale(QLocale.Language.Russian, QLocale.Country.Russia)
        else:  # en
            locale = QLocale(QLocale.Language.English, QLocale.Country.UnitedStates)
        QLocale.setDefault(locale)
        
        if not self._app:
            # If app is not set, just update the language code
            self._current_language = language_code
            self.languageChanged.emit(language_code)
            return True
        
        # Remove old translator
        self._app.removeTranslator(self._translator)
        
        # Create new translator
        self._translator = QTranslator()
        
        # Load translation file
        translation_file = self._translations_path / f"diffmachine_{language_code}.qm"
        
        if translation_file.exists():
            # Load translation file using full path
            file_path = str(translation_file.absolute())
            if self._translator.load(file_path):
                self._app.installTranslator(self._translator)
                self._current_language = language_code
                self.languageChanged.emit(language_code)
                return True
            else:
                # Try loading with locale-based method
                current_locale = QLocale()
                if self._translator.load(current_locale, "diffmachine", "_", str(self._translations_path), ".qm"):
                    self._app.installTranslator(self._translator)
                    self._current_language = language_code
                    self.languageChanged.emit(language_code)
                    return True
        
        # If translation file doesn't exist, still set language (will use source strings)
        self._current_language = language_code
        self.languageChanged.emit(language_code)
        return True
