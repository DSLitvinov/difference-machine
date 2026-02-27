@echo off
chcp 65001 >nul 2>&1
REM auto_build.bat — полная сборка: Forester, GUI, образ в DFM_Installer (Windows).
REM Аналог builder/auto_build.sh для Windows.

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "PROJECT_ROOT=%SCRIPT_DIR%\.."
set "SCRIPTS_DIR=%SCRIPT_DIR%\scripts"
set "FORESTER_DIR=%PROJECT_ROOT%\sources\forester"
if not exist "%FORESTER_DIR%" set "FORESTER_DIR=%PROJECT_ROOT%\forester"
set "CURRENT_OS=windows"
set "DFM_OS=windows"

REM Выход forester: <parent_of_forester>\installer\forester\windows
for %%I in ("%FORESTER_DIR%\..") do set "FORESTER_PARENT=%%~fI"
set "FORESTER_OUT=%FORESTER_PARENT%\installer\forester\%CURRENT_OS%"

echo.
echo ^>^>^> Шаг 1: Forester
if not exist "%FORESTER_DIR%\WINDOWS_build.bat" (
    echo Скрипт сборки Forester не найден: %FORESTER_DIR%\WINDOWS_build.bat
) else (
    call "%FORESTER_DIR%\WINDOWS_build.bat"
    if not exist "%FORESTER_OUT%\lib" mkdir "%FORESTER_OUT%\lib"
    cd /d "%FORESTER_DIR%"
    go build -buildmode=c-shared -o "%FORESTER_OUT%\lib\forester.dll" ./api 2>nul
    if errorlevel 1 (
        echo [W] Сборка forester.dll не удалась или пропущена
    ) else (
        echo [OK] forester.dll собран в %FORESTER_OUT%\lib\
    )
)

echo.
echo ^>^>^> Шаг 2: GUI
call "%SCRIPTS_DIR%\build_gui_pyinstaller.bat"
if errorlevel 1 (
    echo [ERROR] Сборка GUI завершилась с ошибкой
    exit /b 1
)

echo.
echo ^>^>^> Шаг 2b: Installer (если есть sources\installer)
if exist "%PROJECT_ROOT%\sources\installer\installer.spec" (
    if exist "%SCRIPTS_DIR%\build_installer_app.bat" (
        call "%SCRIPTS_DIR%\build_installer_app.bat" 2>nul
    )
)

echo.
echo ^>^>^> Шаг 3: Образ (forester, addons, API)
set "BUILDER_DIR=%SCRIPT_DIR%"
set "DFM_INSTALLER_DIR=%PROJECT_ROOT%\DFM_Installer"
if not exist "%DFM_INSTALLER_DIR%\%DFM_OS%" mkdir "%DFM_INSTALLER_DIR%\%DFM_OS%"

REM 1) Копирование Forester в DFM_Installer\windows\forester
set "FORESTER_SRC="
if exist "%PROJECT_ROOT%\sources\installer\forester\%CURRENT_OS%\bin\forester.exe" set "FORESTER_SRC=%PROJECT_ROOT%\sources\installer\forester\%CURRENT_OS%"
if "!FORESTER_SRC!"=="" if exist "%PROJECT_ROOT%\installer\forester\%CURRENT_OS%\bin\forester.exe" set "FORESTER_SRC=%PROJECT_ROOT%\installer\forester\%CURRENT_OS%"
if "!FORESTER_SRC!"=="" if exist "%BUILDER_DIR%\forester\%CURRENT_OS%\bin\forester.exe" set "FORESTER_SRC=%BUILDER_DIR%\forester\%CURRENT_OS%"

set "FORESTER_DST=%DFM_INSTALLER_DIR%\%DFM_OS%\forester"
if not "!FORESTER_SRC!"=="" (
    if exist "!FORESTER_DST!" rd /S /Q "!FORESTER_DST!"
    mkdir "!FORESTER_DST!\bin" "!FORESTER_DST!\lib" 2>nul
    copy /Y "!FORESTER_SRC!\bin\forester.exe" "!FORESTER_DST!\bin\" >nul 2>&1
    if exist "!FORESTER_SRC!\lib\forester.dll" copy /Y "!FORESTER_SRC!\lib\forester.dll" "!FORESTER_DST!\lib\" >nul 2>&1
    echo [OK] Forester скопирован в %DFM_OS%\forester\
) else (
    echo [W] Forester не найден
)

