# Скрипты сборки установщика

Используются из корня проекта или из `installer/`. Полная сборка: `installer/build_installer_full.sh`.

## Структура DFM_Installer

```
DFM_Installer/
  linux/          forester/, diffmachine_gui/
  windows/        forester/, diffmachine_gui/
  osx/            forester/, diffmachine_gui/
  addons/         blender/
  install.sh
  install.bat
  README.txt
```

Папка DFM_Installer не удаляется при сборке. ISO создаётся отдельно: `scripts/build_iso.sh`.

## Скрипты

| Скрипт | Описание |
|--------|----------|
| **build_forester.sh** | Сборка Forester CLI и API в `installer/forester/<os>/`. На текущей ОС собирает бинарник и API; Windows кросс-компилируется с Linux/macOS (Go). |
| **copy_addons.sh** | Копирование `addons/` в `DFM_Installer/addons/`. Вызов: `copy_addons.sh [TARGET_DIR]`. По умолчанию `TARGET_DIR=installer/DFM_Installer`. |
| **build_gui_pyinstaller.sh** | Сборка diffmachine_gui через PyInstaller (Linux/macOS). Результат: `installer/DFM_Installer/<linux|osx>/diffmachine_gui/`. |
| **build_gui_pyinstaller.bat** | То же для Windows. Результат: `installer/DFM_Installer/windows/diffmachine_gui/`. |
| **build_installer.sh** | Копирование forester из `installer/forester/<os>/` в `DFM_Installer/<os>/forester/`, addons, install.sh, install.bat, README.txt, API в аддон и в GUI. ISO не создаётся. |
| **build_iso.sh** | Создание ISO `installer/DFM_Installer_<os>.iso` из папки DFM_Installer (xorriso/genisoimage/mkisofs). |

## Порядок полной сборки

1. **build_forester.sh** — заполняет `installer/forester/<os>/` для текущей ОС (и кросс для Windows с Linux/macOS).
2. **build_gui_pyinstaller.sh** (или .bat на Windows) — собирает GUI в `DFM_Installer/<os>/diffmachine_gui/`.
3. **build_installer.sh** — копирует forester в `DFM_Installer/<os>/forester/`, addons, скрипты установки и README; подкладывает API в аддон и в GUI.
4. **build_iso.sh** (по желанию) — создаёт ISO из DFM_Installer.

Главный скрипт `installer/build_installer_full.sh` выполняет шаги 1–3 по очереди (на Windows шаг 2 нужно запустить вручную: `installer\scripts\build_gui_pyinstaller.bat`).

## Примечания

- PyInstaller собирает приложение только для той ОС, на которой запущен. Для трёх платформ нужны три сборки (Linux, Windows, macOS); каждая дополняет свою папку в DFM_Installer.
- Установщик (install.sh / install.bat) берёт бинарники и GUI из папки своей ОС: `linux/`, `windows/`, `osx/`.
