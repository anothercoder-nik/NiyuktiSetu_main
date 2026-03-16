# NiyuktiSetu Kiosk Keyboard Guard
# Blocks Alt+Tab, Windows key, and other system shortcuts at the OS level
# Uses Windows Low-Level Keyboard Hook (WH_KEYBOARD_LL)

Add-Type -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class KeyboardGuard {
    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);
    
    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);
    
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);
    
    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);
    
    [DllImport("kernel32.dll")]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    // Taskbar manipulation
    [DllImport("user32.dll")]
    private static extern int FindWindow(string className, string windowText);
    
    [DllImport("user32.dll")]
    private static extern int ShowWindow(int hwnd, int command);

    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_SYSKEYDOWN = 0x0104;
    
    // Virtual key codes
    private const int VK_TAB = 0x09;
    private const int VK_ESCAPE = 0x1B;
    private const int VK_LWIN = 0x5B;
    private const int VK_RWIN = 0x5C;
    private const int VK_F4 = 0x73;
    
    private static IntPtr hookId = IntPtr.Zero;
    private static LowLevelKeyboardProc hookProc;
    private static bool allowAltF4 = true;

    public static void HideTaskbar() {
        int hwnd = FindWindow("Shell_TrayWnd", "");
        ShowWindow(hwnd, 0); // SW_HIDE
    }

    public static void ShowTaskbar() {
        int hwnd = FindWindow("Shell_TrayWnd", "");
        ShowWindow(hwnd, 5); // SW_SHOW
    }

    public static void Start() {
        hookProc = HookCallback;
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            hookId = SetWindowsHookEx(WH_KEYBOARD_LL, hookProc, GetModuleHandle(curModule.ModuleName), 0);
        }
        Console.WriteLine("[GUARD] Keyboard guard active - blocking system shortcuts");
        Application.Run();
    }

    public static void Stop() {
        if (hookId != IntPtr.Zero) {
            UnhookWindowsHookEx(hookId);
            hookId = IntPtr.Zero;
        }
        Application.ExitThread();
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int vkCode = Marshal.ReadInt32(lParam);
            bool alt = (Control.ModifierKeys & Keys.Alt) != 0;
            bool ctrl = (Control.ModifierKeys & Keys.Control) != 0;

            // Block Windows keys
            if (vkCode == VK_LWIN || vkCode == VK_RWIN) {
                return (IntPtr)1;
            }

            // Block Alt+Tab
            if (alt && vkCode == VK_TAB) {
                return (IntPtr)1;
            }
            
            // Block Alt+Escape
            if (alt && vkCode == VK_ESCAPE) {
                return (IntPtr)1;
            }
            
            // Block Ctrl+Escape (Start menu)
            if (ctrl && vkCode == VK_ESCAPE) {
                return (IntPtr)1;
            }

            // Allow Alt+F4 (invigilator exit only)
            // This is the only way to exit kiosk
        }
        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }
}
"@ -ReferencedAssemblies System.Windows.Forms

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NiyuktiSetu Keyboard Guard Active" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Blocking: Win key, Alt+Tab, Ctrl+Esc" -ForegroundColor Yellow
Write-Host "  Exit:     Alt+F4 in Chrome" -ForegroundColor Green
Write-Host "  Stop guard: Close this PowerShell window" -ForegroundColor Red
Write-Host ""

# Hide the taskbar
[KeyboardGuard]::HideTaskbar()
Write-Host "[GUARD] Taskbar hidden" -ForegroundColor Yellow

# Register cleanup
Register-EngineEvent PowerShell.Exiting -Action {
    [KeyboardGuard]::ShowTaskbar()
    [KeyboardGuard]::Stop()
    Write-Host "[GUARD] Taskbar restored, keyboard unlocked" -ForegroundColor Green
}

# Start the keyboard hook (this blocks until Application.ExitThread is called)
[KeyboardGuard]::Start()
