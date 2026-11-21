# =====================================================================
# rodar_rotinas.ps1
# RH Soluções · Marco 05 · M1 (item 1.7): agendador das rotinas do banco (DA12)
#
# Roda: retenção dos check-ins, desligados, expurgo do log e recálculo dos agregados.
# O código de saída vem do processo psql (Start-Process), não do pipe de saída,
# que no PowerShell 5.1 pode acusar erro mesmo quando o psql termina bem.
#
# Falhas seguidas são contadas em estado\falhas.txt. Na terceira, grava um
# aviso operacional para o RH (M001) na tabela notificacao. Uma execução
# bem-sucedida zera a contagem.
#
# Senha: pgpass.conf do usuário (%APPDATA%\postgresql\pgpass.conf), lido pelo psql.
# =====================================================================

param(
  [string]$Psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe',
  [string]$Base = 'rh_db',
  [string]$Usuario = 'postgres',
  [string]$Servidor = 'localhost',
  [int]$Porta = 5432
)

$ErrorActionPreference = 'Stop'
$raiz   = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $raiz 'agendador\logs'
$estDir = Join-Path $raiz 'agendador\estado'
New-Item -ItemType Directory -Force -Path $logDir, $estDir | Out-Null

$log    = Join-Path $logDir ('rotinas_' + (Get-Date -Format 'yyyyMMdd') + '.log')
$falhas = Join-Path $estDir 'falhas.txt'

function Invoke-Psql([string]$sqlTexto) {
  # Grava o SQL em arquivo temporário: evita problemas de aspas e quebras de linha na linha de comando.
  $sqlArq = [System.IO.Path]::GetTempFileName()
  $outArq = [System.IO.Path]::GetTempFileName()
  $errArq = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($sqlArq, $sqlTexto, (New-Object System.Text.UTF8Encoding($false)))
    $p = Start-Process -FilePath $Psql -NoNewWindow -Wait -PassThru `
         -ArgumentList @('-h', $Servidor, '-p', $Porta, '-U', $Usuario, '-d', $Base,
                         '-w', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-f', $sqlArq) `
         -RedirectStandardOutput $outArq -RedirectStandardError $errArq
    $texto = (Get-Content $outArq -Raw -ErrorAction SilentlyContinue) + (Get-Content $errArq -Raw -ErrorAction SilentlyContinue)
    return [pscustomobject]@{ Codigo = $p.ExitCode; Texto = $texto }
  } finally {
    Remove-Item $sqlArq, $outArq, $errArq -ErrorAction SilentlyContinue
  }
}

$rotinas = @'
SELECT 'checkins: '   || retencao_anonimizar_checkins();
SELECT 'desligados: ' || retencao_anonimizar_desligados();
SELECT 'log: '        || retencao_expurgar_log();
SELECT 'agregados: '  || agregado_recalcular_pendentes();
'@

"[$((Get-Date).ToString('s'))] início" | Add-Content $log
$r = Invoke-Psql $rotinas
$r.Texto | Add-Content $log
"[$((Get-Date).ToString('s'))] fim, código $($r.Codigo)" | Add-Content $log

if ($r.Codigo -eq 0) {
  Set-Content -Path $falhas -Value 0
  exit 0
}

$seguidas = 0
if (Test-Path $falhas) { $seguidas = [int](Get-Content $falhas | Select-Object -First 1) }
$seguidas++
Set-Content -Path $falhas -Value $seguidas

if ($seguidas -ge 3) {
  $aviso = @'
INSERT INTO notificacao (matricula, tipo, canal, mensagem, situacao)
VALUES ('M001', 'aviso operacional', 'sistema',
        'Rotinas do banco falharam 3 vezes seguidas. Ver o log do agendador.', 'pendente');
'@
  $ra = Invoke-Psql $aviso
  $ra.Texto | Add-Content $log
  Add-Content $log "AVISO AO RH: gravado=$($ra.Codigo -eq 0) após $seguidas falhas seguidas."
}
exit 1
