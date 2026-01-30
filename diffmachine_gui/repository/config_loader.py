"""
Configuration loader for Diffmachine GUI.
"""

import configparser
import os
import sys
from pathlib import Path
from typing import Optional
import shutil


def _get_gui_dir() -> Path:
    """GUI root: when frozen = parent of executable (там же должна быть папка api/), else = parent of repository package."""
    if getattr(sys, "frozen", False):
        # Всегда абсолютный путь: при запуске через launcher sys.executable может быть полным путём к бинарнику
        exe = getattr(sys, "executable", "")
        if exe:
            return Path(os.path.abspath(exe)).resolve().parent
        return Path.cwd()
    return Path(__file__).resolve().parent.parent


def _get_api_dir() -> Path:
    """Единственное место API: diffmachine_gui/api/ (библиотека и api/python/ с биндингами)."""
    return _get_gui_dir() / "api"


def get_api_library_path() -> Optional[str]:
    """Forester API library — только из diffmachine_gui/api/."""
    api_dir = _get_api_dir()
    if not api_dir.exists():
        return None
    for name in ("libforester.so", "libforester.dylib", "forester.dll"):
        p = api_dir / name
        if p.exists() and p.is_file():
            return str(p.absolute())
    return None


def get_python_bindings_path() -> Optional[str]:
    """Forester Python bindings — только из diffmachine_gui/api/python/."""
    bindings = _get_api_dir() / "python"
    if bindings.exists() and bindings.is_dir() and (bindings / "python_bindings_structured.py").exists():
        return str(bindings.absolute())
    return None


def get_forester_binary_path() -> Optional[str]:
    """
    Forester CLI binary: when frozen from ../bin relative to GUI dir; else from ~/.dfm/setup.cfg, FORESTER_BIN, or which.
    """
    if getattr(sys, "frozen", False):
        gui_dir = _get_gui_dir()
        bin_dir = gui_dir.parent / "bin"
        for name in ("forester", "forester.exe"):
            p = bin_dir / name
            if p.exists() and p.is_file():
                return str(p.absolute())
        return None

    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path)
            if "forester" in config and "path" in config["forester"]:
                forester_path = config["forester"]["path"].strip()
                if forester_path:
                    forester_path_obj = Path(forester_path)
                    if forester_path_obj.exists() and forester_path_obj.is_file():
                        return str(forester_path_obj.absolute())
        except Exception:
            pass

    env_path = os.environ.get("FORESTER_BIN")
    if env_path:
        env_path_obj = Path(env_path)
        if env_path_obj.exists() and env_path_obj.is_file():
            return str(env_path_obj.absolute())

    return shutil.which("forester")


def get_blender_path() -> Optional[str]:
    """Get Blender editor path from setup.cfg."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None

    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if "blender" in config and "path" in config["blender"]:
            blender_path = config["blender"]["path"].strip()
            if not blender_path:
                return None
            blender_path_obj = Path(blender_path)
            if blender_path_obj.exists():
                return str(blender_path_obj.absolute())
    except Exception:
        return None

    return None


def get_blender_executable() -> Optional[str]:
    """Blender executable for subprocess (resolves .app on macOS)."""
    p = get_blender_path()
    if not p:
        return None
    path = Path(p)
    if not path.exists():
        return None
    if path.is_dir() or str(path).lower().endswith(".app"):
        exe = path / "Contents" / "MacOS" / "Blender"
        if exe.exists() and exe.is_file():
            return str(exe)
    return str(path)

def get_addon_path() -> Optional[str]:
    """Get diffmachine addon path from setup.cfg [addons] diffmachine_path.
    
    Installer writes the path during addon installation.
    User can change it in GUI settings.
    """
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path)
            if "addons" in config and "diffmachine_path" in config["addons"]:
                p = config["addons"]["diffmachine_path"].strip()
                if p:
                    pp = Path(p)
                    if pp.exists() and pp.is_dir():
                        return str(pp.absolute())
        except Exception:
            pass
    return None


def get_merge_apply_script_path() -> Optional[str]:
    """Path to merge_apply_background.py - in scripts/ relative to addon root."""
    addon_path = get_addon_path()
    if not addon_path:
        return None
    
    # Script is in scripts/ folder inside addon
    script_path = Path(addon_path) / "scripts" / "merge_apply_background.py"
    
    if script_path.exists() and script_path.is_file():
        return str(script_path.absolute())
    
    return None


def get_user_name() -> Optional[str]:
    """Get user name from setup.cfg."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        # Try environment variable as fallback
        import os
        return os.environ.get("FORESTER_AUTHOR")
    
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if "user" in config and "name" in config["user"]:
            name = config["user"]["name"].strip()
            if name:
                return name
        # Fallback to environment variable
        import os
        return os.environ.get("FORESTER_AUTHOR")
    except Exception:
        import os
        return os.environ.get("FORESTER_AUTHOR")
    
    return None


def get_user_email() -> Optional[str]:
    """Get user email from setup.cfg."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if "user" in config and "email" in config["user"]:
            return config["user"]["email"].strip() or None
    except Exception:
        pass
    return None


def get_gc_interval_days() -> Optional[int]:
    """Get GC interval (days) from setup.cfg [gc] interval.day."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if "gc" in config and "interval.day" in config["gc"]:
            return int(config["gc"]["interval.day"].strip())
    except Exception:
        pass
    return None


def get_gc_reflog_expire_days() -> Optional[int]:
    """Get GC reflog expire (days) from setup.cfg [gc] reflog.expire.days."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if "gc" in config and "reflog.expire.days" in config["gc"]:
            return int(config["gc"]["reflog.expire.days"].strip())
    except Exception:
        pass
    return None


def get_setup_cfg_path() -> Path:
    """Return path to ~/.dfm/setup.cfg."""
    return Path.home() / ".dfm" / "setup.cfg"
