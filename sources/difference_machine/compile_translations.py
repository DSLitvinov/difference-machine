#!/usr/bin/env python3
"""
Compile translation files from .ts to .qm format.
"""

import subprocess
import sys
from pathlib import Path

def compile_translations():
    """Compile .ts files to .qm files."""
    base_path = Path(__file__).parent.absolute()
    translations_path = base_path / "translations"
    
    # Try to find lrelease
    lrelease_cmd = None
    
    # First, try common command names
    for cmd in ["lrelease-qt6", "lrelease6", "lrelease"]:
        try:
            result = subprocess.run(["which", cmd], capture_output=True, text=True)
            if result.returncode == 0:
                lrelease_cmd = result.stdout.strip()
                break
        except:
            pass
    
    # If not found, try common installation paths
    if not lrelease_cmd:
        common_paths = [
            "/usr/lib/qt6/bin/lrelease",
            "/usr/bin/lrelease-qt6",
            "/usr/bin/lrelease",
            "/opt/qt6/bin/lrelease",
        ]
        for path in common_paths:
            if Path(path).exists():
                lrelease_cmd = path
                break
    
    if not lrelease_cmd:
        print("Error: lrelease not found. Please install Qt6 tools:")
        print("  Ubuntu/Debian: sudo apt-get install qttools6-dev-tools")
        print("  Fedora: sudo dnf install qt6-linguist")
        print("  macOS: brew install qt6")
        print("  Or download from: https://www.qt.io/download")
        sys.exit(1)
    
    # Compile each .ts file
    ts_files = list(translations_path.glob("*.ts"))
    if not ts_files:
        print(f"No .ts files found in {translations_path}")
        sys.exit(1)
    
    for ts_file in ts_files:
        qm_file = ts_file.with_suffix(".qm")
        print(f"Compiling {ts_file.name}...")
        result = subprocess.run([lrelease_cmd, str(ts_file), "-qm", str(qm_file)], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  ✓ Created {qm_file.name}")
        else:
            print(f"  ✗ Error compiling {ts_file.name}:")
            print(result.stderr)
            sys.exit(1)
    
    print("All translations compiled successfully!")

if __name__ == "__main__":
    compile_translations()
