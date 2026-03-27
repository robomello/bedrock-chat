$desktop = [Environment]::GetFolderPath("Desktop")
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Bedrock Chat (start) shortcut ---
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$desktop\Bedrock Chat.lnk")
$lnk.TargetPath = "wscript.exe"
$lnk.Arguments = """$root\start.vbs"""
$lnk.WorkingDirectory = $root
$lnk.Description = "Launch Bedrock Chat"
# Icon 176 = chat bubble in imageres.dll
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,176"
$lnk.WindowStyle = 7  # minimized
$lnk.Save()

Write-Host "Created: Bedrock Chat shortcut on Desktop"
