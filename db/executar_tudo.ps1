# =====================================================================
# executar_tudo.ps1
# RH Soluções · Marco 05 · M1 (item 1.9): aplica os scripts na ordem certa.
#
# Para na primeira falha. Não recria o schema sozinho: use -Recriar para
# apagar o schema rh antes (só em base de desenvolvimento).
#
# Ordem: 001 DDL -> 003 regras -> 002 seed -> 004 retenção -> 005 agregados -> 006 derivados
# Senha: pgpass.conf do usuário, lido pelo psql. Não passar senha aqui.
#
# Uso: .\db\executar_tudo.ps1 -Base rh_db -Recriar
# =====================================================================
param(
  [string]$Psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe',
  [string]$Base = 'rh_db',
  [string]$Usuario = 'postgres',
  [string]$Servidor = 'localhost',
  [int]$Porta = 5432,
  [switch]$Recriar
)

$ErrorActionPreference = 'Stop'
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$ordem = @('001_ddl_recorte.sql', '003_regras_semanticas.sql', '002_seed_demo.sql',
           '004_retencao.sql', '005_agregados_invalidacao.sql', '006_derivados_auditoria.sql')

$argsBase = @('-h', $Servidor, '-p', $Porta, '-U', $Usuario, '-d', $Base, '-w', '-v', 'ON_ERROR_STOP=1')

if ($Recriar) {
  Write-Host "Recriando o schema rh em $Base..."
  & $Psql @argsBase -c 'DROP SCHEMA IF EXISTS rh CASCADE;'
  if ($LASTEXITCODE -ne 0) { throw "Falha ao apagar o schema (código $LASTEXITCODE)." }
}

foreach ($arquivo in $ordem) {
  $caminho = Join-Path $pasta $arquivo
  Write-Host "Aplicando $arquivo ..."
  & $Psql @argsBase -f $caminho
  if ($LASTEXITCODE -ne 0) {
    throw "Parou em $arquivo (código $LASTEXITCODE). Os scripts seguintes não foram aplicados."
  }
}
Write-Host "Todos os scripts aplicados com sucesso."
