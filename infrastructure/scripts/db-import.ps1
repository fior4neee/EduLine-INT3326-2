<#
.SYNOPSIS
  Nạp file export (db-export.ps1) vào một database trên Cloud SQL `eduline-db`, chạy từ laptop Windows.

.DESCRIPTION
  Các bước (cloud-data-plan §4, 5.4):
    0. Kiểm tra file: UTF-8, chỉ có lệnh dữ liệu (SET / set_config / setval / COPY / INSERT),
       không có refresh_tokens, password_reset_tokens, _prisma_migrations (D4).
    1. Database `eduline` (thật) phải gõ lại tên để xác nhận (D5).
    2. Instance phải RUNNABLE.
    3. `gcloud sql backups create` (backup on-demand trước khi xóa dữ liệu).
    4. Bật cloud-sql-proxy (--gcloud-auth, 127.0.0.1:<Port>), log ra file trong %TEMP%.
    5. In danh sách migration; dừng nếu khác backend/prisma/migrations.
    6. TRUNCATE mọi bảng trừ _prisma_migrations VÀ nạp file, trong CÙNG một transaction
       (--single-transaction, ON_ERROR_STOP=1): lỗi ở bất kỳ đâu thì không đổi gì.
    7. In số dòng users / courses / enrollments, so với file.
       7b. Mọi sequence (cột id tự tăng) phải đi trước max(id); sai thì báo lỗi kèm lệnh sửa.
    8. Tắt proxy (kể cả khi lỗi).

  psql chạy bằng container `postgres:16`, nối tới proxy qua host.docker.internal.
  Thông tin đăng nhập lấy từ secret `database-url` vào biến môi trường PG* của process này
  (không in ra, không ghi file) và bị xóa khi script kết thúc.

  Cần: gcloud đã đăng nhập (quyền cloudsql.client, secretAccessor trên database-url,
  cloudsql.backupRuns.create), Docker Desktop đang chạy.

.EXAMPLE
  .\infrastructure\scripts\db-import.ps1 -Database eduline_staging -File "$HOME\Desktop\eduline-data.sql"
  .\infrastructure\scripts\db-import.ps1 -Database eduline -File "$HOME\Desktop\eduline-data.sql"   # hỏi gõ "eduline"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z_][a-z0-9_]*$')][string]$Database,
  [Parameter(Mandatory = $true)][string]$File,
  # Chỉ dùng khi chạy không tương tác: phải bằng đúng -Database mới được nạp vào `eduline`.
  [string]$ConfirmDatabase = '',
  [int]$Port = 5433,
  [string]$Project = 'gen-lang-client-0192726533',
  [string]$Instance = 'eduline-db',
  [string]$Region = 'asia-southeast1',
  [string]$Secret = 'database-url',
  [string]$PsqlImage = 'postgres:16',
  [string]$ProxyVersion = 'v2.14.1'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 3
$ProtectedDatabase = 'eduline'
$ForbiddenTables = @('refresh_tokens', 'password_reset_tokens', '_prisma_migrations')
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))

# PowerShell 5.1: với ErrorActionPreference=Stop, mọi dòng stderr của chương trình ngoài
# thành lỗi. Chạy lệnh ngoài với Continue và chỉ xét exit code.
function Invoke-Native([string]$What, [scriptblock]$Cmd) {
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  try { $out = & $Cmd } finally { $ErrorActionPreference = $prev }
  if ($LASTEXITCODE -ne 0) { throw "$What thất bại (exit $LASTEXITCODE)" }
  return $out
}

function Step([string]$Text) { Write-Host ""; Write-Host "== $Text" -ForegroundColor Cyan }

