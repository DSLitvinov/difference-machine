"""
Error handling utilities for Difference Machine addon.
Provides consistent error handling patterns.
"""

import logging
from typing import Callable, TypeVar, Optional, Any
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


def handle_errors(
    default_return: Optional[T] = None,
    log_level: int = logging.ERROR,
    reraise: bool = False
) -> Callable:
    """
    Decorator for consistent error handling.
    
    Args:
        default_return: Value to return on error (if reraise=False)
        log_level: Logging level for errors
        reraise: If True, re-raise exception after logging
    
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., Optional[T]]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Optional[T]:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.log(
                    log_level,
                    f"Error in {func.__name__}: {e}",
                    exc_info=log_level >= logging.ERROR
                )
                if reraise:
                    raise
                return default_return
        return wrapper
    return decorator


def safe_execute(
    func: Callable[..., T],
    *args: Any,
    default: Optional[T] = None,
    log_error: bool = True,
    **kwargs: Any
) -> Optional[T]:
    """
    Safely execute a function with error handling.
    
    Args:
        func: Function to execute
        *args: Positional arguments
        default: Default value to return on error
        log_error: Whether to log errors
        **kwargs: Keyword arguments
    
    Returns:
        Function result or default value on error
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        if log_error:
            logger.error(f"Error executing {func.__name__}: {e}", exc_info=True)
        return default
