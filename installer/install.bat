@echo off
chcp 65001 >nul 2>&1

setlocal enabledelayedexpansion

echo ==========================================
echo   Forester Installer (Windows)
echo ==========================================
echo.

set "INSTALLER_DIR=%~dp0"
set "BINARY_DIR=%INSTALLER_DIR%windows\forester\bin"
set "BINARY_PATH=%BINARY_DIR%\forester.exe"
set "API_LIB_DIR=%INSTALLER_DIR%windows\forester\lib"
set "API_LIB_PATH=%API_LIB_DIR%\forester.dll"

if not exist "%BINARY_PATH%" (
    echo [ERROR] Binary not found: %BINARY_PATH%
    echo Check folder: %BINARY_DIR%
    pause
    exit /b 1
)

echo [OK] Binary found: %BINARY_PATH%

if exist "%API_LIB_PATH%" (
    echo [OK] API library found: %API_LIB_PATH%
    set "API_LIB_AVAILABLE=true"
) else (
    echo [WARNING] API library not found: %API_LIB_PATH%
    echo   API will be unavailable, CLI will be used
    set "API_LIB_AVAILABLE=false"
)
echo.

set "DEFAULT_INSTALL_PATH=C:\Program Files\DiffMachine"
echo Installation path [%DEFAULT_INSTALL_PATH%]:
set /p "INSTALL_PATH=Enter path or press Enter for default: "
if "!INSTALL_PATH!"=="" set "INSTALL_PATH=%DEFAULT_INSTALL_PATH%"

set "GUI_SRC_DIR=%INSTALLER_DIR%windows\diffmachine_gui"
set "GUI_INSTALL_DIR=%INSTALL_PATH%\diffmachine_gui"
set "GUI_VENV_DIR=%INSTALL_PATH%\gui-venv"
set "GUI_INSTALLED=false"

echo.
echo Installing to: %INSTALL_PATH%
echo.

echo === Creating directories ===
mkdir "%INSTALL_PATH%\bin" 2>nul
copy "%BINARY_PATH%" "%INSTALL_PATH%\bin\forester.exe" >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy binary
    echo Administrator rights may be required
    echo Try running as administrator
    pause
    exit /b 1
)

echo [OK] Binary installed: %INSTALL_PATH%\bin\forester.exe
echo.

echo === Verifying installation ===
"%INSTALL_PATH%\bin\forester.exe" --version >nul 2>&1
if errorlevel 1 (
    "%INSTALL_PATH%\bin\forester.exe" --help >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Could not verify binary
    ) else (
        echo [OK] Binary is working
    )
) else (
    echo [OK] Binary is working
)
echo.

