Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Set environment
Set env = shell.Environment("Process")
env("BEDROCK_CHAT_PASSPHRASE") = "otto-bedrock-2026"
env("NO_PROXY") = "*"

' Start server (minimized console, /c so window closes on exit)
shell.Run "cmd /c cd /d """ & scriptDir & """ && python run.py", 7, False

' Poll health endpoint until server is ready (max 30s)
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
ready = False
For i = 1 To 30
    On Error Resume Next
    http.Open "GET", "http://127.0.0.1:8080/api/health", False
    http.Send
    If Err.Number = 0 And http.Status = 200 Then
        ready = True
    End If
    On Error GoTo 0
    If ready Then Exit For
    WScript.Sleep 1000
Next

If ready Then
    shell.Run "http://127.0.0.1:8080", 1, False
End If
