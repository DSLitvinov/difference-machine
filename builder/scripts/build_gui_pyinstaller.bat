@echo off
REM build_gui_pyinstaller.bat - Сборка difference_machine (GUI) через PyInstaller (Windows).
REM Результат: installer\DFM_Installer\windows\difference_machine\

setlocal

set "SCRIPT_DIR=%~dp0"
set "BUILDER_DIR=%SCRIPT_DIR%.."
set "PROJECT_ROOT=%BUILDER_DIR%\.."
set "SOURCES_DIR=%PROJECT_ROOT%\sources"
set "GUI_DIR=%SOURCES_DIR%\difference_machine"
if not exist "%GUI_DIR%" set "GUI_DIR=%PROJECT_ROOT%\difference_machine"
set "DFM_INSTALLER_DIR=%PROJECT_ROOT%\DFM_Installer"
set "CURRENT_OS=windows"
set "DFM_OS=windows"
set "DISTPATH=%DFM_INSTALLER_DIR%\%DFM_OS%"
set "WORK_DIR=%GUI_DIR%\build\pyinstaller_%CURRENT_OS%"
set "SPEC_PATH=%GUI_DIR%\difference_machine.spec"

echo ==========================================
echo   Сборка GUI (PyInstaller)
echo ==========================================
echo Платформа: %CURRENT_OS% -^> %DFM_OS%\
echo Исходники: %GUI_DIR%
echo Выход: %DISTPATH%\difference_machine\
echo.

if not exist "%SPEC_PATH%" (
    echo [ERROR] Spec не найден: %SPEC_PATH%
    exit /b 1
)

where pyinstaller >nul 2>&1
if errorlevel 1 (
    python -m pyinstaller --help >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] PyInstaller не найден.
        echo   Установите: pip install pyinstaller
        echo   Или: python -m pip install pyinstaller
        exit /b 1
    )
    set "PYINSTALLER_CMD=python -m pyinstaller"
) else (
    set "PYINSTALLER_CMD=pyinstaller"
)

cd /d "%GUI_DIR%"
if not exist "%DISTPATH%" mkdir "%DISTPATH%"
if not exist "%WORK_DIR%" mkdir "%WORK_DIR%"

"%PYINSTALLER_CMD%" --noconfirm --clean ^
    --distpath "%DISTPATH%" ^
    --workpath "%WORK_DIR%" ^
    "%SPEC_PATH%"

if exist "%DISTPATH%\difference_machine" (
    echo.
    echo [OK] GUI собран: %DISTPATH%\difference_machine\
) else (
    echo [ERROR] Ожидалась папка %DISTPATH%\difference_machine
    exit /b 1
)

endlocal