REM 2) Копирование аддонов
set "ADDONS_SOURCE=%PROJECT_ROOT%\sources\addons"
if not exist "%ADDONS_SOURCE%" set "ADDONS_SOURCE=%PROJECT_ROOT%\addons"
if exist "%ADDONS_SOURCE%" (
    xcopy /E /I /Y /Q "%ADDONS_SOURCE%" "%DFM_INSTALLER_DIR%\addons\" >nul 2>&1
    echo [OK] Аддоны скопированы в addons\
) else (
    echo [W] Папка addons не найдена: %ADDONS_SOURCE%
)

REM 3) API в addons\blender\difference_machine\api
set "ADDON_API_DIR=%DFM_INSTALLER_DIR%\addons\blender\difference_machine\api"
set "FORESTER_API_SRC=%PROJECT_ROOT%\sources\forester\api"
if not exist "%FORESTER_API_SRC%" set "FORESTER_API_SRC=%PROJECT_ROOT%\forester\api"
mkdir "%ADDON_API_DIR%" "%ADDON_API_DIR%\python" 2>nul
if exist "%DFM_INSTALLER_DIR%\%DFM_OS%\forester\lib\forester.dll" (
    copy /Y "%DFM_INSTALLER_DIR%\%DFM_OS%\forester\lib\forester.dll" "%ADDON_API_DIR%\" >nul 2>&1
)
if exist "%FORESTER_API_SRC%\python_bindings.py" copy /Y "%FORESTER_API_SRC%\python_bindings.py" "%ADDON_API_DIR%\python\" >nul 2>&1
if exist "%FORESTER_API_SRC%\python_bindings_structured.py" copy /Y "%FORESTER_API_SRC%\python_bindings_structured.py" "%ADDON_API_DIR%\python\" >nul 2>&1
echo [OK] API в addons\blender\difference_machine\api\

REM 4) API в difference_machine
set "GUI_ROOT=%DFM_INSTALLER_DIR%\%DFM_OS%\difference_machine"
set "GUI_API_DIR=%GUI_ROOT%\api"
if exist "%GUI_ROOT%" (
    mkdir "%GUI_API_DIR%" "%GUI_API_DIR%\python" 2>nul
    if exist "%DFM_INSTALLER_DIR%\%DFM_OS%\forester\lib\forester.dll" (
        copy /Y "%DFM_INSTALLER_DIR%\%DFM_OS%\forester\lib\forester.dll" "%GUI_API_DIR%\" >nul 2>&1
    )
    if exist "%FORESTER_API_SRC%\python_bindings.py" copy /Y "%FORESTER_API_SRC%\python_bindings.py" "%GUI_API_DIR%\python\" >nul 2>&1
    if exist "%FORESTER_API_SRC%\python_bindings_structured.py" copy /Y "%FORESTER_API_SRC%\python_bindings_structured.py" "%GUI_API_DIR%\python\" >nul 2>&1
    echo [OK] API в %DFM_OS%\difference_machine\api\
) else (
    echo [W] %DFM_OS%\difference_machine\ ещё не собран
)

echo.
echo ^>^>^> Шаг 4: Очистка сборочного мусора
if exist "%BUILDER_DIR%\forester" rd /S /Q "%BUILDER_DIR%\forester"
if exist "%PROJECT_ROOT%\sources\installer\forester" rd /S /Q "%PROJECT_ROOT%\sources\installer\forester"
if exist "%PROJECT_ROOT%\installer\forester" rd /S /Q "%PROJECT_ROOT%\installer\forester"
if exist "%PROJECT_ROOT%\dist" rd /S /Q "%PROJECT_ROOT%\dist"
if exist "%PROJECT_ROOT%\sources\forester\build" rd /S /Q "%PROJECT_ROOT%\sources\forester\build"
if exist "%PROJECT_ROOT%\forester\build" rd /S /Q "%PROJECT_ROOT%\forester\build" 2>nul
echo Готово.

echo.
echo Готово: %PROJECT_ROOT%\DFM_Installer\
endlocal
