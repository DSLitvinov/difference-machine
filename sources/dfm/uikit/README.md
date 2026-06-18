# DFM UI Kit (QML)

Light-theme UI kit for Difference Machine applications (C++ and Python).

## Build (C++)

Requires Qt 6.5+ with Qt Quick.

```bash
cmake -S sources/dfm -B build/dfm -DCMAKE_PREFIX_PATH=<Qt6 path>
cmake --build build/dfm
./build/dfm/dfm_uikit_gallery
```

## Run gallery (Python)

Requires PyQt6 6.6+ (same stack as `difference_machine`).

```bash
cd sources/dfm
pip install -r requirements.txt
python main.py
```

From the repository root:

```bash
PYTHONPATH=sources/dfm python sources/dfm/main.py
```

## Module

- **URI:** `Dfm.UiKit` version 1.0
- **Theme singleton:** `DfmTheme` (`import Dfm.UiKit 1.0`)

Python resolves the module via `uikit/Dfm/UiKit/qmldir` (no C++ build required).

## Structure

```
sources/dfm/
  main.py / main.cpp       Gallery launchers
  dfm/                     Python package
    uikit.py               configure_engine(), load_gallery()
  uikit/
    Dfm/UiKit/qmldir       Module manifest for Python QML import
    theme/DfmTheme.qml     Design tokens from Figma
    controls/              Atomic components
    panels/                Sidebar, ActionBar, Footer
    gallery/UiKitGallery.qml
```

## Usage in C++

```cpp
#include <QQmlApplicationEngine>

QQmlApplicationEngine engine;
engine.loadFromModule("Dfm.UiKit", "YourApp");
```

## Usage in Python

```python
import sys
from PyQt6.QtGui import QGuiApplication
from PyQt6.QtQml import QQmlApplicationEngine
from dfm.uikit import configure_engine, load_qml, uikit_root

app = QGuiApplication(sys.argv)
engine = QQmlApplicationEngine()
configure_engine(engine)

# Your main QML (must use `import Dfm.UiKit 1.0`)
load_qml(engine, uikit_root() / "gallery" / "UiKitGallery.qml")

sys.exit(app.exec())
```

```qml
import Dfm.UiKit 1.0

DfmSidebar {
    side: DfmSidebar.Side.Left
    preferredWidth: 256
}
```

Icons are passed via `iconSource` / `*IconSource` properties — SVG assets are not bundled in the kit.
