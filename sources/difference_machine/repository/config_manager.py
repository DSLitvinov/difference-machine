"""
Config manager for reading/writing ~/.dfm/setup.cfg and opening file dialogs for paths.
"""

import configparser
import logging
from pathlib import Path
from typing import Optional

from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot, pyqtProperty
from PyQt6.QtWidgets import QApplication, QFileDialog

from . import config_loader

log = logging.getLogger("difference_machine")


def _ensure_dfm_dir():
    p = Path.home() / ".dfm"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _read_config() -> configparser.ConfigParser:
    cfg = configparser.ConfigParser()
    path = config_loader.get_setup_cfg_path()
    if path.exists():
        cfg.read(path, encoding="utf-8")
    return cfg


def _write_config(cfg: configparser.ConfigParser) -> bool:
    path = config_loader.get_setup_cfg_path()
    _ensure_dfm_dir()
    try:
        with open(path, "w", encoding="utf-8") as f:
            cfg.write(f)
        return True
    except Exception as e:
        log.warning("Failed to write setup.cfg: %s", e)
        return False


class ConfigManager(QObject):
    """Manages ~/.dfm/setup.cfg: load, save, and file dialogs for forester/blender paths."""

    configSaved = pyqtSignal()
    configLoaded = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._user_name = ""
        self._user_email = ""
        self._forester_path = ""
        self._blender_path = ""
        self._addon_path = ""
        self._gc_interval_days = 90
        self._gc_reflog_expire_days = 90

    @pyqtProperty(str, notify=configLoaded)
    def userName(self):
        return self._user_name

    @userName.setter
    def userName(self, value):
        if value != self._user_name:
            self._user_name = value or ""

    @pyqtProperty(str, notify=configLoaded)
    def userEmail(self):
        return self._user_email

    @userEmail.setter
    def userEmail(self, value):
        if value != self._user_email:
            self._user_email = value or ""

    @pyqtProperty(str, notify=configLoaded)
    def foresterPath(self):
        return self._forester_path

    @foresterPath.setter
    def foresterPath(self, value):
        if value != self._forester_path:
            self._forester_path = value or ""

    @pyqtProperty(str, notify=configLoaded)
    def blenderPath(self):
        return self._blender_path

    @blenderPath.setter
    def blenderPath(self, value):
        if value != self._blender_path:
            self._blender_path = value or ""

    @pyqtProperty(str, notify=configLoaded)
    def addonPath(self):
        return self._addon_path

    @addonPath.setter
    def addonPath(self, value):
        if value != self._addon_path:
            self._addon_path = value or ""

    @pyqtProperty(int, notify=configLoaded)
    def gcIntervalDays(self):
        return self._gc_interval_days

    @gcIntervalDays.setter
    def gcIntervalDays(self, value):
        v = int(value) if value is not None else 90
        if v != self._gc_interval_days:
            self._gc_interval_days = max(1, min(365, v))

    @pyqtProperty(int, notify=configLoaded)
    def gcReflogExpireDays(self):
        return self._gc_reflog_expire_days

    @gcReflogExpireDays.setter
    def gcReflogExpireDays(self, value):
        v = int(value) if value is not None else 90
        if v != self._gc_reflog_expire_days:
            self._gc_reflog_expire_days = max(1, min(365, v))

    @pyqtSlot()
    def loadConfig(self):
        """Load all settings from ~/.dfm/setup.cfg. Forester path is read raw from config (no validation) so user edits are preserved."""
        self._user_name = (config_loader.get_user_name() or "").strip()
        self._user_email = (config_loader.get_user_email() or "").strip()
        # Read forester path directly from config — get_forester_binary_path() ignores setup.cfg when frozen
        # and returns None when path doesn't exist, causing the field to appear empty
        cfg = _read_config()
        if "forester" in cfg and "path" in cfg["forester"]:
            self._forester_path = (cfg["forester"]["path"] or "").strip()
        else:
            self._forester_path = ""
        self._blender_path = (config_loader.get_blender_path() or "").strip()
        self._addon_path = (config_loader.get_addon_path() or "").strip()
        self._gc_interval_days = config_loader.get_gc_interval_days() or 90
        self._gc_reflog_expire_days = config_loader.get_gc_reflog_expire_days() or 90
        self.configLoaded.emit()

    @pyqtSlot(result=bool)
    def resetConfig(self) -> bool:
        """Reset form to defaults (in memory only; use Apply to save)."""
        self._user_name = ""
        self._user_email = ""
        self._forester_path = ""
        self._blender_path = ""
        self._addon_path = ""
        self._gc_interval_days = 90
        self._gc_reflog_expire_days = 90
        self.configLoaded.emit()
        return True

    @pyqtSlot(result=bool)
    def saveConfig(self) -> bool:
        """Save current settings to ~/.dfm/setup.cfg."""
        cfg = _read_config()
        if "user" not in cfg:
            cfg.add_section("user")
        cfg["user"]["name"] = self._user_name
        cfg["user"]["email"] = self._user_email
        if "forester" not in cfg:
            cfg.add_section("forester")
        cfg["forester"]["path"] = self._forester_path
        # Derive API path from forester path when saving.
        # Expected layout: forester binary in <prefix>/bin/, library in <prefix>/lib/.
        if self._forester_path:
            forester_dir = Path(self._forester_path).parent.resolve()
            for name in ["libforester.so", "libforester.dylib", "forester.dll"]:
                api_candidate = forester_dir.parent / "lib" / name
                if api_candidate.exists():
                    if "api" not in cfg:
                        cfg.add_section("api")
                    cfg["api"]["path"] = str(api_candidate)
                    break
            py_candidate = forester_dir.parent / "lib" / "python"
            if py_candidate.exists() and py_candidate.is_dir():
                if "python_bindings" not in cfg:
                    cfg.add_section("python_bindings")
                cfg["python_bindings"]["path"] = str(py_candidate)
        if "blender" not in cfg:
            cfg.add_section("blender")
        cfg["blender"]["path"] = self._blender_path
        # Derive merge_apply_script from addon path when saving
        if self._addon_path:
            script_path = Path(self._addon_path) / "scripts" / "merge_apply_background.py"
            if script_path.exists() and script_path.is_file():
                cfg["blender"]["merge_apply_script"] = str(script_path.absolute())
        if "addons" not in cfg:
            cfg.add_section("addons")
        cfg["addons"]["diffmachine_path"] = self._addon_path
        if "gc" not in cfg:
            cfg.add_section("gc")
        cfg["gc"]["interval.day"] = str(self._gc_interval_days)
        cfg["gc"]["reflog.expire.days"] = str(self._gc_reflog_expire_days)
        ok = _write_config(cfg)
        if ok:
            self.configSaved.emit()
        return ok

    def _set_forester_and_api(self, forester_path: str):
        """Set forester path in memory only (API derived at save time)."""
        self._forester_path = forester_path
        self.configLoaded.emit()

    def _set_blender_and_merge_script(self, blender_path: str):
        """Set blender path in memory only (merge_apply_script derived at save time)."""
        self._blender_path = blender_path
        self.configLoaded.emit()

    @pyqtSlot(result=str)
    def openFileDialogForForester(self) -> str:
        """Open file dialog to select forester binary; save path and derive API. Returns selected path or empty."""
        app = QApplication.instance()
        if not app:
            return ""
        start = self._forester_path or str(Path.home())
        path, _ = QFileDialog.getOpenFileName(
            None,
            "Выберите исполняемый файл Forester",
            start,
            "Executable (*);;All (*)",
        )
        if path:
            self._set_forester_and_api(path)
        return path or ""

    @pyqtSlot(result=str)
    def openFileDialogForBlender(self) -> str:
        """Open file dialog to select Blender; save path and set merge_apply_script. Returns selected path or empty."""
        app = QApplication.instance()
        if not app:
            return ""
        start = self._blender_path or str(Path.home())
        path, _ = QFileDialog.getOpenFileName(
            None,
            "Выберите Blender (исполняемый файл или .app)",
            start,
            "Blender (*.app);;Executable (*);;All (*)",
        )
        if path:
            self._set_blender_and_merge_script(path)
        return path or ""

    @pyqtSlot(result=str)
    def openDirDialogForAddon(self) -> str:
        """Open directory dialog to select diffmachine addon folder. Returns selected path or empty."""
        app = QApplication.instance()
        if not app:
            return ""
        start = self._addon_path or str(Path.home())
        path = QFileDialog.getExistingDirectory(
            None,
            "Выберите папку аддона Difference Machine",
            start,
            QFileDialog.Option.ShowDirsOnly,
        )
        if path:
            self._addon_path = path
            self.configLoaded.emit()
        return path or ""
