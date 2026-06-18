"""
File Viewer for reading and displaying file contents.
"""

from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSignal, pyqtProperty, pyqtSlot, QUrl
import mimetypes
import subprocess
import sys
from .file_metadata import FileMetadata
from .syntax_highlighter import SyntaxHighlighter
# Import from repository module - use absolute import from package root
# This matches the import style used in main.py
from repository.config_loader import get_blender_path


class FileViewer(QObject):
    """Manages file viewing operations."""
    
    # Signals
    fileLoaded = pyqtSignal(str, str)  # path, file_type
    fileError = pyqtSignal(str)  # error_message
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._file_path = ""
        self._file_content = ""
        self._file_type = ""
        self._file_url = ""
        self._file_language = ""
        self._highlighted_html = ""
        self._syntax_style = "native"
        
        # Metadata properties
        self._file_name = ""
        self._file_size = ""
        self._modified_date = ""
        self._created_date = ""
        self._mime_type = ""
        self._line_count = 0
        self._encoding = ""
        self._image_width = 0
        self._image_height = 0
        self._blender_path = get_blender_path() or ""
        
        self._metadata = None
    
    # Content properties
    @pyqtProperty(str, notify=fileLoaded)
    def filePath(self):
        """Get the current file path."""
        return self._file_path
    
    @pyqtProperty(str, notify=fileLoaded)
    def fileContent(self):
        """Get the file content (for text files)."""
        return self._file_content
    
    @pyqtProperty(str, notify=fileLoaded)
    def fileType(self):
        """Get the file type (text, image, gif)."""
        return self._file_type
    
    @pyqtProperty(str, notify=fileLoaded)
    def fileUrl(self):
        """Get the file URL (for images and GIFs)."""
        return self._file_url
    
    @pyqtProperty(str, notify=fileLoaded)
    def fileLanguage(self):
        """Get the detected programming language."""
        return self._file_language
    
    @pyqtProperty(str, notify=fileLoaded)
    def highlightedHtml(self):
        """Get the HTML with syntax highlighting."""
        return self._highlighted_html
    
    @pyqtProperty(str)
    def syntaxStyle(self):
        """Get the current syntax highlighting style."""
        return self._syntax_style
    
    @syntaxStyle.setter
    def syntaxStyle(self, style):
        """Set the syntax highlighting style."""
        if style and style != self._syntax_style:
            self.setSyntaxStyle(style)
    
    # Metadata properties
    @pyqtProperty(str, notify=fileLoaded)
    def fileName(self):
        """Get the file name without path."""
        return self._file_name
    
    @pyqtProperty(str, notify=fileLoaded)
    def fileSize(self):
        """Get the formatted file size."""
        return self._file_size
    
    @pyqtProperty(str, notify=fileLoaded)
    def modifiedDate(self):
        """Get the file modification date."""
        return self._modified_date
    
    @pyqtProperty(str, notify=fileLoaded)
    def createdDate(self):
        """Get the file creation date."""
        return self._created_date
    
    @pyqtProperty(str, notify=fileLoaded)
    def mimeType(self):
        """Get the MIME type."""
        return self._mime_type
    
    @pyqtProperty(int, notify=fileLoaded)
    def lineCount(self):
        """Get the line count (for text files)."""
        return self._line_count
    
    @pyqtProperty(str, notify=fileLoaded)
    def encoding(self):
        """Get the file encoding."""
        return self._encoding
    
    @pyqtProperty(int, notify=fileLoaded)
    def imageWidth(self):
        """Get image width (for images)."""
        return self._image_width
    
    @pyqtProperty(int, notify=fileLoaded)
    def imageHeight(self):
        """Get image height (for images)."""
        return self._image_height

    @pyqtProperty(str, notify=fileLoaded)
    def blenderPath(self):
        """Get Blender editor path from settings."""
        return self._blender_path
    
    @pyqtSlot(str)
    def loadFile(self, path, style=None):
        """Load a file for viewing.
        
        Args:
            path: Path to the file to load
            style: Optional Pygments style name (e.g., 'monokai', 'github')
        """
        if not path:
            return
        
        # Update syntax style if provided
        if style:
            self._syntax_style = style
        
        try:
            file_path = Path(path)
            
            if not file_path.exists():
                self.fileError.emit(f"File not found: {path}")
                return
            
            if not file_path.is_file():
                self.fileError.emit(f"Path is not a file: {path}")
                return
            
            self._file_path = str(file_path.absolute())
            self._file_type = self.getFileType(self._file_path)
            self._blender_path = get_blender_path() or ""
            
            # Load metadata
            try:
                self._metadata = FileMetadata(self._file_path)
                self._file_name = self._metadata.name
                self._file_size = self._metadata.size_formatted
                self._modified_date = self._metadata.modified_date
                self._created_date = self._metadata.created_date
                self._mime_type = self._metadata.mime_type
                self._image_width = self._metadata.image_width
                self._image_height = self._metadata.image_height
            except Exception as e:
                import traceback
                traceback.print_exc()
                raise
            
            # Load content based on file type
            if self._file_type == "text":
                try:
                    # Try to read as text with UTF-8
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                    
                    self._file_content = content
                    
                    # Get text-specific metadata
                    text_meta = self._metadata.get_text_metadata(content)
                    self._line_count = text_meta['line_count']
                    self._encoding = text_meta['encoding']
                    
                    # Detect language and apply syntax highlighting
                    try:
                        language = SyntaxHighlighter.detect_language(self._file_path)
                        self._highlighted_html, self._file_language = SyntaxHighlighter.highlight_code(
                            content, language, self._file_path, style=self._syntax_style
                        )
                    except Exception as highlight_error:
                        # If syntax highlighting fails, use plain text
                        self._highlighted_html = ""
                        self._file_language = SyntaxHighlighter.detect_language(self._file_path)
                    
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    self.fileError.emit(f"Error reading file: {str(e)}")
                    return
                self._file_url = ""
            elif self._file_type in ["image", "gif"]:
                # For images, use file:// URL (normalized absolute path for frozen/installed app)
                abs_path = str(Path(self._file_path).resolve())
                self._file_url = QUrl.fromLocalFile(abs_path).toString()
                self._file_content = ""
                self._highlighted_html = ""
                self._file_language = ""
                self._line_count = 0
                self._encoding = ""
            else:
                # Binary or unsupported files: show metadata and placeholder
                self._file_url = ""
                self._file_content = ""
                self._highlighted_html = ""
                self._file_language = ""
                self._line_count = 0
                self._encoding = ""
            
            # Emit signal
            self.fileLoaded.emit(self._file_path, self._file_type)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.fileError.emit(f"Error loading file: {str(e)}")

    @pyqtSlot()
    def clear(self):
        """Clear the current file and reset all metadata."""
        self._file_path = ""
        self._file_content = ""
        self._file_type = ""
        self._file_url = ""
        self._file_language = ""
        self._highlighted_html = ""
        self._file_name = ""
        self._file_size = ""
        self._modified_date = ""
        self._created_date = ""
        self._mime_type = ""
        self._line_count = 0
        self._encoding = ""
        self._image_width = 0
        self._image_height = 0
        self._metadata = None
        self.fileLoaded.emit("", "")

    @pyqtSlot(result=bool)
    def openInBlender(self):
        """Open the current .blend file in Blender."""
        if not self._file_path or not self._file_path.lower().endswith(".blend"):
            return False

        blender_path = get_blender_path()
        if not blender_path:
            return False

        self._blender_path = blender_path
        try:
            if sys.platform == "darwin" and blender_path.lower().endswith(".app"):
                subprocess.Popen(["open", "-n", "-a", blender_path, self._file_path])
            else:
                subprocess.Popen([blender_path, self._file_path])
            return True
        except Exception:
            return False
    
    @pyqtSlot(str)
    def setSyntaxStyle(self, style):
        """Set the syntax highlighting style.
        
        Args:
            style: Pygments style name (e.g., 'monokai', 'github')
        """
        if style and style != self._syntax_style:
            self._syntax_style = style
            # Re-highlight current file if it's a text file
            if self._file_type == "text" and self._file_content:
                try:
                    language = SyntaxHighlighter.detect_language(self._file_path)
                    self._highlighted_html, _ = SyntaxHighlighter.highlight_code(
                        self._file_content, language, self._file_path, style=self._syntax_style
                    )
                    # Emit signal to update UI
                    self.fileLoaded.emit(self._file_path, self._file_type)
                except Exception as e:
                    # Silently fail - style might be invalid
                    pass
    
    def getFileType(self, path):
        """Determine the file type based on extension and MIME type.
        
        Args:
            path: Path to the file
            
        Returns:
            str: File type ('text', 'image', 'gif', or 'binary')
        """
        if not path:
            return "binary"
        
        file_path = Path(path)
        ext = file_path.suffix.lower()
        
        # GIF files
        if ext == '.gif':
            return "gif"
        
        # Image files
        image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif']
        if ext in image_extensions:
            return "image"
        
        # Text files - check MIME type and common extensions
        text_extensions = [
            '.txt', '.md', '.markdown', '.rst', '.log', '.readme',
            '.py', '.js', '.ts', '.cpp', '.c', '.h', '.java', '.go', '.rs',
            '.sh', '.bat', '.yml', '.yaml', '.json', '.xml', '.html', '.css',
            '.sql', '.ini', '.cfg', '.conf', '.toml', '.csv'
        ]
        
        if ext in text_extensions:
            return "text"
        
        # Try MIME type detection
        mime_type, _ = mimetypes.guess_type(path)
        if mime_type:
            if mime_type.startswith('text/'):
                return "text"
            elif mime_type.startswith('image/'):
                if mime_type == 'image/gif':
                    return "gif"
                return "image"
        
        # Default: try to read as text (for files without extension)
        try:
            with open(file_path, 'r', encoding='utf-8', errors='strict') as f:
                f.read(1024)  # Try to read first 1KB
            return "text"
        except:
            return "binary"