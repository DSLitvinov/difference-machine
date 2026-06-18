"""
File metadata extraction and formatting utilities.
"""

from pathlib import Path
from datetime import datetime
import mimetypes
from PyQt6.QtGui import QImage


class FileMetadata:
    """Handles file metadata extraction and formatting."""
    
    def __init__(self, file_path):
        """Initialize metadata for a file.
        
        Args:
            file_path: Path to the file
        """
        self.file_path = Path(file_path)
        # Defaults when file does not exist (avoid AttributeError in to_dict)
        self.name = self.file_path.name
        self.size_bytes = 0
        self.size_formatted = "0 B"
        self.modified_date = ""
        self.created_date = ""
        self.mime_type = "unknown"
        self.image_width = 0
        self.image_height = 0
        self._load_metadata()
    
    def _load_metadata(self):
        """Load all metadata from the file. Only regular files are read; directories keep default values."""
        if not self.file_path.exists() or not self.file_path.is_file():
            return
        
        stat_info = self.file_path.stat()
        
        # Basic info
        self.name = self.file_path.name
        self.size_bytes = stat_info.st_size
        self.size_formatted = self._format_file_size(self.size_bytes)
        
        # Dates
        self.modified_date = datetime.fromtimestamp(stat_info.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        try:
            self.created_date = datetime.fromtimestamp(stat_info.st_birthtime).strftime("%Y-%m-%d %H:%M:%S")
        except AttributeError:
            # Linux doesn't have birthtime, use ctime
            self.created_date = datetime.fromtimestamp(stat_info.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
        
        # MIME type
        mime_type, _ = mimetypes.guess_type(str(self.file_path))
        self.mime_type = mime_type or "unknown"
        
        # Image dimensions (if applicable)
        self.image_width = 0
        self.image_height = 0
        self._load_image_dimensions()
    
    def _load_image_dimensions(self):
        """Load image dimensions if file is an image."""
        try:
            image = QImage(str(self.file_path))
            if not image.isNull():
                self.image_width = image.width()
                self.image_height = image.height()
        except Exception:
            pass
    
    @staticmethod
    def _format_file_size(size_bytes):
        """Format file size in human-readable format.
        
        Args:
            size_bytes: Size in bytes
            
        Returns:
            str: Formatted size string (e.g., "1.5 MB")
        """
        if size_bytes == 0:
            return "0 B"
        
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    def get_text_metadata(self, content):
        """Get metadata specific to text files.
        
        Args:
            content: File content as string
            
        Returns:
            dict: Dictionary with text-specific metadata
        """
        lines = content.split('\n')
        return {
            'line_count': len(lines),
            'encoding': 'UTF-8',  # Default encoding used for reading
        }
    
    def to_dict(self):
        """Convert metadata to dictionary.
        
        Returns:
            dict: Dictionary with all metadata
        """
        return {
            'name': self.name,
            'path': str(self.file_path.absolute()),
            'size_bytes': self.size_bytes,
            'size_formatted': self.size_formatted,
            'modified_date': self.modified_date,
            'created_date': self.created_date,
            'mime_type': self.mime_type,
            'image_width': self.image_width,
            'image_height': self.image_height,
        }