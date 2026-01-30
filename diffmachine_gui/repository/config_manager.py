"""
Config manager for reading/writing ~/.dfm/setup.cfg and opening file dialogs for paths.
"""

import configparser
from pathlib import Path
from typing import Optional

from PyQt6.QtCore import QObject, pyqtSignal, pyqtSlot, pyqtProperty
from PyQt6.QtWidgets import QApplication, QFileDialog

from . import config_loader


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
    except Exception:
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
        """Load all settings from ~/.dfm/setup.cfg."""
        self._user_name = (config_loader.get_user_name() or "").strip()
        self._user_email = (config_loader.get_user_email() or "").strip()
        self._forester_path = (config_loader.get_forester_binary_path() or "").strip()
        self._blender_path = (config_loader.get_blender_path() or "").strip()
        self._addon_path = (config_loader.get_addon_path() or "").strip()
        self._gc_interval_days = config_loader.get_gc_interval_days() or 90
        self._gc_reflog_expire_days = config_loader.get_gc_reflog_expire_days() or 90
        self.configLoaded.emit()

    @pyqtSlot(result=bool)
    def resetConfig(self) -> bool:
        """Reset all settings to defaults and clear the config file."""
        # Reset internal state to defaults
        self._user_name = ""
        self._user_email = ""
        self._forester_path = ""
        self._blender_path = ""
        self._addon_path = ""
        self._gc_interval_days = 90
        self._gc_reflog_expire_days = 90
        
        # Clear config file (write empty/default values)
        cfg = configparser.ConfigParser()
        cfg.add_section("user")
        cfg["user"]["name"] = ""
        cfg["user"]["email"] = ""
        cfg.add_section("forester")
        cfg["forester"]["path"] = ""
        cfg.add_section("blender")
        cfg["blender"]["path"] = ""
        cfg.add_section("addons")
        cfg["addons"]["diffmachine_path"] = ""
        cfg.add_section("gc")
        cfg["gc"]["interval.day"] = "90"
        cfg["gc"]["reflog.expire.days"] = "90"
        
        ok = _write_config(cfg)
        if ok:
            self.configLoaded.emit()
        return ok

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
        if "blender" not in cfg:
            cfg.add_section("blender")
        cfg["blender"]["path"] = self._blender_path
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
        """Set forester path and derive API path (lib in parent/lib)."""
        self._forester_path = forester_path
        cfg = _read_config()
        if "forester" not in cfg:
            cfg.add_section("forester")
        cfg["forester"]["path"] = forester_path
        forester_dir = Path(forester_path).parent.resolve()
        # Try ../lib/libforester.so or ../lib/forester.dll etc.
        for name in ["libforester.so", "libforester.dylib", "forester.dll"]:
            api_candidate = forester_dir.parent / "lib" / name
            if api_candidate.exists():
                if "api" not in cfg:
                    cfg.add_section("api")
                cfg["api"]["path"] = str(api_candidate)
                break
        # Python bindings: often ../lib/python or parent
        py_candidate = forester_dir.parent / "lib" / "python"
        if py_candidate.exists() and py_candidate.is_dir():
            if "python_bindings" not in cfg:
                cfg.add_section("python_bindings")
            cfg["python_bindings"]["path"] = str(py_candidate)
        _write_config(cfg)
        self.configLoaded.emit()

    def _set_blender_and_merge_script(self, blender_path: str):
        """Set blender path and default merge_apply_script if found."""
        self._blender_path = blender_path
        cfg = _read_config()
        if "blender" not in cfg:
            cfg.add_section("blender")
        cfg["blender"]["path"] = blender_path
        # Default merge_apply_script: use config_loader helper that handles frozen mode
        script_path = config_loader.get_merge_apply_script_path()
        if script_path:
            cfg["blender"]["merge_apply_script"] = script_path
        _write_config(cfg)
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
            "Выберите папку аддона diffmachine",
            start,
            QFileDialog.Option.ShowDirsOnly,
        )
        if path:
            self._addon_path = path
            self.saveConfig()
            self.configLoaded.emit()
        return path or ""
