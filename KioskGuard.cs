using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

class KioskGuard
{
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    // Use LoadLibrary instead of GetModuleHandle - required for .NET apps
    [DllImport("kernel32.dll")]
    static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("user32.dll")]
    static extern int FindWindow(string className, string windowText);

    [DllImport("user32.dll")]
    static extern int ShowWindow(int hwnd, int command);

    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    [DllImport("kernel32.dll")]
    static extern int GetLastError();

    delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

    const int WH_KEYBOARD_LL = 13;

    const int VK_LWIN = 0x5B;
    const int VK_RWIN = 0x5C;
    const int VK_TAB = 0x09;
    const int VK_ESCAPE = 0x1B;

    static IntPtr hookId = IntPtr.Zero;
    static HookProc hookCallback;

    static IntPtr OnKeyPress(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int vkCode = Marshal.ReadInt32(lParam);
            bool altDown = (GetAsyncKeyState(0x12) & 0x8000) != 0;
            bool ctrlDown = (GetAsyncKeyState(0x11) & 0x8000) != 0;

            // Block Windows keys
            if (vkCode == VK_LWIN || vkCode == VK_RWIN)
            {
                Console.WriteLine("[BLOCKED] Windows key");
                return (IntPtr)1;
            }

            // Block Alt+Tab
            if (altDown && vkCode == VK_TAB)
            {
                Console.WriteLine("[BLOCKED] Alt+Tab");
                return (IntPtr)1;
            }

            // Block Alt+Escape
            if (altDown && vkCode == VK_ESCAPE)
            {
                Console.WriteLine("[BLOCKED] Alt+Esc");
                return (IntPtr)1;
            }

            // Block Ctrl+Escape (Start menu)
            if (ctrlDown && vkCode == VK_ESCAPE)
            {
                Console.WriteLine("[BLOCKED] Ctrl+Esc");
                return (IntPtr)1;
            }
        }
        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }

    static void HideTaskbar()
    {
        int h = FindWindow("Shell_TrayWnd", "");
        if (h != 0) ShowWindow(h, 0);
        int h2 = FindWindow("Shell_SecondaryTrayWnd", "");
        if (h2 != 0) ShowWindow(h2, 0);
    }

    static void ShowTaskbar()
    {
        int h = FindWindow("Shell_TrayWnd", "");
        if (h != 0) ShowWindow(h, 5);
        int h2 = FindWindow("Shell_SecondaryTrayWnd", "");
        if (h2 != 0) ShowWindow(h2, 5);
    }

    static void Cleanup()
    {
        ShowTaskbar();
        if (hookId != IntPtr.Zero)
        {
            UnhookWindowsHookEx(hookId);
            hookId = IntPtr.Zero;
        }
    }

    static void Main(string[] args)
    {
        Console.Title = "NiyuktiSetu Guard";
        Console.WriteLine("==========================================");
        Console.WriteLine("  NiyuktiSetu Kiosk Guard");
        Console.WriteLine("==========================================");

        Console.CancelKeyPress += (s, e) => { Cleanup(); };
        AppDomain.CurrentDomain.ProcessExit += (s, e) => { Cleanup(); };

        HideTaskbar();
        Console.WriteLine("[OK] Taskbar hidden");

        // Pin the delegate permanently
        hookCallback = new HookProc(OnKeyPress);
        GC.KeepAlive(hookCallback);

        // Use LoadLibrary("user32") - this is the KEY FIX for .NET applications
        IntPtr moduleHandle = LoadLibrary("user32");
        Console.WriteLine("[..] Module handle: " + moduleHandle);

        hookId = SetWindowsHookEx(WH_KEYBOARD_LL, hookCallback, moduleHandle, 0);

        if (hookId == IntPtr.Zero)
        {
            int err = GetLastError();
            Console.WriteLine("[FAIL] Hook failed! Error code: " + err);
            Console.WriteLine("Try running as Administrator.");
            ShowTaskbar();
            Console.ReadKey();
            return;
        }

        Console.WriteLine("[OK] Keyboard hook active (ID: " + hookId + ")");
        Console.WriteLine("[OK] Blocking: Win, Alt+Tab, Alt+Esc, Ctrl+Esc");
        Console.WriteLine("");
        Console.WriteLine("Press keys to test - blocked keys show here.");
        Console.WriteLine("Close this window to restore everything.");

        Application.Run();
    }
}
