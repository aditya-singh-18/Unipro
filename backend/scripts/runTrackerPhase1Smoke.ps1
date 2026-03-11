param(
  [string]$EnvFile = ".env.smoke"
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path $EnvFile)) {
  if (Test-Path ".env.smoke.example") {
    Copy-Item ".env.smoke.example" $EnvFile
    Write-Host "Created $EnvFile from .env.smoke.example"
    Write-Host "Fill required values in $EnvFile and run this command again."
    exit 0
  }

  Write-Error "$EnvFile not found and .env.smoke.example missing."
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }

  $parts = $line -split "=", 2
  if ($parts.Length -ne 2) { return }

  $key = $parts[0].Trim()
  $value = $parts[1].Trim()

  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  [Environment]::SetEnvironmentVariable($key, $value, "Process")
}

npm run smoke:tracker:phase1
