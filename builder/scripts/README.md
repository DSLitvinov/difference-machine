# Скрипты сборки установщика

Используются из корня проекта или из `installer/`. Полная сборка: `builder/auto_build.sh`.

## Структура DFM_Installer

Собирается только папка текущей платформы (linux, windows или osx):

```
DFM_Installer/
  <os>/           forester/, difference_machine/  (только текущая ОС)
  addons/         blender/
  install.sh
  install.bat
  README.txt
```

Папка DFM_Installer не удаляется при сборке. ISO создаётся отдельно: `scripts/build_iso.sh`.

## Скрипты

| Скрипт | Описание |
|--------|----------|
| *(Forester)* | auto_build.sh запускает LINUX_build.sh / MACOS_build.sh / WINDOWS_build.bat из sources/forester. |
| **copy_addons.sh** | Копирование `addons/` в `DFM_Installer/addons/`. Вызов: `copy_addons.sh [TARGET_DIR]`. По умолчанию `TARGET_DIR=installer/DFM_Installer`. |
| **build_gui_pyinstaller.sh** | Сборка difference_machine через PyInstaller (Linux/macOS). Результат: `installer/DFM_Installer/<linux|osx>/difference_machine/`. |
| **build_gui_pyinstaller.bat** | То же для Windows. Результат: `installer/DFM_Installer/windows/difference_machine/`. |
| **build_installer.sh** | Копирование forester из `installer/forester/<os>/` в `DFM_Installer/<os>/forester/`, addons, install.sh, install.bat, README.txt, API в аддон и в GUI. ISO не создаётся. |
| **build_iso.sh** | Создание ISO `installer/DFM_Installer_<os>.iso` из папки DFM_Installer (xorriso/genisoimage/mkisofs). |
| **clean_build.sh** | Очистка сборочного мусора (builder/forester, sources/installer/forester, dist и т.д.). Вызывается auto_build.sh после успешной сборки. |

## Порядок полной сборки

1. **Forester** — auto_build.sh запускает скрипт из sources/forester (LINUX_build.sh, MACOS_build.sh или WINDOWS_build.bat). Результат: sources/installer/forester/<os>/ или installer/forester/<os>/.
2. **build_gui_pyinstaller.sh** (или .bat на Windows) — собирает GUI в `DFM_Installer/<os>/difference_machine/`.
3. **build_installer.sh** — копирует forester в `DFM_Installer/<os>/forester/`, addons, скрипты установки и README; подкладывает API в аддон и в GUI.
4. **build_iso.sh** (по желанию) — создаёт ISO из DFM_Installer.

Главный скрипт `builder/auto_build.sh` выполняет шаги 1–3 по очереди (на Windows шаг 2 нужно запустить вручную: `builder\scripts\build_gui_pyinstaller.bat`).

## Примечания

- PyInstaller собирает приложение только для той ОС, на которой запущен. Для трёх платформ нужны три сборки (Linux, Windows, macOS); каждая дополняет свою папку в DFM_Installer.
- Установщик (install.sh / install.bat) берёт бинарники и GUI из папки своей ОС: `linux/`, `windows/`, `osx/`.

### Сборка GUI на macOS

1. Установите зависимости сборки:  
   `pip install -r builder/requirements-build.txt`  
   (или в venv: `python3 -m venv .venv && .venv/bin/pip install -r builder/requirements-build.txt`)
2. Запустите из корня проекта:  
   `builder/scripts/build_gui_pyinstaller.sh`  
   Скрипт подхватит PyInstaller из PATH или через `python3 -m PyInstaller`.
3. Результат: `DFM_Installer/osx/difference_machine/DifferenceMachine` (и зависимости в той же папке).
