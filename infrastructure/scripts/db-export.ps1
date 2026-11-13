<#
.SYNOPSIS
  Export dữ liệu (data-only) từ PostgreSQL local (container Docker) ra file .sql NGOÀI repo.

.DESCRIPTION
  Theo đúng quy trình §4 của backend/docs/cloud-data-plan.md:
    pg_dump --data-only --no-owner --no-privileges, bỏ _prisma_migrations, refresh_tokens,
    password_reset_tokens (D4). File được ghi trong container rồi `docker cp` ra, vì dấu `>`
    của PowerShell 5.1 lưu UTF-16 mà psql không đọc được.
  In danh sách migration của database local để so với Cloud SQL trước khi import.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File infrastructure\scripts\db-export.ps1
  powershell -ExecutionPolicy Bypass -File infrastructure\scripts\db-export.ps1 -OutFile D:\backup\eduline-data.sql
#>
[CmdletBinding()]
param(
  [string]$OutFile = (Join-Path ([Environment]::GetFolderPath('Desktop')) ("eduline-data-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))),
  [string]$Container = 'eduline-postgres',
  [string]$DbUser = 'eduline',
  [string]$DbName = 'eduline'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 3

# PowerShell 5.1: với ErrorActionPreference=Stop, mọi dòng stderr của chương trình ngoài
# thành lỗi. Chạy lệnh ngoài với Continue và chỉ xét exit code.
function Invoke-Native([string]$What, [scriptblock]$Cmd) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { $out = & $Cmd } finally { $ErrorActionPreference = $prev }
  if ($LASTEXITCODE -ne 0) { throw "$What thất bại (exit $LASTEXITCODE)" }
  return $out
}

# 1. File đích phải nằm ngoài repo (D4: file export không bao giờ vào git)
$OutFile = [IO.Path]::GetFullPath($OutFile)
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ($OutFile.StartsWith($repoRoot.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw "OutFile nằm trong repo ($repoRoot). Chọn đường dẫn ngoài repo, ví dụ Desktop."
}
if (Test-Path $OutFile) { throw "File đã tồn tại: $OutFile" }
$outDir = Split-Path $OutFile -Parent
if (-not (Test-Path $outDir)) { throw "Thư mục không tồn tại: $outDir" }

# 2. Container phải đang chạy
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
$running = docker inspect -f '{{.State.Running}}' $Container 2>$null
$ErrorActionPreference = $prev
if ($running -ne 'true') { throw "Container $Container không chạy. Chạy: cd infrastructure; docker compose up -d" }

# 3. pg_dump trong container, rồi copy ra
$tmp = "/tmp/eduline-export-$PID.sql"
Write-Host "pg_dump $DbName từ container $Container ..."
Invoke-Native 'pg_dump' {
  docker exec $Container pg_dump -U $DbUser -d $DbName --data-only --no-owner --no-privileges `
    --exclude-table=_prisma_migrations --exclude-table=refresh_tokens --exclude-table=password_reset_tokens `
    -f $tmp
} | Out-Null
try {
  Invoke-Native 'docker cp' { docker cp "${Container}:$tmp" $OutFile } | Out-Null
} finally {
  Invoke-Native 'xóa file tạm trong container' { docker exec $Container rm -f $tmp } | Out-Null
}

# 4. Kiểm tra nhanh: không có bảng phiên đăng nhập
$bad = Select-String -Path $OutFile -Pattern '^COPY public\.(refresh_tokens|password_reset_tokens|_prisma_migrations) ' -Encoding UTF8
if ($bad) { Remove-Item $OutFile -Force; throw "File export chứa bảng bị cấm, đã xóa file." }

# 5. Số dòng mỗi bảng (đếm dòng dữ liệu trong khối COPY) và danh sách migration
$counts = [ordered]@{}; $cur = $null; $n = 0
foreach ($line in [IO.File]::ReadLines($OutFile)) {
  if ($null -eq $cur) {
    if ($line -match '^COPY public\.(\w+) ') { $cur = $Matches[1]; $n = 0 }
  } elseif ($line -eq '\.') { $counts[$cur] = $n; $cur = $null } else { $n++ }
}

Write-Host ""
Write-Host "Đã ghi: $OutFile ($([math]::Round((Get-Item $OutFile).Length / 1KB)) KB)"
Write-Host "Số dòng: users=$($counts['users']) courses=$($counts['courses']) enrollments=$($counts['enrollments'])"
Write-Host ""
Write-Host "Migration của database local (phải giống hệt trên Cloud SQL):"
Invoke-Native 'psql' { docker exec $Container psql -U $DbUser -d $DbName -tAc 'select migration_name from _prisma_migrations where finished_at is not null order by 1' }
Write-Host ""
Write-Host "File chứa email và hash mật khẩu: không commit, không gửi qua chat. Xóa sau khi import."