# Trả về số dòng dữ liệu theo bảng; throw nếu file có lệnh ngoài danh sách cho phép.
function Test-DumpFile([string]$Path) {
  $fs = [IO.File]::OpenRead($Path)
  try { $b = New-Object byte[] 2; $null = $fs.Read($b, 0, 2) } finally { $fs.Close() }
  if (($b[0] -eq 0xFF -and $b[1] -eq 0xFE) -or ($b[0] -eq 0xFE -and $b[1] -eq 0xFF)) {
    throw "File là UTF-16 (thường do dấu > của PowerShell 5.1). Export lại bằng db-export.ps1."
  }
  $allowed = @(
    '^\s*$', '^--',
    '^SET \w+ = .*;$',
    '^SELECT pg_catalog\.set_config\(.*\);$',
    '^SELECT pg_catalog\.setval\(.*\);$',
    '^\\(un)?restrict \S+$'
  )
  $counts = @{}; $cur = $null; $n = 0; $lineNo = 0
  foreach ($line in [IO.File]::ReadLines($Path)) {
    $lineNo++
    if ($null -ne $cur) {
      if ($line -eq '\.') { $counts[$cur] = $n; $cur = $null } else { $n++ }
      continue
    }
    if ($line -match '^COPY public\.(\w+) \(.*\) FROM stdin;$') {
      $cur = $Matches[1]; $n = 0
      if ($ForbiddenTables -contains $cur) { throw "Dòng ${lineNo}: file có dữ liệu bảng '$cur' (D4 cấm). Export lại bằng db-export.ps1." }
      continue
    }
    if ($line -match '^INSERT INTO public\.(\w+) .*;$') {
      if ($ForbiddenTables -contains $Matches[1]) { throw "Dòng ${lineNo}: file có dữ liệu bảng '$($Matches[1])' (D4 cấm)." }
      $counts[$Matches[1]] = 1 + [int]$counts[$Matches[1]]
      continue
    }
    $ok = $false
    foreach ($p in $allowed) { if ($line -match $p) { $ok = $true; break } }
    if (-not $ok) {
      $preview = if ($line.Length -gt 60) { $line.Substring(0, 60) + '...' } else { $line }
      throw "Dòng ${lineNo}: lệnh không phải dữ liệu, từ chối nạp: $preview"
    }
  }
  if ($null -ne $cur) { throw "File bị cắt: khối COPY $cur không có dòng kết thúc '\.'" }
  return $counts
}

function Find-Proxy {
  $cmd = Get-Command cloud-sql-proxy -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $dir = Join-Path $env:LOCALAPPDATA 'eduline-tools'
  $exe = Join-Path $dir 'cloud-sql-proxy.exe'
  if (-not (Test-Path $exe)) {
    New-Item -ItemType Directory -Force $dir | Out-Null
    $url = "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/$ProxyVersion/cloud-sql-proxy.x64.exe"
    Write-Host "Tải cloud-sql-proxy $ProxyVersion về $exe (ngoài repo) ..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $exe
  }
  return $exe
}

function Test-Port([int]$P) {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $P); return $true } catch { return $false } finally { $c.Close() }
}