echo === Installing GUI (Difference Machine) ===
set "GUI_LAUNCHER="
if exist "%GUI_SRC_DIR%\DifferenceMachine.exe" (
    rem PyInstaller build: copy and create launcher for DifferenceMachine.exe
    mkdir "%GUI_INSTALL_DIR%" 2>nul
    xcopy /E /I /Y "%GUI_SRC_DIR%\*" "%GUI_INSTALL_DIR%\" >nul
    if exist "%GUI_INSTALL_DIR%\DifferenceMachine.exe" (
        echo [OK] GUI ^(PyInstaller^) copied: %GUI_INSTALL_DIR%
        set "LAUNCHER=%INSTALL_PATH%\bin\dfm-gui.cmd"
        (
            echo @echo off
            echo cd /d "%GUI_INSTALL_DIR%"
            echo "%GUI_INSTALL_DIR%\DifferenceMachine.exe" %%*
        ) > "!LAUNCHER!"
        echo [OK] Launcher created: !LAUNCHER!
        set "GUI_INSTALLED=true"
        set "GUI_LAUNCHER=!LAUNCHER!"
    )
) else if exist "%GUI_SRC_DIR%\main.py" if exist "%GUI_SRC_DIR%\requirements.txt" (
    rem Sources: venv + pip
    mkdir "%GUI_INSTALL_DIR%" 2>nul
    xcopy /E /I /Y "%GUI_SRC_DIR%\*" "%GUI_INSTALL_DIR%\" >nul
    if exist "%GUI_INSTALL_DIR%\main.py" (
        echo [OK] GUI sources copied: %GUI_INSTALL_DIR%
        set "PYTHON_CMD="
        where py >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_CMD=py -3"
        ) else (
            where python >nul 2>&1
            if !errorlevel! equ 0 set "PYTHON_CMD=python"
        )
        if not "!PYTHON_CMD!"=="" (
            !PYTHON_CMD! -m venv "%GUI_VENV_DIR%" 2>nul
            if exist "%GUI_VENV_DIR%\Scripts\python.exe" (
                "%GUI_VENV_DIR%\Scripts\pip.exe" install --upgrade pip >nul 2>&1
                "%GUI_VENV_DIR%\Scripts\pip.exe" install -r "%GUI_INSTALL_DIR%\requirements.txt" >nul 2>&1
                if !errorlevel! equ 0 (
                    echo [OK] GUI virtualenv and dependencies installed
                    set "LAUNCHER=%INSTALL_PATH%\bin\dfm-gui.cmd"
                    (
                        echo @echo off
                        echo cd /d "%GUI_INSTALL_DIR%"
                        echo "%GUI_VENV_DIR%\Scripts\python.exe" main.py %%*
                    ) > "!LAUNCHER!"
                    echo [OK] Launcher created: !LAUNCHER!
                    set "GUI_INSTALLED=true"
                    set "GUI_LAUNCHER=!LAUNCHER!"
                ) else (
                    echo [WARNING] Failed to install GUI dependencies
                )
            ) else (
                echo [WARNING] Failed to create GUI virtualenv
            )
        ) else (
            echo [WARNING] Python not found. Install Python 3 and run installer again or create venv manually
        )
    ) else (
        echo [WARNING] Failed to copy GUI
    )
) else (
    if not exist "%GUI_SRC_DIR%" (
        echo [WARNING] GUI not found in installer, skipping
    )
)
if "!GUI_INSTALLED!"=="true" if not "!GUI_LAUNCHER!"=="" (
    set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
    set "LNK_PATH=!STARTMENU!\Difference Machine.lnk"
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('!LNK_PATH!'); $s.TargetPath = '!GUI_LAUNCHER!'; $s.WorkingDirectory = '!INSTALL_PATH!\bin'; $s.Description = 'Difference Machine GUI'; $s.Save()" 2>nul
    if exist "!LNK_PATH!" (
        echo [OK] Start Menu shortcut: !LNK_PATH!
    )
    set "DESKTOP=%USERPROFILE%\Desktop"
    if exist "!DESKTOP!" (
        set "DESKTOP_LNK=!DESKTOP!\Difference Machine.lnk"
        powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('!DESKTOP_LNK!'); $s.TargetPath = '!GUI_LAUNCHER!'; $s.WorkingDirectory = '!INSTALL_PATH!\bin'; $s.Description = 'Difference Machine GUI'; $s.Save()" 2>nul
        if exist "!DESKTOP_LNK!" echo [OK] Desktop shortcut: !DESKTOP_LNK!
    )
)
echo.

set "ADDON_INSTALLED_PATH="

