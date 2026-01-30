"""
Syntax highlighting utilities using Pygments.
"""

from pathlib import Path
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer_for_filename, TextLexer
from pygments.formatters import HtmlFormatter
import re


class SyntaxHighlighter:
    """Handles syntax highlighting for code files."""
    
    # Language mapping from file extension to Pygments lexer name
    LANGUAGE_MAP = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'cpp',
        '.hpp': 'cpp',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.sh': 'bash',
        '.bat': 'batch',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.json': 'json',
        '.xml': 'xml',
        '.html': 'html',
        '.css': 'css',
        '.sql': 'sql',
        '.ini': 'ini',
        '.cfg': 'ini',
        '.conf': 'ini',
        '.toml': 'toml',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.rst': 'rst',
        '.log': 'text',
        '.txt': 'text',
        '.qml': 'qml',
        '.qrc': 'xml',
        '.cmake': 'cmake',
        '.makefile': 'make',
        '.mk': 'make',
    }
    
    @staticmethod
    def detect_language(file_path):
        """Detect programming language from file extension.
        
        Args:
            file_path: Path to the file
            
        Returns:
            str: Language name for Pygments lexer
        """
        ext = Path(file_path).suffix.lower()
        return SyntaxHighlighter.LANGUAGE_MAP.get(ext, 'text')
    
    @staticmethod
    def highlight_code(code, language, file_path, style='monokai'):
        """Apply syntax highlighting to code.
        
        Args:
            code: Source code text
            language: Language name for lexer
            file_path: File path for better lexer detection
            style: Pygments style name (default: 'monokai')
            
        Returns:
            tuple: (highlighted_html, detected_language)
        """
        # Try to guess lexer from filename first
        try:
            lexer = guess_lexer_for_filename(file_path, code)
            detected_lang = language
        except:
            try:
                # Fall back to language name
                if language != 'text':
                    lexer = get_lexer_by_name(language)
                    detected_lang = language
                else:
                    lexer = TextLexer()
                    detected_lang = 'text'
            except:
                # Final fallback
                lexer = TextLexer()
                detected_lang = 'text'
        
        # Create HTML formatter with specified style
        # Try to use requested style, fallback to 'default' if not available
        try:
            formatter = HtmlFormatter(
                style=style,
                noclasses=True,   # Inline styles
                nowrap=False,     # Allow line breaks
            )
        except Exception as e:
            # Fallback to default style if requested style is not available
            print(f"Warning: Style '{style}' not found, using 'default' instead. Error: {e}")
            formatter = HtmlFormatter(
                style='default',
                noclasses=True,
                nowrap=False,
            )
        
        highlighted = highlight(code, lexer, formatter)
        
        # Extract HTML content from wrapper tags
        # Pygments wraps output in <div class="highlight"><pre><code>...</code></pre></div>
        highlighted = re.sub(r'<div[^>]*>', '', highlighted)
        highlighted = re.sub(r'</div>', '', highlighted)
        highlighted = re.sub(r'<pre[^>]*>', '', highlighted)
        highlighted = re.sub(r'</pre>', '', highlighted)
        highlighted = re.sub(r'<code[^>]*>', '', highlighted)
        highlighted = re.sub(r'</code>', '', highlighted)
        
        # Replace newlines with <br/> for QML RichText
        highlighted = highlighted.replace('\n', '<br/>')
        
        return highlighted, detected_lang