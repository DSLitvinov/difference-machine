"""
Configuration loader for Difference Machine addon.
"""

import configparser
from pathlib import Path
from typing import Optional, Dict, Any


def _get_addon_api_dir() -> Path:
    """Single source for API location: addon api/ (library and api/python/ bindings)."""
    addon_root = Path(__file__).resolve().parent.parent
    return addon_root / "api"


def get_api_library_path() -> Optional[str]:
    """Forester API library — только из addon api/."""
    api_dir = _get_addon_api_dir()
    if not api_dir.exists():
        return None
    for name in ("libforester.so", "libforester.dylib", "forester.dll"):
        p = api_dir / name
        if p.exists() and p.is_file():
            return str(p.absolute())
    return None


def get_python_bindings_path() -> Optional[str]:
    """Forester Python bindings — только из addon api/python/."""
    bindings = _get_addon_api_dir() / "python"
    if bindings.exists() and bindings.is_dir() and (bindings / "python_bindings_structured.py").exists():
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
    Get garbage collection configuration from setup.cfg.
    
    Returns:
        Dictionary with GC settings
    """
    return {
        "reflog_expire_days": int(get_config_value("gc", "reflog.expire.days", "90") or "90"),
        "interval_days": int(get_config_value("gc", "interval.day", "7") or "7"),
    }


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


def save_gc_config(reflog_expire_days: int, interval_days: int) -> bool:
    """
    Save garbage collection configuration to setup.cfg.
    
    Args:
        reflog_expire_days: Days to keep commits in reflog
        interval_days: Days between GC runs
        
    Returns:
        True if successful, False otherwise
    """
    success = True
    success = save_config("gc", "reflog.expire.days", str(reflog_expire_days)) and success
    success = save_config("gc", "interval.day", str(interval_days)) and success
    return success