function Invoke-Psql([string[]]$PsqlArgs) {
  Invoke-Native 'psql' {
    docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE -e PGAPPNAME `
      --mount "type=bind,source=$fileDir,target=/import,readonly" $PsqlImage psql -X @PsqlArgs
  }
}

# ---------------------------------------------------------------------------
$File = [IO.Path]::GetFullPath($File)
if (-not (Test-Path $File -PathType Leaf)) { throw "Không thấy file: $File" }
$fileDir = Split-Path $File -Parent
$fileName = Split-Path $File -Leaf
if ($fileDir -match ',') { throw "Đường dẫn thư mục chứa dấu phẩy, docker --mount không nhận: $fileDir" }

Step "0. Kiểm tra file $File"
$fileCounts = Test-DumpFile $File
Write-Host ("Chỉ có lệnh dữ liệu. Trong file: users={0} courses={1} enrollments={2} ({3} bảng)" -f `
  [int]$fileCounts['users'], [int]$fileCounts['courses'], [int]$fileCounts['enrollments'], $fileCounts.Count)

Step "1. Database đích: $Database"
if ($Database -eq $ProtectedDatabase) {
  Write-Host "ĐÂY LÀ DATABASE THẬT. Mọi dữ liệu hiện có sẽ bị thay bằng nội dung file (đã báo nhóm chưa? D5)." -ForegroundColor Yellow
  $typed = if ($ConfirmDatabase) { $ConfirmDatabase } else { Read-Host "Gõ '$ProtectedDatabase' để tiếp tục" }
  if ($typed -cne $Database) { throw "Không xác nhận, dừng. Chưa thay đổi gì." }
}

Step "2. Trạng thái instance $Instance"
$state = Invoke-Native 'gcloud sql instances describe' { gcloud sql instances describe $Instance --project $Project --format='value(state)' }
Write-Host "state=$state"
if ($state -ne 'RUNNABLE') { throw "Instance chưa RUNNABLE. Bật: gcloud sql instances patch $Instance --activation-policy=ALWAYS, chờ RUNNABLE rồi chạy lại." }

if (Test-Port $Port) { throw "Cổng 127.0.0.1:$Port đang bận (proxy khác đang chạy?). Tắt nó hoặc dùng -Port." }

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
Step "3. Backup on-demand trước khi nạp"
Invoke-Native 'gcloud sql backups create' {
  gcloud sql backups create --instance $Instance --project $Project --description "before import into $Database $ts"
} | Out-Null
Write-Host "Đã tạo backup 'before import into $Database $ts'."

$proxyProc = $null
$pgVars = 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'PGAPPNAME'
try {
  Step "4. Bật cloud-sql-proxy"
  $proxyExe = Find-Proxy
  $logOut = Join-Path $env:TEMP "eduline-proxy-$ts.log"
  $logErr = Join-Path $env:TEMP "eduline-proxy-$ts.err.log"
  $conn = "${Project}:${Region}:${Instance}"
  $proxyProc = Start-Process -FilePath $proxyExe -ArgumentList $conn, '--port', $Port, '--gcloud-auth' `
    -RedirectStandardOutput $logOut -RedirectStandardError $logErr -WindowStyle Hidden -PassThru
  $deadline = (Get-Date).AddSeconds(30)
  while (-not (Test-Port $Port)) {
    if ($proxyProc.HasExited) { throw "Proxy thoát (exit $($proxyProc.ExitCode)). Xem $logErr" }
    if ((Get-Date) -gt $deadline) { throw "Proxy không mở cổng $Port sau 30 s. Xem $logErr" }
    Start-Sleep -Milliseconds 500
  }
  Write-Host "Proxy PID $($proxyProc.Id) trên 127.0.0.1:$Port. Log: $logOut / $logErr"

  # Thông tin đăng nhập: từ secret, bỏ tham số riêng của Prisma, không in ra.
  $dbUrl = Invoke-Native 'đọc secret' { gcloud secrets versions access latest --secret $Secret --project $Project }
  $uri = [Uri](($dbUrl | Out-String).Trim() -replace '\?.*$', '')
  Remove-Variable dbUrl
  $userInfo = $uri.UserInfo -split ':', 2
  $env:PGUSER = [Uri]::UnescapeDataString($userInfo[0])
  $env:PGPASSWORD = [Uri]::UnescapeDataString($userInfo[1])
  Remove-Variable uri, userInfo
  $env:PGHOST = 'host.docker.internal'   # proxy trên laptop, nhìn từ container
  $env:PGPORT = "$Port"
  $env:PGDATABASE = $Database
  $env:PGSSLMODE = 'disable'             # chặng laptop -> proxy; proxy tự mã hóa tới Cloud SQL
  $env:PGAPPNAME = 'eduline-db-import'

  $who = Invoke-Psql @('-tAc', 'select current_database()')
  Write-Host "Kết nối được: database=$who"

  Step "5. Migration trên $Database"
  $cloudMig = @(Invoke-Psql @('-v', 'ON_ERROR_STOP=1', '-tAc',
      'select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null order by 1') |
    Where-Object { $_ })
  $cloudMig | ForEach-Object { Write-Host "  $_" }
  $repoMig = @(Get-ChildItem (Join-Path $repoRoot 'backend\prisma\migrations') -Directory | Sort-Object Name | ForEach-Object Name)
  $diff = Compare-Object $repoMig $cloudMig
  if ($diff) {
    $diff | ForEach-Object { Write-Host ("  {0} {1}" -f $(if ($_.SideIndicator -eq '<=') { 'chỉ có trong repo:' } else { 'chỉ có trên DB:' }), $_.InputObject) }
    throw "Migration trên $Database khác repo. Chạy prisma migrate deploy (D7) hoặc checkout đúng nhánh. Chưa xóa dữ liệu."
  }
  Write-Host "Khớp $($repoMig.Count) migration của repo."

  Step "6. TRUNCATE + nạp trong một transaction"
  $truncate = 'DO $$ DECLARE r record; BEGIN FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = ''public'' AND tablename <> ''_prisma_migrations'' LOOP EXECUTE format(''TRUNCATE TABLE %I RESTART IDENTITY CASCADE'', r.tablename); END LOOP; END $$;'
  Invoke-Psql @('-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-c', 'set client_min_messages = warning', '-c', $truncate, '-f', "/import/$fileName") | Out-Null
  Write-Host "Đã commit."

  Step "7. Số dòng trên $Database"
  $row = Invoke-Psql @('-tA', '-F', ' ', '-c',
    'select (select count(*) from users), (select count(*) from courses), (select count(*) from enrollments)')
  $c = ($row | Out-String).Trim() -split ' '
  Write-Host "users=$($c[0]) courses=$($c[1]) enrollments=$($c[2])"
  if ([int]$c[0] -ne [int]$fileCounts['users'] -or [int]$c[1] -ne [int]$fileCounts['courses'] -or [int]$c[2] -ne [int]$fileCounts['enrollments']) {
    Write-Warning "Số dòng khác với file. Kiểm tra lại trước khi báo nhóm."
  } else { Write-Host "Khớp với file." -ForegroundColor Green }
  Step "7b. Sequence phải đi trước max(id)"
  # Mọi cột mặc định nextval() trong schema public. Giá trị kế tiếp = last_value (+1 nếu
  # is_called) phải > max(id), nếu không INSERT đầu tiên trên cloud sẽ trùng khóa.
  $seqSql = @'
with cols as (
  select c.table_name, c.column_name, pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) as seq
  from information_schema.columns c
  where c.table_schema = 'public' and c.column_default like 'nextval(%'
), v as (
  select table_name, column_name, seq,
    (xpath('/row/m/text()', query_to_xml(format('select max(%I) as m from public.%I', column_name, table_name), false, true, '')))[1]::text::bigint as max_id,
    (xpath('/row/v/text()', query_to_xml(format('select last_value as v from %s', seq), false, true, '')))[1]::text::bigint as last_value,
    (xpath('/row/c/text()', query_to_xml(format('select is_called as c from %s', seq), false, true, '')))[1]::text::boolean as is_called
  from cols where seq is not null
)
select table_name, column_name, last_value, is_called, coalesce(max_id::text, '-'),
  case when max_id is null then 'ok'
       when (case when is_called then last_value + 1 else last_value end) > max_id then 'ok'
       else 'BAD' end
from v order by 1
'@
  $seqRows = @(Invoke-Psql @('-v', 'ON_ERROR_STOP=1', '-tA', '-F', ' ', '-c', ($seqSql -replace '\r?\n', ' ')) | Where-Object { $_ })
  Write-Host ("  {0,-26} {1,-6} {2,10} {3,-9} {4,8}  {5}" -f 'table', 'column', 'last_value', 'is_called', 'max(id)', '')
  $bad = 0
  foreach ($r in $seqRows) {
    $f = $r -split ' '
    if ($f[5] -ne 'ok') { $bad++ }
    Write-Host ("  {0,-26} {1,-6} {2,10} {3,-9} {4,8}  {5}" -f $f[0], $f[1], $f[2], $f[3], $f[4], $f[5])
  }
  if ($bad -gt 0) {
    throw "$bad sequence đứng sau max(id). Dữ liệu ĐÃ nạp; sửa bằng: select setval(pg_get_serial_sequence('public.<bảng>','id'), (select max(id) from public.<bảng>));"
  }
  Write-Host "Cả $($seqRows.Count) sequence đều đi trước max(id)." -ForegroundColor Green

  if ($Database -eq $ProtectedDatabase) { Write-Host "Nhắc D6: đổi mật khẩu Admin ngay." -ForegroundColor Yellow }
}
finally {
  Step "8. Dọn dẹp"
  foreach ($v in $pgVars) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }
  if ($proxyProc -and -not $proxyProc.HasExited) { Stop-Process -Id $proxyProc.Id -Force; Write-Host "Đã tắt proxy." }
}
