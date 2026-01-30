"""
File Management for handling directory selection and file tree display.
"""

from pathlib import Path
import os
import fnmatch
from PyQt6.QtCore import QObject, pyqtSignal, pyqtProperty, pyqtSlot, QAbstractItemModel, QModelIndex, Qt, QByteArray
from PyQt6.QtWidgets import QFileDialog, QApplication
from .file_icons import get_file_icon


def find_repository_root(start_path):
    """Find repository root by looking for .DFM directory."""
    path = Path(start_path).resolve()
    while path != path.parent:
        dfm_dir = path / ".DFM"
        if dfm_dir.exists() and dfm_dir.is_dir():
            return path
        path = path.parent
    return None


class DfmIgnorePatterns:
    """Manages .dfmignore patterns for filtering files."""
    
    def __init__(self):
        self.patterns = []
        self.repo_root = None
    
    def load_from_repo(self, repo_root):
        """Load patterns from .dfmignore file in repository root."""
        self.repo_root = Path(repo_root) if repo_root else None
        self.patterns = []
        
        if not self.repo_root:
            return
        
        dfmignore_path = self.repo_root / ".dfmignore"
        if not dfmignore_path.exists() or not dfmignore_path.is_file():
            return
        
        try:
            with open(dfmignore_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    self.patterns.append(line)
        except (OSError, IOError):
            pass
    
    def should_ignore(self, file_path, repo_root=None):
        """Check if a file or directory should be ignored."""
        if not self.repo_root and repo_root:
            self.load_from_repo(repo_root)
        
        if not self.repo_root:
            return False
        
        # Always ignore .dfmignore file itself
        if file_path.name == ".dfmignore":
            return True
        
        # Always ignore .DFM directory
        if file_path.name == ".DFM":
            return True
        
        # Get relative path from repository root
        try:
            rel_path = file_path.relative_to(self.repo_root)
            rel_path_str = str(rel_path).replace(os.sep, '/')
        except ValueError:
            # Path is not under repo root
            return False
        
        # Check each pattern
        for pattern in self.patterns:
            if self._matches_pattern(pattern, rel_path_str, file_path.is_dir()):
                return True
        
        return False
    
    def _matches_pattern(self, pattern, path, is_dir):
        """Check if path matches pattern."""
        # Normalize path separators
        pattern = pattern.replace('\\', '/')
        
        # Directory pattern (ends with /)
        if pattern.endswith('/'):
            pattern = pattern[:-1]
            if not is_dir:
                return False
        
        # Absolute pattern (starts with /)
        if pattern.startswith('/'):
            pattern = pattern[1:]
            # Match from root
            return fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(path, pattern + '/*')
        
        # Relative pattern - check if any part matches
        path_parts = path.split('/')
        pattern_parts = pattern.split('/')
        
        # Simple wildcard matching
        if '*' in pattern or '?' in pattern:
            # Check if pattern matches the path or any part of it
            if fnmatch.fnmatch(path, pattern):
                return True
            # Check if pattern matches any segment
            for part in path_parts:
                if fnmatch.fnmatch(part, pattern):
                    return True
            # Check if pattern matches a subpath
            for i in range(len(path_parts)):
                subpath = '/'.join(path_parts[i:])
                if fnmatch.fnmatch(subpath, pattern):
                    return True
        else:
            # Exact match
            if pattern in path_parts:
                return True
            # Subpath match
            if pattern in path:
                return True
        
        return False


class FileSystemNode:
    """Represents a node in the file system tree."""
    
    # Shared ignore patterns instance
    _ignore_patterns = DfmIgnorePatterns()
    _repo_root = None
    
    def __init__(self, path, parent=None):
        self.path = Path(path)
        self.parent_node = parent
        self.children = []
        self._loaded = False
        self._has_children_cached = None
        self._is_dir_cached = None  # Cache is_dir() result
        
        # Initialize ignore patterns if we have a repo root
        if parent is None:
            # This is root node, find repository root
            repo_root = find_repository_root(self.path)
            if repo_root:
                FileSystemNode._repo_root = repo_root
                FileSystemNode._ignore_patterns.load_from_repo(repo_root)
    
    def is_dir_cached(self):
        """Get cached is_dir() result."""
        if self._is_dir_cached is None:
            self._is_dir_cached = self.path.is_dir()
        return self._is_dir_cached
    
    def has_children_fast(self):
        """Quick check if directory has children without loading them."""
        if self._has_children_cached is not None:
            return self._has_children_cached
        
        if not self.is_dir_cached():
            self._has_children_cached = False
            return False
        
        try:
            # Use os.scandir() for faster directory scanning
            # It's more efficient than pathlib.iterdir() for this use case
            with os.scandir(self.path) as entries:
                first_item = next(entries, None)
                self._has_children_cached = first_item is not None
            return self._has_children_cached
        except (PermissionError, OSError):
            self._has_children_cached = False
            return False
    
    def load_children(self):
        """Load children nodes (directories only for now)."""
        if self._loaded:
            return
        
        # Mark as loading to prevent recursive calls
        self._loaded = True
        
        try:
            if self.is_dir_cached():
                # Use os.scandir() for better performance - it's faster than pathlib
                dirs = []
                files = []
                
                with os.scandir(self.path) as entries:
                    for entry in entries:
                        try:
                            entry_path = Path(entry.path)
                            
                            # Check if should be ignored
                            if FileSystemNode._ignore_patterns.should_ignore(entry_path, FileSystemNode._repo_root):
                                continue
                            
                            if entry.is_dir(follow_symlinks=False):
                                dirs.append(entry_path)
                            elif entry.is_file(follow_symlinks=False):
                                files.append(entry_path)
                        except (OSError, PermissionError):
                            # Skip entries that can't be accessed
                            continue
                
                # Sort directories and files separately for better performance
                # Directories first, then files, both sorted by name
                # Use case-insensitive sort for better UX
                dirs.sort(key=lambda x: x.name.lower())
                files.sort(key=lambda x: x.name.lower())
                
                # Pre-allocate list size for better performance
                self.children = [None] * (len(dirs) + len(files))
                idx = 0
                
                # Add directories first, then files
                for item in dirs:
                    node = FileSystemNode(item, self)
                    self.children[idx] = node
                    idx += 1
                
                for item in files:
                    node = FileSystemNode(item, self)
                    self.children[idx] = node
                    idx += 1
        except (PermissionError, OSError):
            self.children = []
        
        # Update cache after loading
        self._has_children_cached = len(self.children) > 0
    
    def row(self):
        """Return the row number of this node in its parent."""
        if self.parent_node:
            return self.parent_node.children.index(self)
        return 0
    
    def child_count(self):
        """Return the number of children."""
        if not self._loaded:
            self.load_children()
        return len(self.children)
    
    def child(self, row):
        """Return the child at the given row."""
        if not self._loaded:
            self.load_children()
        if 0 <= row < len(self.children):
            return self.children[row]
        return None


class FileSystemModel(QAbstractItemModel):
    """Model for displaying file system tree in QML."""
    
    # Role names for QML
    DisplayRole = Qt.ItemDataRole.DisplayRole
    PathRole = Qt.ItemDataRole.UserRole
    IsDirRole = Qt.ItemDataRole.UserRole + 1
    IconTypeRole = Qt.ItemDataRole.UserRole + 2
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.root_node = None
        self.root_path = None
    
    def roleNames(self):
        """Return role names for QML."""
        roles = {
            Qt.ItemDataRole.DisplayRole: QByteArray(b"display"),
            Qt.ItemDataRole.UserRole: QByteArray(b"path"),
            Qt.ItemDataRole.UserRole + 1: QByteArray(b"isDir"),
            Qt.ItemDataRole.UserRole + 2: QByteArray(b"iconType")
        }
        return roles
    
    def set_root_path(self, path):
        """Set the root path for the tree."""
        self.beginResetModel()
        if path:
            self.root_path = Path(path)
            self.root_node = FileSystemNode(self.root_path)
            self.root_node.load_children()
        else:
            self.root_node = None
        self.endResetModel()
    
    def index(self, row, column, parent=QModelIndex()):
        """Create an index for the given row, column, and parent."""
        if not self.hasIndex(row, column, parent):
            return QModelIndex()
        
        if not parent.isValid():
            parent_node = self.root_node
        else:
            parent_node = parent.internalPointer()
        
        child_node = parent_node.child(row)
        if child_node:
            return self.createIndex(row, column, child_node)
        return QModelIndex()
    
    def parent(self, index):
        """Return the parent of the given index."""
        if not index.isValid():
            return QModelIndex()
        
        child_node = index.internalPointer()
        parent_node = child_node.parent_node
        
        if parent_node is None or parent_node == self.root_node:
            return QModelIndex()
        
        return self.createIndex(parent_node.row(), 0, parent_node)
    
    def rowCount(self, parent=QModelIndex()):
        """Return the number of rows under the given parent."""
        if parent.column() > 0:
            return 0
        
        if not parent.isValid():
            parent_node = self.root_node
        else:
            parent_node = parent.internalPointer()
        
        if parent_node:
            # Only load children if node is actually expanded
            # This prevents loading all nodes upfront
            return parent_node.child_count()
        return 0
    
    def columnCount(self, parent=QModelIndex()):
        """Return the number of columns."""
        return 1
    
    def data(self, index, role=Qt.ItemDataRole.DisplayRole):
        """Return the data for the given role."""
        if not index.isValid():
            return None
        
        node = index.internalPointer()
        if not node:
            return None
        
        # Cache path string to avoid repeated conversions
        path_str = str(node.path)
        
        if role == Qt.ItemDataRole.DisplayRole:
            return node.path.name
        elif role == Qt.ItemDataRole.UserRole:  # Full path
            return path_str
        elif role == Qt.ItemDataRole.UserRole + 1:  # Is directory
            return node.is_dir_cached()
        elif role == Qt.ItemDataRole.UserRole + 2:  # Icon type
            return get_file_icon(node.path)
        
        return None
    
    def hasChildren(self, parent=QModelIndex()):
        """Check if the parent has children."""
        if not parent.isValid():
            return self.root_node is not None and self.root_node.has_children_fast()
        
        node = parent.internalPointer()
        if node:
            return node.has_children_fast()
        return False


class FileManager(QObject):
    """Manages file operations and directory selection."""
    
    # Signal emitted when a directory is selected
    directorySelected = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._current_directory = ""
        self._file_system_model = FileSystemModel(self)
    
    @pyqtProperty(str, notify=directorySelected)
    def currentDirectory(self):
        """Get the current directory path."""
        return self._current_directory
    
    @pyqtProperty(QAbstractItemModel, constant=False, notify=directorySelected)
    def fileSystemModel(self):
        """Get the file system model."""
        return self._file_system_model
    
    @pyqtSlot()
    def openDirectoryDialog(self):
        """Open a directory selection dialog."""
        app = QApplication.instance()
        if not app:
            return
        
        directory = QFileDialog.getExistingDirectory(
            None,
            "Выберите директорию",
            self._current_directory if self._current_directory else str(Path.home()),
            QFileDialog.Option.ShowDirsOnly
        )
        
        if directory:
            self._current_directory = directory
            self._file_system_model.set_root_path(directory)
            self.directorySelected.emit(directory)

    @pyqtSlot()
    def refreshModel(self):
        """Refresh the file system model for the current directory."""
        if not self._current_directory:
            return
        self._file_system_model.set_root_path(self._current_directory)
        self.directorySelected.emit(self._current_directory)