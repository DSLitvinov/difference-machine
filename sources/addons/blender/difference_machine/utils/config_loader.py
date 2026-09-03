"""
Configuration loader for Difference Machine addon.
"""

import configparser
import sys
from pathlib import Path
from typing import Optional, Dict, Any, Tuple


def get_addon_root() -> Path:
    """Return the Difference Machine addon root directory."""
    return Path(__file__).resolve().parent.parent


def _get_addon_api_dir() -> Path:
    """Single source for API location: addon api/ (library and api/python/ bindings)."""
    return get_addon_root() / "api"


def _normalize_existing_file(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    cleaned = path.strip().strip('"').strip("'")
    if not cleaned:
        return None
    candidate = Path(cleaned)
    if candidate.is_file():
        return str(candidate.absolute())
    return None


def _api_lib_names_for_platform() -> Tuple[str, ...]:
    if sys.platform == "win32":
        return ("forester.dll", "libforester.dll")
    if sys.platform == "darwin":
        return ("libforester.dylib", "libforester_arm64.dylib")
    return ("libforester.so",)


def _api_lib_beside_forester_cli() -> Optional[str]:
    """Derive lib/ API path from [forester] path (install layout: bin/forester -> lib/)."""
    forester_cli = _normalize_existing_file(get_config_value("forester", "path"))
    if not forester_cli:
        return None
    lib_dir = Path(forester_cli).resolve().parent.parent / "lib"
    for name in _api_lib_names_for_platform():
        candidate = lib_dir / name
        if candidate.is_file():
            return str(candidate.absolute())
    return None


def get_api_library_path() -> Optional[str]:
    """Forester native API library from ~/.dfm/setup.cfg or addon api/."""
    configured = _normalize_existing_file(get_config_value("api", "path"))
    if configured:
        return configured

    beside_cli = _api_lib_beside_forester_cli()
    if beside_cli:
        return beside_cli

    api_dir = _get_addon_api_dir()
    if not api_dir.exists():
        return None
    for name in (
        "libforester.so",
        "libforester.dylib",
        "libforester_arm64.dylib",
        "libforester.dll",
        "forester.dll",
    ):
        p = api_dir / name
        if p.exists() and p.is_file():
            return str(p.absolute())
    return None


def get_python_bindings_path() -> Optional[str]:
    """Forester JSON Python bindings from addon api/python/ directory."""
    bindings = _get_addon_api_dir() / "python"
    if bindings.exists() and bindings.is_dir() and (bindings / "python_bindings_json.py").exists():
        return str(bindings.absolute())
    return None


def get_setup_cfg_path() -> Path:
    """Get path to setup.cfg file."""
    return Path.home() / ".dfm" / "setup.cfg"


def load_all_config() -> Dict[str, Dict[str, str]]:
    """
    Load all configuration from setup.cfg.
    
    Returns:
        Dictionary with sections as keys and key-value pairs as values
    """
    setup_cfg_path = get_setup_cfg_path()
    
    if not setup_cfg_path.exists():
        return {}
    
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        
        result = {}
        for section in config.sections():
            result[section] = dict(config[section])
        
        return result
    except Exception:
        return {}


def save_config(section: str, key: str, value: str) -> bool:
    """
    Save a configuration value to setup.cfg.
    
    Args:
        section: Configuration section (e.g., "user", "gc")
        key: Configuration key (e.g., "name", "reflog.expire.days")
        value: Configuration value
        
    Returns:
        True if successful, False otherwise
    """
    setup_cfg_path = get_setup_cfg_path()
    setup_cfg_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        config = configparser.ConfigParser()
        
        # Read existing config if it exists
        if setup_cfg_path.exists():
            config.read(setup_cfg_path)
        
        # Ensure section exists
        if section not in config:
            config.add_section(section)
        
        # Set the value
        config[section][key] = str(value)
        
        # Write back to file
        with open(setup_cfg_path, 'w') as f:
            config.write(f)
        
        return True
    except Exception:
        return False


def get_config_value(section: str, key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get a configuration value from setup.cfg.
    
    Args:
        section: Configuration section (e.g., "user", "gc")
        key: Configuration key (e.g., "name", "reflog.expire.days")
        default: Default value if not found
        
    Returns:
        Configuration value or default
    """
    setup_cfg_path = get_setup_cfg_path()
    
    if not setup_cfg_path.exists():
        return default
    
    try:
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        
        if section in config and key in config[section]:
            return config[section][key].strip()
        
        return default
    except Exception:
        return default


def get_user_config() -> Dict[str, str]:
    """
    Get user configuration from setup.cfg.
    
    Returns:
        Dictionary with user.name and user.email
    """
    return {
        "name": get_config_value("user", "name", ""),
        "email": get_config_value("user", "email", ""),
    }


def get_gc_config() -> Dict[str, Any]:
    """
    Get garbage collection configuration from ~/.dfm/setup.cfg [gc].
    Shared with the GUI.
    """
    enabled_raw = get_config_value("gc", "enabled", "false") or "false"
    schedule_raw = get_config_value("gc", "schedule.enabled")
    if schedule_raw is None or schedule_raw == "":
        schedule_raw = enabled_raw
    return {
        "enabled": _parse_cfg_bool(enabled_raw),
        "schedule_enabled": _parse_cfg_bool(schedule_raw),
        "reflog_expire_days": _parse_cfg_int("gc", "reflog.expire.days", 90, 1, 3650),
        "interval_days": _parse_cfg_int("gc", "interval.day", 7, 1, 365),
        "schedule_hour": _parse_cfg_int("gc", "schedule.hour", 7, 0, 23),
        "schedule_minute": _parse_cfg_int("gc", "schedule.minute", 0, 0, 59),
        "last_run": _parse_cfg_int("gc", "last.run", 0, 0, 4102444800),
    }


def parse_schedule_time(value: str) -> Tuple[int, int]:
    """Parse HH:MM from Settings Time (24 h). Invalid input becomes 07:00."""
    parts = (value or "").strip().split(":")
    if len(parts) != 2:
        return 7, 0
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        return 7, 0
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        return 7, 0
    return hour, minute


def save_gc_config(
    enabled: Optional[bool] = None,
    reflog_expire_days: Optional[int] = None,
    schedule_enabled: Optional[bool] = None,
    interval_days: Optional[int] = None,
    schedule_hour: Optional[int] = None,
    schedule_minute: Optional[int] = None,
    last_run: Optional[int] = None,
) -> bool:
    """Write shared [gc] keys. Omitted fields keep their current cfg values."""
    current = get_gc_config()
    if enabled is not None:
        current["enabled"] = bool(enabled)
    if reflog_expire_days is not None:
        current["reflog_expire_days"] = int(reflog_expire_days)
    if schedule_enabled is not None:
        current["schedule_enabled"] = bool(schedule_enabled)
    if interval_days is not None:
        current["interval_days"] = int(interval_days)
    if schedule_hour is not None:
        current["schedule_hour"] = int(schedule_hour)
    if schedule_minute is not None:
        current["schedule_minute"] = int(schedule_minute)
    if last_run is not None:
        current["last_run"] = int(last_run)

    success = True
    success = save_config("gc", "enabled", "true" if current["enabled"] else "false") and success
    success = save_config("gc", "reflog.expire.days", str(current["reflog_expire_days"])) and success
    success = save_config("gc", "schedule.enabled", "true" if current["schedule_enabled"] else "false") and success
    success = save_config("gc", "interval.day", str(current["interval_days"])) and success
    success = save_config("gc", "schedule.hour", str(current["schedule_hour"])) and success
    success = save_config("gc", "schedule.minute", str(current["schedule_minute"])) and success
    if current["last_run"] > 0:
        success = save_config("gc", "last.run", str(current["last_run"])) and success
    else:
        success = delete_config("gc", "last.run") and success
    return success


def _parse_cfg_bool(value: Optional[str]) -> bool:
    if value is None:
        return False
    return value.strip().lower() in ("1", "true", "yes", "on")


def _parse_cfg_int(section: str, key: str, default: int, min_value: int, max_value: int) -> int:
    raw = get_config_value(section, key, str(default)) or str(default)
    try:
        n = int(raw.strip())
    except ValueError:
        return default
    if n < min_value:
        return min_value
    if n > max_value:
        return max_value
    return n


def delete_config(section: str, key: str) -> bool:
    """Remove a key from setup.cfg. Missing key is success."""
    setup_cfg_path = get_setup_cfg_path()
    try:
        if not setup_cfg_path.exists():
            return True
        config = configparser.ConfigParser()
        config.read(setup_cfg_path)
        if section not in config or key not in config[section]:
            return True
        del config[section][key]
        with open(setup_cfg_path, "w") as f:
            config.write(f)
        return True
    except Exception:
        return False


def save_user_config(name: str, email: str) -> bool:
    """
    Save user configuration to setup.cfg.
    
    Args:
        name: User name
        email: User email
        
    Returns:
        True if successful, False otherwise
    """
    success = True
    success = save_config("user", "name", name) and success
    success = save_config("user", "email", email) and success
    return success


def get_blender_executable() -> Optional[str]:
    """Path to the Blender executable from ~/.dfm/setup.cfg [blender] path."""
    return get_config_value("blender", "path")
