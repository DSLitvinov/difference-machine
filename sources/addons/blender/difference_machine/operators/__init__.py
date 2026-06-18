"""
Operators module for Difference Machine addon.
"""

from . import init_operators
from . import commit_operators
from . import history_operators
from . import gc_operators
from . import lock_operators
from . import branch_operators
from . import config_operators
from . import mark_operators

__all__ = [
    'init_operators',
    'commit_operators',
    'history_operators',
    'gc_operators',
    'lock_operators',
    'branch_operators',
    'config_operators',
    'mark_operators',
]


def register():
    """Register all operator classes."""
    init_operators.register()
    commit_operators.register()
    history_operators.register()
    gc_operators.register()
    lock_operators.register()
    branch_operators.register()
    config_operators.register()
    mark_operators.register()


def unregister():
    """Unregister all operator classes."""
    mark_operators.unregister()
    config_operators.unregister()
    lock_operators.unregister()
    gc_operators.unregister()
    branch_operators.unregister()
    history_operators.unregister()
    commit_operators.unregister()
    init_operators.unregister()
