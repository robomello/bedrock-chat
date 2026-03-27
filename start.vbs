Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Set environment
Set env = shell.Environment("Process")
env("BEDROCK_CHAT_PASSPHRASE") = "otto-bedrock-2026"
env("NO_PROXY") = "*"

' Open browser after short delay
shell.Run "cmd /c timeout /t 3 /nobreak >nul && start http://127.0.0.1:8080", 0, False

' Start server (minimized console)
shell.Run "cmd /k cd /d """ & scriptDir & """ && python run.py", 7, False
