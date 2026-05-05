# Starts MediMatch dev servers in a robust way on Windows
# - Ensures Node is in PATH for this session
# - Uses npm.cmd to avoid PowerShell execution policy issues

$ErrorActionPreference = "Stop"

$nodeDir = "C:\Program Files\nodejs"
if ($env:Path -notlike "*C:\Program Files\nodejs*") {
  $env:Path = "$nodeDir;" + $env:Path
  Write-Host "[setup] Added Node to PATH for this session: $nodeDir"
} else {
  Write-Host "[setup] Node already in PATH for this session"
}

# Optional: sync assets (same as predev)
& "$nodeDir\node.exe" scripts\sync-assets.js

# Start dev (server + client)
& "$nodeDir\npm.cmd" run dev
