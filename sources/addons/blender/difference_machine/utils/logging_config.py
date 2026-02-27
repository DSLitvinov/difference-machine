"""
Logging configuration for Difference Machine add-on.
"""

import logging
import sys
from pathlib import Path
from typing import Optional


def setup_logging(log_level: int = logging.INFO, log_file: Optional[Path] = None) -> None:
    """
    Setup logging configuration for the add-on.
    
    Args:
        log_level: Logging level (default: INFO)
        log_file: Optional path to log file
    """
    # Create logger
    logger = logging.getLogger('difference_machine')
    logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    # Prevent propagation to root logger
    logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.
    
    Args:
        name: Module name (usually __name__)
        
    Returns:
        Logger instance
    """
    # Ensure main logger exists
    main_logger = logging.getLogger('difference_machine')
    if not main_logger.handlers:
        setup_logging()
    
    # Return module-specific logger
    return logging.getLogger(f'difference_machine.{name}')




