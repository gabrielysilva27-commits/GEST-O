param(
    [int]$Port = 8097
)

$ErrorActionPreference = "Stop"
$serverScript = Join-Path $PSScriptRoot "server\server.ps1"

& $serverScript -Port $Port
