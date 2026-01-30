@echo off
chcp 65001 >nul 2>&1
REM Batch скрипт для сборки бинарника Forester для Windows
REM Копирует готовый бинарник в installer/forester/windows/bin/

setlocal enabledelayedexpansion

REM Определение директорий
set "FORESTER_DIR=%~dp0"
set "FORESTER_DIR=%FORESTER_DIR:~0,-1%"
cd /d "%FORESTER_DIR%"
cd ..
set "PROJECT_ROOT=%CD%"
cd /d "%FORESTER_DIR%"
set "BUILD_DIR=%FORESTER_DIR%\build"
set "TARGET_DIR=%PROJECT_ROOT%\installer\forester\windows\bin"

echo ==========================================
echo   Сборка бинарника Forester (Windows, Go)
echo   (CLI only - для аддона Blender)
echo ==========================================
echo.
echo Директория исходников: %FORESTER_DIR%
echo Директория сборки: %BUILD_DIR%
echo Целевая директория: %TARGET_DIR%
echo.

REM Проверка зависимостей
echo === Проверка зависимостей ===

REM Проверка Go
where go >nul 2>&1
if errorlevel 1 (
    echo [X] Go не найден!
    echo Установите Go:
    echo   winget install GoLang.Go
    echo   choco install golang
    echo   Или скачайте с https://go.dev/dl/
    exit /b 1
)

for /f "tokens=3" %%i in ('go version 2^>^&1') do set "GO_VERSION=%%i"
echo [OK] Go найден: %GO_VERSION%

REM Проверка версии Go (требуется 1.21+)
for /f "tokens=3" %%i in ('go version 2^>^&1') do (
    set "VERSION_STR=%%i"
    set "VERSION_STR=!VERSION_STR:go=!"
    for /f "tokens=1,2 delims=." %%a in ("!VERSION_STR!") do (
        set "GO_MAJOR=%%a"
        set "GO_MINOR=%%b"
    )
)

if defined GO_MAJOR (
    if !GO_MAJOR! lss 1 (
        echo [X] Требуется Go 1.21 или выше!
        echo   Текущая версия: %GO_VERSION%
        exit /b 1
    )
    if !GO_MAJOR! equ 1 (
        if defined GO_MINOR (
            if !GO_MINOR! lss 21 (
                echo [X] Требуется Go 1.21 или выше!
                echo   Текущая версия: %GO_VERSION%
                exit /b 1
            )
        )
    )
) else (
    echo [W] Не удалось определить версию Go, продолжаем...
    echo   Убедитесь, что установлена версия Go 1.21 или выше
)

echo.

REM Загрузка зависимостей
echo === Загрузка зависимостей ===
cd /d "%FORESTER_DIR%"
go mod download
if errorlevel 1 (
    echo [X] Ошибка загрузки зависимостей!
    exit /b 1
)

go mod tidy
if errorlevel 1 (
    echo [X] Ошибка при tidy зависимостей!
    exit /b 1
)

echo.

REM Сборка проекта
echo === Сборка проекта ===
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

REM Сборка с версией
if "%VERSION%"=="" set "VERSION=0.7.5"

REM Получение времени сборки (UTC)
for /f "delims=" %%i in ('powershell -Command "Get-Date -Format \"yyyy-MM-dd_HH:mm:ss\" -AsUTC"') do set "BUILD_TIME=%%i"

REM Получение Git commit
git rev-parse --short HEAD >nul 2>&1
if errorlevel 1 (
    set "GIT_COMMIT=unknown"
) else (
    for /f %%i in ('git rev-parse --short HEAD 2^>nul') do set "GIT_COMMIT=%%i"
)

set "LDFLAGS=-X main.Version=%VERSION% -X main.BuildTime=%BUILD_TIME% -X main.GitCommit=%GIT_COMMIT%"
set "BINARY_PATH=%BUILD_DIR%\forester.exe"

go build -ldflags "%LDFLAGS%" -o "%BINARY_PATH%" ./cmd/forester

if errorlevel 1 (
    echo [X] Ошибка сборки!
    exit /b 1
)

if not exist "%BINARY_PATH%" (
    echo [X] Бинарник не найден после сборки!
    echo Ожидаемый путь: %BINARY_PATH%
    exit /b 1
)

echo [OK] Сборка завершена: %BINARY_PATH%

echo.
echo === Запуск тестов ===
go test ./... >nul 2>&1
if errorlevel 1 (
    echo [W] Некоторые тесты не прошли (продолжаем установку)
) else (
    echo [OK] Тесты пройдены
)

echo.
echo === Копирование бинарника в installer/forester/windows/bin/ ===

REM Проверка исходного файла
if not exist "%BINARY_PATH%" (
    echo [X] Исходный бинарник не найден: %BINARY_PATH%
    exit /b 1
)

echo Исходный файл: %BINARY_PATH%

REM Создание целевой директории
if not exist "%TARGET_DIR%" (
    echo Создание директории: %TARGET_DIR%
    if not exist "%PROJECT_ROOT%\installer" mkdir "%PROJECT_ROOT%\installer"
    if not exist "%PROJECT_ROOT%\installer\forester" mkdir "%PROJECT_ROOT%\installer\forester"
    if not exist "%PROJECT_ROOT%\installer\forester\windows" mkdir "%PROJECT_ROOT%\installer\forester\windows"
    if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
    if not exist "%TARGET_DIR%" (
        echo [X] Не удалось создать целевую директорию: %TARGET_DIR%
        exit /b 1
    )
    echo [OK] Директория создана
)

