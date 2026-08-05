# HERMES CENTRAL JULIANA - SCRIPT DE BACKUP E EXPORTAÇÃO DOCKER
param(
    [string]$OutputDir = "D:\WORKSPACE\SANDBOX\apps\hermes-juliana\dist"
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[HERMES BACKUP & DOCKER SAVE] INICIANDO PROCESSO" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "hermes-juliana-bundle-$timestamp.zip"
$targetZip = Join-Path $OutputDir $archiveName

Write-Host "1. Gerando bundle zip de arquivos do projeto..." -ForegroundColor Green
Compress-Archive -Path "D:\WORKSPACE\SANDBOX\apps\hermes-juliana\*" -DestinationPath $targetZip -Force

Write-Host "2. Criando registro de manifesto de exportação..." -ForegroundColor Green
$manifest = @{
    system = "HERMES_GATEWAY_JULIANA"
    version = "4.2.0"
    exported_at = (Get-Date -Format "o")
    git_identity = "AXION Enterprise <axionenterprise777@gmail.com>"
    files_included = @("public/", "prompts/", "lib/", "docs/", "server.js", "Dockerfile", "docker-compose.yml")
} | ConvertTo-Json

Set-Content -Path (Join-Path $OutputDir "export_manifest.json") -Value $manifest

Write-Host "==================================================" -ForegroundColor Green
Write-Host "[SUCESSO] BACKUP E MANIFESTO DE MIGRAÇÃO GERADOS:" -ForegroundColor Green
Write-Host "Target: $targetZip" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
