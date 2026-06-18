"""
Diff processor using difflib for enhanced diff visualization.
"""

import difflib
import html
from typing import Tuple


class DiffProcessor:
    """Processes text diffs using difflib."""
    
    def __init__(self):
        pass
    
    def compute_line_opcodes(self, lines1: list, lines2: list) -> list:
        """Compute line-level opcodes between two lists of lines."""
        try:
            matcher = difflib.SequenceMatcher(a=lines1, b=lines2)
            return matcher.get_opcodes()
        except Exception:
            return []
    
    def diff_to_html(
        self,
        text1: str,
        text2: str,
        line_numbers: bool = True,
        theme: str = "dark"
    ) -> str:
        """
        Convert diff to HTML with syntax highlighting.
        
        Args:
            text1: Old text content
            text2: New text content
            line_numbers: Whether to show line numbers
            theme: Theme name ('dark' or 'light')
        
        Returns:
            HTML string with highlighted diff
        """
        # Obsidian-aligned palette (keep in sync with DarkTheme.qml / LightTheme.qml)
        if theme == "dark":
            bg_color = "#1e1e1e"
            text_color = "#dcddde"
            added_bg = "#1a2f1f"
            added_text = "#3fb950"
            removed_bg = "#2f1a1f"
            removed_text = "#f85149"
            unchanged_bg = bg_color
            unchanged_text = text_color
            line_num_bg = "#262626"
            line_num_text = "#6b6b6b"
        else:
            bg_color = "#ffffff"
            text_color = "#1e1e1e"
            added_bg = "#e8f5ec"
            added_text = "#22863a"
            removed_bg = "#fdeef0"
            removed_text = "#cb2431"
            unchanged_bg = bg_color
            unchanged_text = text_color
            line_num_bg = "#f2f3f5"
            line_num_text = "#888888"
        
        # Split into lines for line-by-line diff
        lines1 = text1.splitlines(keepends=True)
        lines2 = text2.splitlines(keepends=True)
        line_opcodes = self.compute_line_opcodes(lines1, lines2)
        
        html_parts = [
            f'<div style="font-family: \'Consolas\', monospace; font-size: 13px; '
            f'background-color: {bg_color}; color: {text_color}; padding: 0;">'
        ]
        
        if line_numbers:
            # Define separator color (slightly darker than line_num_bg for visibility)
            separator_color = "#d4d4d8" if theme == "light" else "#333333"
            html_parts.append(
                f'<style>'
                f'.diff-row {{ display: grid; grid-template-columns: 44px 44px 20px 1fr; line-height: 20px; border: none; border-top: none; border-bottom: none; }}'
                f'.diff-row.added {{ background-color: {added_bg}; }}'
                f'.diff-row.removed {{ background-color: {removed_bg}; }}'
                f'.diff-row.unchanged {{ background-color: {unchanged_bg}; }}'
                f'.line-number {{ color: {line_num_text}; padding: 0 10px; text-align: right; user-select: none; background-color: {line_num_bg}; font-size: 12px; border-top: none; border-bottom: none; }}'
                f'.line-number:first-child {{ border-right: 1px solid {separator_color}; }}'
                f'.line-number:nth-child(2) {{ border-right: 1px solid {separator_color}; }}'
                f'.diff-row.added .line-number {{ color: {added_text}; background-color: {added_bg}; }}'
                f'.diff-row.removed .line-number {{ color: {removed_text}; background-color: {removed_bg}; }}'
                f'.diff-row.unchanged .line-number {{ color: {line_num_text}; background-color: {line_num_bg}; }}'
                f'.diff-sign {{ padding: 0 4px; text-align: center; user-select: none; font-weight: bold; border-right: 1px solid {separator_color}; border-top: none; border-bottom: none; font-size: 12px; }}'
                f'.diff-row.added .diff-sign {{ color: {added_text}; }}'
                f'.diff-row.removed .diff-sign {{ color: {removed_text}; }}'
                f'.line-content {{ padding: 0 12px; white-space: pre; font-size: 12px; border-top: none; border-bottom: none; }}'
                f'.diff-row.added .line-content {{ color: {added_text}; }}'
                f'.diff-row.removed .line-content {{ color: {removed_text}; }}'
                f'.diff-row.unchanged .line-content {{ color: {unchanged_text}; }}'
                f'</style>'
            )
        
        old_line_num = 1
        new_line_num = 1
        
        for tag, i1, i2, j1, j2 in line_opcodes:
            old_chunk = lines1[i1:i2]
            new_chunk = lines2[j1:j2]

            if tag == "equal":
                for old_line, new_line in zip(old_chunk, new_chunk):
                    old_html = html.escape(old_line.rstrip("\n"))
                    new_html = html.escape(new_line.rstrip("\n"))
                    html_parts.append(
                        f'<div class="diff-row unchanged">'
                        f'<span class="line-number">{old_line_num}</span>'
                        f'<span class="line-number">{new_line_num}</span>'
                        f'<span class="diff-sign"></span>'
                        f'<span class="line-content">{new_html}</span>'
                        f'</div>'
                    )
                    old_line_num += 1
                    new_line_num += 1
            elif tag == "delete":
                for old_line in old_chunk:
                    old_html = html.escape(old_line.rstrip("\n"))
                    html_parts.append(
                        f'<div class="diff-row removed">'
                        f'<span class="line-number">{old_line_num}</span>'
                        f'<span class="line-number"></span>'
                        f'<span class="diff-sign">-</span>'
                        f'<span class="line-content">{old_html}</span>'
                        f'</div>'
                    )
                    old_line_num += 1
            elif tag == "insert":
                for new_line in new_chunk:
                    new_html = html.escape(new_line.rstrip("\n"))
                    html_parts.append(
                        f'<div class="diff-row added">'
                        f'<span class="line-number"></span>'
                        f'<span class="line-number">{new_line_num}</span>'
                        f'<span class="diff-sign">+</span>'
                        f'<span class="line-content">{new_html}</span>'
                        f'</div>'
                    )
                    new_line_num += 1
            elif tag == "replace":
                max_len = max(len(old_chunk), len(new_chunk))
                for idx in range(max_len):
                    old_line = old_chunk[idx] if idx < len(old_chunk) else None
                    new_line = new_chunk[idx] if idx < len(new_chunk) else None

                    if old_line is None:
                        new_html = html.escape(new_line.rstrip("\n"))
                        html_parts.append(
                            f'<div class="diff-row added">'
                            f'<span class="line-number"></span>'
                            f'<span class="line-number">{new_line_num}</span>'
                            f'<span class="diff-sign">+</span>'
                            f'<span class="line-content">{new_html}</span>'
                            f'</div>'
                        )
                        new_line_num += 1
                        continue
                    if new_line is None:
                        old_html = html.escape(old_line.rstrip("\n"))
                        html_parts.append(
                            f'<div class="diff-row removed">'
                            f'<span class="line-number">{old_line_num}</span>'
                            f'<span class="line-number"></span>'
                            f'<span class="diff-sign">-</span>'
                            f'<span class="line-content">{old_html}</span>'
                            f'</div>'
                        )
                        old_line_num += 1
                        continue

                    old_html, new_html = self._format_inline_diffs(old_line, new_line, theme)
                    html_parts.append(
                        f'<div class="diff-row removed">'
                        f'<span class="line-number">{old_line_num}</span>'
                        f'<span class="line-number"></span>'
                        f'<span class="diff-sign">-</span>'
                        f'<span class="line-content">{old_html}</span>'
                        f'</div>'
                    )
                    html_parts.append(
                        f'<div class="diff-row added">'
                        f'<span class="line-number"></span>'
                        f'<span class="line-number">{new_line_num}</span>'
                        f'<span class="diff-sign">+</span>'
                        f'<span class="line-content">{new_html}</span>'
                        f'</div>'
                    )
                    old_line_num += 1
                    new_line_num += 1
        
        html_parts.append('</div>')
        return ''.join(html_parts)
    
    def _format_inline_diffs(self, old_line: str, new_line: str, theme: str = "dark") -> Tuple[str, str]:
        """Format a line pair with character-level diff highlighting."""
        if theme == "dark":
            added_color = "#2d4a32"
            removed_color = "#4a2d32"
        else:
            added_color = "#c8e6c9"
            removed_color = "#ffcdd2"
        
        old_parts = []
        new_parts = []

        matcher = difflib.SequenceMatcher(a=old_line, b=new_line)
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            old_text = html.escape(old_line[i1:i2])
            new_text = html.escape(new_line[j1:j2])

            if tag == "equal":
                old_parts.append(old_text)
                new_parts.append(new_text)
            elif tag == "delete":
                old_parts.append(f'<span style="background-color: {removed_color};">{old_text}</span>')
            elif tag == "insert":
                new_parts.append(f'<span style="background-color: {added_color};">{new_text}</span>')
            elif tag == "replace":
                old_parts.append(f'<span style="background-color: {removed_color};">{old_text}</span>')
                new_parts.append(f'<span style="background-color: {added_color};">{new_text}</span>')

        return ''.join(old_parts).rstrip("\n"), ''.join(new_parts).rstrip("\n")


# Global instance
_diff_processor = None


def get_diff_processor() -> DiffProcessor:
    """Get global DiffProcessor instance."""
    global _diff_processor
    if _diff_processor is None:
        _diff_processor = DiffProcessor()
    return _diff_processor
