Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Function Run(cmd)
    Run = shell.Run("cmd /c cd /d """ & scriptDir & """ && " & cmd, 1, True)
End Function

MsgBox "Bedrock Chat Setup" & vbCrLf & vbCrLf & "This will install dependencies and build the frontend." & vbCrLf & "Click OK to continue.", vbInformation, "Bedrock Chat"

' Install Python deps
shell.Popup "Installing Python dependencies...", 1, "Setup", vbInformation
Run "pip install -r requirements.txt -q && pip install anthropic -q"

' Build frontend
shell.Popup "Building frontend...", 1, "Setup", vbInformation
Run "cd frontend && npm install --silent && npm run build"

' Create .env if needed
envPath = scriptDir & "\.env"
examplePath = scriptDir & "\.env.example"
If Not fso.FileExists(envPath) And fso.FileExists(examplePath) Then
    fso.CopyFile examplePath, envPath
End If

' Create desktop shortcut
shell.Run "powershell -ExecutionPolicy Bypass -File """ & scriptDir & "\create-shortcuts.ps1""", 0, True

MsgBox "Setup complete!" & vbCrLf & vbCrLf & "1. Edit .env with your API key" & vbCrLf & "2. Double-click 'Bedrock Chat' on your Desktop", vbInformation, "Bedrock Chat"
