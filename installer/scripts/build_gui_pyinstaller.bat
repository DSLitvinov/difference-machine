@echo off
REM build_gui_pyinstaller.bat - Сборка diffmachine_gui через PyInstaller (Windows).
REM Результат: installer\DFM_Installer\windows\diffmachine_gui\

setlocal

set "SCRIPT_DIR=%~dp0"
set "INSTALLER_DIR=%SCRIPT_DIR%.."
set "PROJECT_ROOT=%INSTALLER_DIR%\.."
set "GUI_DIR=%PROJECT_ROOT%\diffmachine_gui"
set "DFM_INSTALLER_DIR=%INSTALLER_DIR%\DFM_Installer"
set "CURRENT_OS=windows"
set "DFM_OS=windows"
set "DISTPATH=%DFM_INSTALLER_DIR%\%DFM_OS%"
set "WORK_DIR=%GUI_DIR%\build\pyinstaller_%CURRENT_OS%"
set "SPEC_PATH=%GUI_DIR%\diffmachine.spec"

echo ==========================================
echo   Сборка GUI (PyInstaller)
echo ==========================================
echo Платформа: %CURRENT_OS% -^> %DFM_OS%\
echo Исходники: %GUI_DIR%
echo Выход: %DISTPATH%\diffmachine_gui\
echo.

if not exist "%SPEC_PATH%" (
    echo [ERROR] Spec не найден: %SPEC_PATH%
    exit /b 1
)

where pyinstaller >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PyInstaller не найден. Установите: pip install pyinstaller
    exit /b 1
)

cd /d "%GUI_DIR%"
if not exist "%DISTPATH%" mkdir "%DISTPATH%"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"

pyinstaller --noconfirm --clean ^
    --distpath "%DISTPATH%" ^
    --workpath "%WORK_DIR%" ^
    "%SPEC_PATH%"

if exist "%DISTPATH%\diffmachine_gui" (
    echo.
    echo [OK] GUI собран: %DISTPATH%\diffmachine_gui\
) else (
    echo [ERROR] Ожидалась папка %DISTPATH%\diffmachine_gui
    exit /b 1
)

endlocal
