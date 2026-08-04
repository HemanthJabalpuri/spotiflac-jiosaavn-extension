# Packages the extension into jiosaavn.spotiflac-ext
# Usage:  powershell -ExecutionPolicy Bypass -File build.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$manifest = Get-Content manifest.json -Raw | ConvertFrom-Json
$version  = $manifest.version
$out      = "jiosaavn-$version.spotiflac-ext"
$zip      = "jiosaavn-$version.zip"

Remove-Item $zip, $out -ErrorAction SilentlyContinue

$files = @("manifest.json", "index.js")
if (Test-Path "icon.png") { $files += "icon.png" }

Compress-Archive -Path $files -DestinationPath $zip -CompressionLevel Optimal
Rename-Item $zip $out

Write-Host "Built $out ($((Get-Item $out).Length) bytes) - v$version"
Write-Host "Install: SpotiFLAC > Settings > Extensions > Import"
