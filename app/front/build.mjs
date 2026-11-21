#!/usr/bin/env node
// Build dos estáticos (item 2.7). Sem dependências: copia o cliente para o diretório de saída
// e gera config.js de produção. O servidor de desenvolvimento (dev/) e os testes NÃO vão para a saída.
//
//   FRONT_DIST=<diretório de estáticos do Nginx, K8> node build.mjs
//
// Sem FRONT_DIST o destino é ./dist. O valor de K8 ainda não foi informado ao M2.
import { cpSync, rmSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(process.env.FRONT_DIST || join(aqui, 'dist'));
const apiBase = process.env.API_BASE || '/api';

if (destino === aqui || aqui.startsWith(destino + sep) || destino === resolve('/')) {
  console.error(`Destino inseguro: ${destino}`); process.exit(1);
}
const EXCLUIR = new Set(['build.mjs', 'README.md', 'dist', 'node_modules', 'docs', 'testes', 'dev', 'config.js']);

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
cpSync(aqui, destino, { recursive: true, filter: src => !EXCLUIR.has(src.split(sep).pop()) || src === aqui });

writeFileSync(join(destino, 'config.js'), `// Gerado por build.mjs. Não editar.
window.APP_CONFIG = { API_BASE: ${JSON.stringify(apiBase)} };
`);

const arquivos = [];
(function varrer(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    statSync(p).isDirectory() ? varrer(p) : arquivos.push(p);
  }
})(destino);
const hash = createHash('sha256');
for (const a of arquivos.sort()) hash.update(relative(destino, a)).update(readFileSync(a));
writeFileSync(join(destino, 'build-info.json'), JSON.stringify({ arquivos: arquivos.length, sha256: hash.digest('hex').slice(0, 16) }, null, 2) + '\n');
console.log(`Build ok: ${arquivos.length} arquivos em ${destino}`);
