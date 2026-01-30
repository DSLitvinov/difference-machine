"""
Parser for unified diff format to extract old and new file contents.
"""

import re
from typing import Optional, Tuple


def parse_unified_diff(diff_text: str) -> Optional[Tuple[str, str]]:
    """
    Parse unified diff to extract old and new file contents.
    
    Args:
        diff_text: Unified diff text
        
    Returns:
        Tuple of (old_content, new_content) or None if parsing fails
    """
    if not diff_text or not diff_text.strip():
        return None
    
    lines = diff_text.splitlines(keepends=True)
    old_lines = []
    new_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip header lines (---, +++, @@)
        if line.startswith('---') or line.startswith('+++') or line.startswith('@@'):
            i += 1
            continue
        
        # Process diff lines
        if line.startswith('-') and not line.startswith('---'):
            # Removed line (but not header)
            old_lines.append(line[1:])  # Remove '-' prefix
            i += 1
        elif line.startswith('+') and not line.startswith('+++'):
            # Added line (but not header)
            new_lines.append(line[1:])  # Remove '+' prefix
            i += 1
        elif line.startswith(' '):
            # Unchanged line
            content = line[1:]  # Remove ' ' prefix
            old_lines.append(content)
            new_lines.append(content)
            i += 1
        else:
            # Unknown line format, skip
            i += 1
    
    old_content = ''.join(old_lines)
    new_content = ''.join(new_lines)
    
    return old_content, new_content


def extract_file_contents_from_diff(diff_text: str) -> Optional[Tuple[str, str]]:
    """
    Extract old and new file contents from unified diff.
    This is a more robust parser that handles various diff formats.
    
    Args:
        diff_text: Unified diff text
        
    Returns:
        Tuple of (old_content, new_content) or None if parsing fails
    """
    if not diff_text or not diff_text.strip():
        return None
    
    lines = diff_text.splitlines(keepends=True)
    old_lines = []
    new_lines = []
    
    # Track context for hunk headers
    in_hunk = False
    
    for line in lines:
        # Skip file headers
        if line.startswith('---') or line.startswith('+++'):
            continue
        
        # Hunk header
        if line.startswith('@@'):
            in_hunk = True
            continue
        
        if not in_hunk:
            continue
        
        # Process diff lines
        if line.startswith('-') and not line.startswith('---'):
            # Removed line
            old_lines.append(line[1:])
        elif line.startswith('+') and not line.startswith('+++'):
            # Added line
            new_lines.append(line[1:])
        elif line.startswith(' '):
            # Unchanged line (context)
            content = line[1:]
            old_lines.append(content)
            new_lines.append(content)
        elif line.startswith('\\'):
            # End of file marker
            continue
    
    old_content = ''.join(old_lines)
    new_content = ''.join(new_lines)
    
    # If we couldn't extract content, return None
    if not old_content and not new_content:
        return None
    
    return old_content, new_content
