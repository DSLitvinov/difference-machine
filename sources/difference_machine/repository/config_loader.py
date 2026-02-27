"""
Configuration loader for Diffmachine GUI.
"""

import configparser
import logging
import os
import sys
from pathlib import Path
from typing import Optional
import shutil

log = logging.getLogger("difference_machine")


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
    """Единственное место API: difference_machine/api/ (библиотека и api/python/ с биндингами)."""
    return _get_gui_dir() / "api"


def get_api_library_path() -> Optional[str]:
    """Forester API library: difference_machine/api/ first, then setup.cfg [api] path."""
    api_dir = _get_api_dir()
    if api_dir.exists():
        for name in ("libforester.so", "libforester.dylib", "forester.dll"):
            p = api_dir / name
            if p.exists() and p.is_file():
                return str(p.absolute())
    # Fallback to setup.cfg when api/ has no library (user may have installed forester elsewhere)
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path, encoding="utf-8")
            if "api" in config and "path" in config["api"]:
                api_path = config["api"]["path"].strip()
                if api_path:
                    p = Path(api_path)
                    if p.exists() and p.is_file():
                        return str(p.absolute())
        except Exception as e:
            log.warning("Failed to read API path from setup.cfg: %s", e)
    return None


def get_python_bindings_path() -> Optional[str]:
    """Forester Python bindings: difference_machine/api/python/ first, then setup.cfg [python_bindings] path."""
    bindings = _get_api_dir() / "python"
    if bindings.exists() and bindings.is_dir() and (bindings / "python_bindings_structured.py").exists():
        return str(bindings.absolute())
    # Fallback to setup.cfg when api/python/ has no bindings
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path, encoding="utf-8")
            if "python_bindings" in config and "path" in config["python_bindings"]:
                bindings_path = config["python_bindings"]["path"].strip()
                if bindings_path:
                    p = Path(bindings_path)
                    if p.exists() and p.is_dir() and (p / "python_bindings_structured.py").exists():
                        return str(p.absolute())
        except Exception as e:
            log.warning("Failed to read python_bindings path from setup.cfg: %s", e)
    return None


def get_forester_binary_path() -> Optional[str]:
    """
    Forester CLI binary: when frozen, try ../bin relative to GUI dir first, then setup.cfg.
    Otherwise: ~/.dfm/setup.cfg, FORESTER_BIN, or which.
    """
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"

    if getattr(sys, "frozen", False):
        gui_dir = _get_gui_dir()
        bin_dir = gui_dir.parent / "bin"
        for name in ("forester", "forester.exe"):
            p = bin_dir / name
            if p.exists() and p.is_file():
                return str(p.absolute())
        # Fallback to setup.cfg when ../bin has no forester (user may have installed elsewhere)
        if setup_cfg_path.exists():
            try:
                config = configparser.ConfigParser()
                config.read(setup_cfg_path, encoding="utf-8")
                if "forester" in config and "path" in config["forester"]:
                    forester_path = config["forester"]["path"].strip()
                    if forester_path:
                        forester_path_obj = Path(forester_path)
                        if forester_path_obj.exists() and forester_path_obj.is_file():
                            return str(forester_path_obj.absolute())
            except Exception as e:
                log.warning("Failed to read forester path from setup.cfg (frozen): %s", e)
        return None

    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path, encoding="utf-8")
            if "forester" in config and "path" in config["forester"]:
                forester_path = config["forester"]["path"].strip()
                if forester_path:
                    forester_path_obj = Path(forester_path)
                    if forester_path_obj.exists() and forester_path_obj.is_file():
                        return str(forester_path_obj.absolute())
        except Exception as e:
            log.warning("Failed to read forester path from setup.cfg: %s", e)

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
        config.read(setup_cfg_path, encoding="utf-8")
        if "blender" in config and "path" in config["blender"]:
            blender_path = config["blender"]["path"].strip()
            if not blender_path:
                return None
            blender_path_obj = Path(blender_path)
            if blender_path_obj.exists():
                return str(blender_path_obj.absolute())
    except Exception as e:
        log.warning("Failed to read blender path from setup.cfg: %s", e)

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
    """Get difference_machine addon path from setup.cfg [addons] diffmachine_path.
    
    Installer writes the path during addon installation.
    User can change it in GUI settings.
    """
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if setup_cfg_path.exists():
        try:
            config = configparser.ConfigParser()
            config.read(setup_cfg_path, encoding="utf-8")
            if "addons" in config and "diffmachine_path" in config["addons"]:
                p = config["addons"]["diffmachine_path"].strip()
                if p:
                    pp = Path(p)
                    if pp.exists() and pp.is_dir():
                        return str(pp.absolute())
        except Exception as e:
            log.warning("Failed to read addon path from setup.cfg: %s", e)
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
        config.read(setup_cfg_path, encoding="utf-8")
        if "user" in config and "name" in config["user"]:
            name = config["user"]["name"].strip()
            if name:
                return name
        # Fallback to environment variable
        import os
        return os.environ.get("FORESTER_AUTHOR")
    except Exception as e:
        log.warning("Failed to read user name from setup.cfg: %s", e)
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
        config.read(setup_cfg_path, encoding="utf-8")
        if "user" in config and "email" in config["user"]:
            return config["user"]["email"].strip() or None
    except Exception as e:
        log.warning("Failed to read user email from setup.cfg: %s", e)
    return None


def get_gc_interval_days() -> Optional[int]:
    """Get GC interval (days) from setup.cfg [gc] interval.day."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path, encoding="utf-8")
        if "gc" in config and "interval.day" in config["gc"]:
            return int(config["gc"]["interval.day"].strip())
    except Exception as e:
        log.warning("Failed to read gc interval from setup.cfg: %s", e)
    return None


def get_gc_reflog_expire_days() -> Optional[int]:
    """Get GC reflog expire (days) from setup.cfg [gc] reflog.expire.days."""
    setup_cfg_path = Path.home() / ".dfm" / "setup.cfg"
    if not setup_cfg_path.exists():
        return None
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path, encoding="utf-8")
        if "gc" in config and "reflog.expire.days" in config["gc"]:
            return int(config["gc"]["reflog.expire.days"].strip())
    except Exception as e:
        log.warning("Failed to read gc reflog expire from setup.cfg: %s", e)
    return None


def get_setup_cfg_path() -> Path:
    """Return path to ~/.dfm/setup.cfg."""
    return Path.home() / ".dfm" / "setup.cfg"
