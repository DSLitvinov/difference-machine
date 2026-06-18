"""
Branch Model for representing branches.
"""

from PyQt6.QtCore import QObject, pyqtProperty


class BranchModel(QObject):
    """Model for a branch."""
    
    def __init__(self, branch_data: dict = None, parent=None):
        super().__init__(parent)
        if branch_data:
            self._name = branch_data.get('name', '')
            self._commit_hash = branch_data.get('commit_hash', '')
            self._is_current = branch_data.get('is_current', False)
        else:
            self._name = ''
            self._commit_hash = ''
            self._is_current = False
    
    @pyqtProperty(str)
    def name(self):
        return self._name
    
    @pyqtProperty(str)
    def commitHash(self):
        return self._commit_hash
    
    @pyqtProperty(bool)
    def isCurrent(self):
        return self._is_current