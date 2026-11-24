#!/usr/bin/env node
// Build dos estáticos (item 2.7). Sem dependências: copia o cliente para o diretório de saída
// e gera config.js de produção. O servidor de desenvolvimento (dev/) e os testes NÃO vão para a saída.
//
//   FRONT_DIST=<diretório de estáticos do Nginx, K8> node build.mjs
//
// Sem FRONT_DIST o destino é ./dist. O valor de K8 ainda não foi informado ao M2.
//
// Segurança do destino: o build nunca apaga um diretório inteiro. Se o destino já tem arquivos,
// ele só prossegue quando TODOS foram gerados por um build anterior (listados em build-info.json).
// Nesse caso apaga exatamente esses arquivos e as pastas que ficarem vazias. Qualquer arquivo
// estranho (ex.: index.nginx-debian.html, outro site, upload manual) faz o build recusar o destino.
import {
  cpSync, mkdirSync, writeFileSync, readdirSync, lstatSync, readFileSync, existsSync, unlinkSync, rmdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join, relative, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(process.env.FRONT_DIST || join(aqui, 'dist'));
const apiBase = process.env.API_BASE || '/api';
const INFO = 'build-info.json';

function falhar(msg) { console.error(msg); process.exit(1); }

if (destino === aqui || aqui.startsWith(destino + sep) || destino.startsWith(aqui + sep) && !destino.startsWith(join(aqui, 'dist'))
  || destino === resolve('/')) {
  falhar(`Destino inseguro: ${destino}`);
}
const EXCLUIR = new Set(['build.mjs', 'README.md', 'dist', 'node_modules', 'docs', 'testes', 'dev', 'config.js']);

// Lista relativa (separador "/") de tudo que existe sob d, sem seguir links simbólicos.
function listar(d) {
  const saida = [];
  (function varrer(atual) {
    for (const n of readdirSync(atual)) {
      const p = join(atual, n);
      const st = lstatSync(p);
      if (st.isDirectory()) varrer(p);
      else saida.push(relative(d, p).split(sep).join(posix.sep));
    }
  })(d);
  return saida.sort();
}

// 1. Limpeza controlada do destino.
if (existsSync(destino)) {
  if (!lstatSync(destino).isDirectory()) falhar(`Destino não é diretório: ${destino}`);
  const existentes = listar(destino);
  if (existentes.length) {
    let anteriores;
    try {
      anteriores = JSON.parse(readFileSync(join(destino, INFO), 'utf8')).lista;
    } catch { anteriores = null; }
    if (!Array.isArray(anteriores)) {
      falhar(`Destino ${destino} tem ${existentes.length} arquivo(s) e não tem ${INFO} com a lista de um build anterior. `
        + 'Recusado para não apagar arquivos de terceiros. Esvazie o diretório manualmente ou use outro FRONT_DIST.');
    }
    const permitidos = new Set([...anteriores, INFO]);
    const estranhos = existentes.filter(a => !permitidos.has(a));
    if (estranhos.length) {
      falhar(`Destino ${destino} contém arquivos que não vieram do build anterior:\n  ${estranhos.slice(0, 20).join('\n  ')}`
        + `${estranhos.length > 20 ? `\n  ... e mais ${estranhos.length - 20}` : ''}\nRecusado. Nada foi apagado.`);
    }
    for (const a of existentes) unlinkSync(join(destino, ...a.split(posix.sep)));
    // Remove só as pastas que ficaram vazias, das mais profundas para as mais rasas.
    const pastas = new Set();
    for (const a of existentes) {
      let p = posix.dirname(a);
      while (p !== '.') { pastas.add(p); p = posix.dirname(p); }
    }
    for (const p of [...pastas].sort((x, y) => y.split('/').length - x.split('/').length)) {
      const abs = join(destino, ...p.split(posix.sep));
      if (existsSync(abs) && readdirSync(abs).length === 0) rmdirSync(abs);
    }
  }
}

// 2. Cópia e config de produção.
mkdirSync(destino, { recursive: true });
cpSync(aqui, destino, { recursive: true, filter: src => src === aqui || !EXCLUIR.has(src.split(sep).pop()) });
writeFileSync(join(destino, 'config.js'), `// Gerado por build.mjs. Não editar.
window.APP_CONFIG = { API_BASE: ${JSON.stringify(apiBase)} };
`);

// 3. build-info.json com a lista exata de arquivos (usada pela limpeza do próximo build).
const lista = listar(destino).filter(a => a !== INFO);
const hash = createHash('sha256');
for (const a of lista) hash.update(a).update(readFileSync(join(destino, ...a.split(posix.sep))));
writeFileSync(join(destino, INFO), JSON.stringify({
  arquivos: lista.length, sha256: hash.digest('hex').slice(0, 16), lista,
}, null, 2) + '\n');
console.log(`Build ok: ${lista.length} arquivos em ${destino}`);
