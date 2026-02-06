# Runs the hotspot pipeline with .env.local loaded
$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Get-Content .env.local | ForEach-Object {
  if ($_ -match '^(\w+)=(.*)$') {
    $name = $matches[1]
    $value = $matches[2].Trim('"')
    Set-Item -Path Env:$name -Value $value
  }
}

npm run hotspots -- --threshold 3 --grid 0.01
