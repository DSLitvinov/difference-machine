"""
Commit Model for representing commits.
"""

from PyQt6.QtCore import QObject, pyqtProperty
from datetime import datetime
from typing import List, Optional


class CommitModel(QObject):
    """Model for a single commit."""
    
    def __init__(self, commit_data: dict = None, parent=None):
        super().__init__(parent)
        if commit_data:
            self._hash = commit_data.get('hash', '')
            self._parent_hash = commit_data.get('parent_hash', '')
            self._parent_hashes = commit_data.get('parent_hashes', [])
            self._tree_hash = commit_data.get('tree_hash', '')
            self._author = commit_data.get('author', '')
            self._message = commit_data.get('message', '')
            self._timestamp = commit_data.get('timestamp', 0)
            self._type = commit_data.get('type', 0)
        else:
            self._hash = ''
            self._parent_hash = ''
            self._parent_hashes = []
            self._tree_hash = ''
            self._author = ''
            self._message = ''
            self._timestamp = 0
            self._type = 0
    
    @pyqtProperty(str)
    def hash(self):
        return self._hash
    
    @pyqtProperty(str)
    def parentHash(self):
        return self._parent_hash
    
    @pyqtProperty(list)
    def parentHashes(self):
        return self._parent_hashes
    
    @pyqtProperty(str)
    def treeHash(self):
        return self._tree_hash
    
    @pyqtProperty(str)
    def author(self):
        return self._author
    
    @pyqtProperty(str)
    def message(self):
        return self._message
    
    @pyqtProperty(int)
    def timestamp(self):
        return self._timestamp
    
    @pyqtProperty(str)
    def dateString(self):
        """Get formatted date string."""
        if self._timestamp:
            return datetime.fromtimestamp(self._timestamp).strftime('%Y-%m-%d %H:%M:%S')
        return ''
    
    @pyqtProperty(int)
    def type(self):
        return self._type