set "TARGET_FILE=%TARGET_DIR%\forester.exe"
echo Целевой файл: %TARGET_FILE%

REM Копирование файла (пробуем несколько методов)
echo Копирование файла...
echo   Из: %BINARY_PATH%
echo   В: %TARGET_FILE%
echo.

REM Метод 1: copy (основной метод)
echo Выполняю: copy /Y "%BINARY_PATH%" "%TARGET_FILE%"
copy /Y "%BINARY_PATH%" "%TARGET_FILE%"
set "COPY_SUCCESS=0"
if errorlevel 1 (
    set "COPY_SUCCESS=1"
    echo [W] copy не удался, пробую xcopy...
    
    REM Метод 2: xcopy
    xcopy /Y "%BINARY_PATH%" "%TARGET_DIR%\" >nul 2>&1
    if errorlevel 1 (
        set "COPY_SUCCESS=1"
        echo [W] xcopy не удался, пробую robocopy...
        
        REM Метод 3: robocopy
        robocopy "%BUILD_DIR%" "%TARGET_DIR%" forester.exe /NFL /NDL /NJH /NJS >nul 2>&1
        if errorlevel 8 (
            set "COPY_SUCCESS=1"
            echo [W] robocopy не удался, пробую PowerShell...
            
            REM Метод 4: PowerShell
            powershell -Command "Copy-Item -Path '%BINARY_PATH%' -Destination '%TARGET_FILE%' -Force" 2>nul
            if errorlevel 1 (
                set "COPY_SUCCESS=1"
            ) else (
                set "COPY_SUCCESS=0"
                echo [OK] Файл скопирован через PowerShell
            )
        ) else (
            set "COPY_SUCCESS=0"
            echo [OK] Файл скопирован через robocopy
        )
    ) else (
        set "COPY_SUCCESS=0"
        echo [OK] Файл скопирован через xcopy
    )
) else (
    set "COPY_SUCCESS=0"
    echo [OK] Файл скопирован через copy
)

if !COPY_SUCCESS! equ 1 (
    echo [X] Все методы копирования не удались!
    echo   Из: %BINARY_PATH%
    echo   В: %TARGET_FILE%
    echo.
    echo Проверка файлов:
    if exist "%BINARY_PATH%" (
        echo   Исходный файл существует
        dir "%BINARY_PATH%"
    ) else (
        echo   [X] Исходный файл НЕ существует!
    )
    pause
    exit /b 1
)

REM Финальная проверка
if not exist "%TARGET_FILE%" (
    echo [X] Файл не найден после копирования!
    echo Ожидаемый путь: %TARGET_FILE%
    echo Проверка директорий:
    echo   BUILD_DIR: %BUILD_DIR%
    dir "%BUILD_DIR%\forester.exe" 2>nul
    echo   TARGET_DIR: %TARGET_DIR%
    dir "%TARGET_DIR%" 2>nul
    exit /b 1
)

echo [OK] Бинарник успешно скопирован: %TARGET_FILE%

echo.
echo === Проверка бинарника ===

REM Проверка бинарника
if exist "%TARGET_FILE%" (
    echo [OK] Бинарник найден: %TARGET_FILE%
    
    REM Попытка получить версию
    "%TARGET_FILE%" --version >nul 2>&1
    if errorlevel 1 (
        REM Попытка запустить help
        "%TARGET_FILE%" --help >nul 2>&1
        if errorlevel 1 (
            echo [W] Не удалось проверить работу бинарника
        ) else (
            echo [OK] Бинарник работает (help доступен)
        )
    ) else (
        for /f "delims=" %%i in ('"%TARGET_FILE%" --version 2^>nul') do (
            echo [OK] Версия: %%i
            goto version_found
        )
        :version_found
    )
) else (
    echo [X] Бинарник не найден в целевой директории!
    echo Ожидаемый путь: %TARGET_FILE%
    exit /b 1
)

REM Очистка временных файлов
echo.
echo === Очистка временных файлов ===

REM Очистка бинарника из build директории
if exist "%BINARY_PATH%" (
    del /F /Q "%BINARY_PATH%" >nul 2>&1
    echo [OK] Временный бинарник удален из %BUILD_DIR%
)

REM Очистка бинарника из корня (если случайно создан)
set "rootBinary=%FORESTER_DIR%\forester.exe"
if exist "%rootBinary%" (
    del /F /Q "%rootBinary%" >nul 2>&1
    echo [OK] Бинарник удален из корня проекта
)

REM Очистка bin директории (если существует)
set "binDir=%FORESTER_DIR%\bin"
if exist "%binDir%" (
    rd /S /Q "%binDir%" >nul 2>&1
    echo [OK] Директория bin/ очищена
)

echo.
echo ==========================================
echo   [OK] Сборка завершена успешно!
echo ==========================================
echo.
echo Бинарник: %TARGET_FILE%
echo.

REM Показываем финальную информацию
if exist "%TARGET_FILE%" (
    echo Финальная проверка:
    dir "%TARGET_FILE%"
    echo.
    echo [OK] Все готово! Бинарник находится в:
    echo   %TARGET_FILE%
) else (
    echo [X] ОШИБКА: Бинарник не найден в целевой директории!
    echo Ожидаемый путь: %TARGET_FILE%
    echo.
    pause
    exit /b 1
)

echo.
pause

endlocal
