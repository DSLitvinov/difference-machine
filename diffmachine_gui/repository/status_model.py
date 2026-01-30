"""
Status Model for repository status information.
"""

from PyQt6.QtCore import QObject, pyqtSignal, pyqtProperty
from typing import List, Optional


class StatusModel(QObject):
    """Model for repository status."""
    
    statusUpdated = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._current_branch = ""
        self._head_commit = ""
        self._staged_new_files: List[str] = []
        self._staged_modified_files: List[str] = []
        self._staged_deleted_files: List[str] = []
        self._unstaged_modified_files: List[str] = []
        self._unstaged_deleted_files: List[str] = []
        self._untracked_files: List[str] = []
    
    def updateFromDict(self, status_dict: dict):
        """Update status from dictionary."""
        self._current_branch = status_dict.get('current_branch', '')
        self._head_commit = status_dict.get('head_commit', '')
        self._staged_new_files = status_dict.get('staged_new_files', [])
        self._staged_modified_files = status_dict.get('staged_modified_files', [])
        self._staged_deleted_files = status_dict.get('staged_deleted_files', [])
        self._unstaged_modified_files = status_dict.get('unstaged_modified_files', [])
        self._unstaged_deleted_files = status_dict.get('unstaged_deleted_files', [])
        self._untracked_files = status_dict.get('untracked_files', [])
        self.statusUpdated.emit()
    
    @pyqtProperty(str, notify=statusUpdated)
    def currentBranch(self):
        return self._current_branch
    
    @pyqtProperty(str, notify=statusUpdated)
    def headCommit(self):
        return self._head_commit
    
    @pyqtProperty(list, notify=statusUpdated)
    def stagedNewFiles(self):
        return self._staged_new_files
    
    @pyqtProperty(list, notify=statusUpdated)
    def stagedModifiedFiles(self):
        return self._staged_modified_files
    
    @pyqtProperty(list, notify=statusUpdated)
    def stagedDeletedFiles(self):
        return self._staged_deleted_files
    
    @pyqtProperty(list, notify=statusUpdated)
    def unstagedModifiedFiles(self):
        return self._unstaged_modified_files
    
    @pyqtProperty(list, notify=statusUpdated)
    def unstagedDeletedFiles(self):
        return self._unstaged_deleted_files
    
    @pyqtProperty(list, notify=statusUpdated)
    def untrackedFiles(self):
        return self._untracked_files
    
    @pyqtProperty(int, notify=statusUpdated)
    def totalChangedFiles(self):
        """Total number of changed files."""
        return (len(self._staged_new_files) + 
                len(self._staged_modified_files) + 
                len(self._staged_deleted_files) +
                len(self._unstaged_modified_files) + 
                len(self._unstaged_deleted_files) + 
                len(self._untracked_files))