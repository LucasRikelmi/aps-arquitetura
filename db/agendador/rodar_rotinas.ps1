# =====================================================================
# rodar_rotinas.ps1
# RH Soluções · Marco 05 · M1: agendador das rotinas do banco (DA12)
#
# Roda, nesta ordem: retenção dos check-ins, desligados, expurgo do log e
# recálculo dos agregados pendentes. Registra o resultado em logs\.
#
# Falhas: conta falhas seguidas em estado\falhas.txt. Ao chegar a 3, grava um
# aviso operacional para o RH (M001) na tabela notificacao, e zera a contagem
# quando uma execução termina bem.
#
# Senha: vem do arquivo pgpass.conf do usuário (%APPDATA%\postgresql\pgpass.conf),
# lido automaticamente pelo psql. Não fica neste script.
# =====================================================================

param(
  [string]$Psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe',
  [string]$Base = 'rh_db',
  [string]$Usuario = 'postgres',
  [string]$Servidor = 'localhost',
  [int]$Porta = 5432
)

$raiz   = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $raiz 'agendador\logs'
$estDir = Join-Path $raiz 'agendador\estado'
New-Item -ItemType Directory -Force -Path $logDir, $estDir | Out-Null

$log    = Join-Path $logDir ("rotinas_" + (Get-Date -Format 'yyyyMMdd') + '.log')
$falhas = Join-Path $estDir 'falhas.txt'

$sql = @'
SELECT 'checkins: '   || retencao_anonimizar_checkins();
SELECT 'desligados: ' || retencao_anonimizar_desligados();
SELECT 'log: '        || retencao_expurgar_log();
SELECT 'agregados: '  || agregado_recalcular_pendentes();
'@

$inicio = Get-Date
"[$($inicio.ToString('s'))] início" | Add-Content $log
$saida = & $Psql -h $Servidor -p $Porta -U $Usuario -d $Base -w -v ON_ERROR_STOP=1 -t -A -c $sql 2>&1
$codigo = $LASTEXITCODE
$saida | Add-Content $log
"[$((Get-Date).ToString('s'))] fim, código $codigo" | Add-Content $log

if ($codigo -eq 0) {
  Set-Content -Path $falhas -Value 0
  exit 0
}

# Falha: conta e avisa o RH na terceira seguida.
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
  & $Psql -h $Servidor -p $Porta -U $Usuario -d $Base -w -v ON_ERROR_STOP=1 -c $aviso 2>&1 | Add-Content $log
  Add-Content $log "AVISO AO RH gravado após $seguidas falhas seguidas."
}
exit 1
