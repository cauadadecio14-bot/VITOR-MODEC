#!/usr/bin/env node
/* Uso: node gerar-dados.js caminho/da/planilha.xlsx
   Gera/atualiza o data.js a partir da planilha (alternativa ao admin.html). */
const fs = require('fs');
const path = require('path');
const XLSX = require('./vendor/xlsx.full.min.js');
const { normalizarPlanilha, gerarDataJs } = require('./normalizar.js');

const arquivo = process.argv[2];
if (!arquivo) { console.error('Uso: node gerar-dados.js planilha.xlsx'); process.exit(1); }
const res = normalizarPlanilha(XLSX, fs.readFileSync(arquivo));
fs.writeFileSync(path.join(__dirname, 'data.js'), gerarDataJs(res.registros));
console.log(res.registros.length + ' materiais importados da aba "' + res.aba + '".');
res.avisos.forEach(a => console.warn('Aviso: ' + a));