if exist "%INSTALLER_DIR%addons\blender" (
    echo === Installing Blender addon ===
    set /p "INSTALL_BLENDER=Install addon for Blender? [Y/n]: "
    if /i "!INSTALL_BLENDER!"=="" set "INSTALL_BLENDER=Y"
    if /i "!INSTALL_BLENDER!"=="Y" (
        set "BLENDER_ADDON_PATH=%APPDATA%\Blender Foundation\Blender"
        
        if exist "!BLENDER_ADDON_PATH!" (
            echo Found Blender versions:
            for /d %%v in ("!BLENDER_ADDON_PATH!\*") do (
                echo   %%v
            )
            echo.
            
            set /p "INSTALL_ALL=Install for all versions? [Y/n]: "
            if /i "!INSTALL_ALL!"=="" set "INSTALL_ALL=Y"
            
            if /i "!INSTALL_ALL!"=="Y" (
                for /d %%v in ("!BLENDER_ADDON_PATH!\*") do (
                    set "ADDON_DEST=%%v\extensions\user_default\diffmachine"
                    mkdir "!ADDON_DEST!" 2>nul
                    xcopy /E /I /Y "%INSTALLER_DIR%addons\blender\diffmachine\*" "!ADDON_DEST!\" >nul
                    if errorlevel 1 (
                        echo [WARNING] Failed to install for %%~nv
                    ) else (
                        echo [OK] Installed for Blender %%~nv
                        set "ADDON_INSTALLED_PATH=!ADDON_DEST!"
                    )
                )
            ) else (
                set /p "BLENDER_VERSION=Enter Blender version (e.g. 5.0): "
                set "ADDON_DEST=!BLENDER_ADDON_PATH!\!BLENDER_VERSION!\extensions\user_default\diffmachine"
                if exist "!BLENDER_ADDON_PATH!\!BLENDER_VERSION!" (
                    mkdir "!ADDON_DEST!" 2>nul
                    xcopy /E /I /Y "%INSTALLER_DIR%addons\blender\diffmachine\*" "!ADDON_DEST!\" >nul
                    if errorlevel 1 (
                        echo [ERROR] Failed to install addon
                    ) else (
                        echo [OK] Installed for Blender !BLENDER_VERSION!
                        set "ADDON_INSTALLED_PATH=!ADDON_DEST!"
                    )
                ) else (
                    echo [ERROR] Blender version !BLENDER_VERSION! not found
                )
            )
        ) else (
            echo [WARNING] Blender not found in standard location
            echo.
            set /p "CUSTOM_BLENDER_PATH=Enter path to extensions\user_default Blender folder: "
            if exist "!CUSTOM_BLENDER_PATH!" (
                set "ADDON_DEST=!CUSTOM_BLENDER_PATH!\diffmachine"
                mkdir "!ADDON_DEST!" 2>nul
                xcopy /E /I /Y "%INSTALLER_DIR%addons\blender\diffmachine\*" "!ADDON_DEST!\" >nul
                if errorlevel 1 (
                    echo [ERROR] Failed to install addon
                ) else (
                    echo [OK] Installed to: !ADDON_DEST!
                    set "ADDON_INSTALLED_PATH=!ADDON_DEST!"
                )
            ) else (
                echo [ERROR] Path not found: !CUSTOM_BLENDER_PATH!
            )
        )
    )
)

echo.
echo === Creating configuration file ===
set "DFM_SETUP_DIR=%USERPROFILE%\.dfm"
set "DFM_CONFIG_FILE=%DFM_SETUP_DIR%\setup.cfg"

mkdir "%DFM_SETUP_DIR%" 2>nul

(
    echo [forester]
    echo installed = true
    echo path = %INSTALL_PATH%\bin\forester.exe
) > "%DFM_CONFIG_FILE%"

if "!GUI_INSTALLED!"=="true" (
    (
        echo.
        echo [difference machine gui]
        echo installed = true
        echo enabled = true
        echo path = %INSTALL_PATH%\bin\dfm-gui.cmd
    ) >> "%DFM_CONFIG_FILE%"
) else (
    (
        echo.
        echo [difference machine gui]
        echo installed = false
        echo enabled = false
        echo path = 
    ) >> "%DFM_CONFIG_FILE%"
)

rem Add addon path if installed
if not "!ADDON_INSTALLED_PATH!"=="" (
    (
        echo.
        echo [addons]
        echo diffmachine_path = !ADDON_INSTALLED_PATH!
    ) >> "%DFM_CONFIG_FILE%"
    echo [OK] Addon path saved to config: !ADDON_INSTALLED_PATH!
)

if exist "%DFM_CONFIG_FILE%" (
    echo [OK] Configuration file created: %DFM_CONFIG_FILE%
) else (
    echo [WARNING] Failed to create configuration file
    echo Create manually: %DFM_CONFIG_FILE%
)

echo.
echo ==========================================
echo [OK] Installation completed!
echo ==========================================
echo.
echo Forester CLI installed to: %INSTALL_PATH%\bin\forester.exe
echo Addon configuration: %DFM_CONFIG_FILE%
if "!GUI_INSTALLED!"=="true" (
    echo GUI: run from Start Menu / Desktop shortcut or: !INSTALL_PATH!\bin\dfm-gui.cmd
)
echo.
echo To add to PATH for convenience, run:
echo   setx PATH "%%PATH%%;!INSTALL_PATH!\bin"
echo.
pause
