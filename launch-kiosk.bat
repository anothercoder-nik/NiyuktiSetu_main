@echo off
title NiyuktiSetu - Secure Interview Kiosk
echo ============================================
echo   NiyuktiSetu - Government Interview Kiosk
echo ============================================
echo.
echo  SECURE MODE: Alt+Tab, Windows key, and
echo  taskbar will be DISABLED.
echo.
echo  To EXIT: Press Alt+F4 in Chrome
echo.

SET APP_URL=http://localhost:3000/sign-in
SET CHROME_PATH=
SET SCRIPT_DIR=%~dp0

REM Try common Chrome installation paths
IF EXIST "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    SET "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
IF EXIST "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    SET "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
IF EXIST "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    SET "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

IF "%CHROME_PATH%"=="" (
    echo [ERROR] Google Chrome not found!
    pause
    exit /b 1
)

echo Found Chrome: %CHROME_PATH%
echo.

REM --- Start the compiled keyboard guard ---
echo Starting Keyboard Guard (blocking Alt+Tab, Win key, hiding taskbar)...
start "" "%SCRIPT_DIR%KioskGuard.exe"
timeout /t 2 >nul

REM --- Launch Chrome in kiosk mode ---
echo Launching Chrome kiosk...
"%CHROME_PATH%" --kiosk --disable-pinch --overscroll-history-navigation=0 --disable-features=TranslateUI --disable-extensions --disable-infobars --disable-session-crashed-bubble --noerrdialogs --disable-restore-session-state --user-data-dir="%TEMP%\NiyuktiSetu_Kiosk" "%APP_URL%"

REM --- Chrome was closed, now clean up ---
echo.
echo Chrome closed. Stopping keyboard guard...
taskkill /IM KioskGuard.exe /F >nul 2>&1

REM Restore taskbar as safety fallback
powershell -Command "[System.Runtime.InteropServices.Marshal]::GetDelegateForFunctionPointer((Add-Type -MemberDefinition '[DllImport(\"user32.dll\")] public static extern int FindWindow(string c, string w); [DllImport(\"user32.dll\")] public static extern int ShowWindow(int h, int cmd);' -Name W -PassThru)::FindWindow('Shell_TrayWnd',''), [Action]).Invoke()" >nul 2>&1
powershell -Command "Add-Type 'using System.Runtime.InteropServices; public class TBR { [DllImport(\"user32.dll\")] public static extern int FindWindow(string c,string w); [DllImport(\"user32.dll\")] public static extern int ShowWindow(int h,int c); }'; [TBR]::ShowWindow([TBR]::FindWindow('Shell_TrayWnd',''),5)" >nul 2>&1

REM Clean up temp profile
rmdir /s /q "%TEMP%\NiyuktiSetu_Kiosk" 2>nul

echo.
echo ============================================
echo  Kiosk session ended.
echo  Taskbar restored. Keyboard unlocked.
echo  Session data cleared.
echo ============================================
timeout /t 5 >nul
