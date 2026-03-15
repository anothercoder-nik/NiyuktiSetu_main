using System;
using System.Runtime.InteropServices;
class R {
    [DllImport("user32.dll")] static extern int FindWindow(string c, string w);
    [DllImport("user32.dll")] static extern int ShowWindow(int h, int cmd);
    static void Main() {
        ShowWindow(FindWindow("Shell_TrayWnd", ""), 5);
        ShowWindow(FindWindow("Shell_SecondaryTrayWnd", ""), 5);
        Console.WriteLine("Taskbar restored!");
    }
}
