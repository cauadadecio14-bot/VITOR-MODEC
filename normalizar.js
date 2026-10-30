/* Leitura e normalização da planilha "Follow up" (aba Marinha).
   Usado pelo importador (admin.html) e pelo gerar-dados.js (linha de comando). */
(function (root) {
  var STATUS = {
    'complet': ['Concluído', 'ok'],
    'completo': ['Concluído', 'ok'],
    'awaiting delivry': ['Aguardando entrega', 'espera'],
    'awaiting delivery': ['Aguardando entrega', 'espera'],
    'awaiting po': ['Aguardando PO', 'alerta'],
    'sent onboard': ['Enviado a bordo', 'transito'],
    'in b13g': ['Na base B13G', 'base']
  };

  function limpar(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[ ​]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalizarPlanilha(XLSX, dados) {
    var wb = XLSX.read(dados, { type: 'array' });
    var aba = wb.Sheets['Marinha'] ? 'Marinha' : wb.SheetNames[0];
    var linhas = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: null });
    var avisos = [];

    var cab = -1, col = {};
    for (var i = 0; i < Math.min(linhas.length, 15) && cab < 0; i++) {
      var m = {};
      (linhas[i] || []).forEach(function (c, j) {
        var k = limpar(c).toLowerCase().replace(/\.$/, '');
        if (k === 'material' && m.codigo === undefined) m.codigo = j;
        else if (k === 'name' || k === 'nome' || k === 'descrição' || k === 'descricao') m.nome = j;
        else if (k === 'qnt' || k === 'qtd' || k === 'quantidade') m.qtd = j;
        else if (k === 'pr') m.pr = j;
        else if (k === 'po') m.po = j;
        else if (k === 'status') m.status = j;
      });
      if (m.codigo !== undefined && m.pr !== undefined && m.po !== undefined && m.status !== undefined) { cab = i; col = m; }
    }
    if (cab < 0) throw new Error('Não encontrei o cabeçalho (Material, Name, Qnt., PR, PO, Status) na aba "' + aba + '".');

    var registros = [];
    for (var r = cab + 1; r < linhas.length; r++) {
      var l = linhas[r] || [];
      var codigo = limpar(l[col.codigo]);
      var nome = limpar(l[col.nome]);
      if (!codigo && !nome) continue;
      var rotulo = 'Linha ' + (r + 1) + ' (' + (codigo || nome) + ')';
      var bruto = limpar(l[col.status]);
      var st = STATUS[bruto.toLowerCase()];
      if (!bruto) avisos.push(rotulo + ': sem status.');
      else if (!st) avisos.push(rotulo + ': status desconhecido "' + bruto + '" (mantido como veio).');
      if (!codigo) avisos.push(rotulo + ': sem código de material.');
      registros.push({
        codigo: codigo,
        nome: nome,
        qtd: limpar(l[col.qtd]),
        pr: limpar(l[col.pr]),
        po: limpar(l[col.po]),
        status: st ? st[0] : (bruto || 'Sem status'),
        tom: st ? st[1] : 'neutro'
      });
    }
    return { aba: aba, registros: registros, avisos: avisos };
  }

  function gerarDataJs(registros) {
    return 'window.MATERIAIS = ' + JSON.stringify({
      atualizadoEm: new Date().toISOString(),
      registros: registros
    }, null, 1) + ';\n';
  }

  var api = { normalizarPlanilha: normalizarPlanilha, gerarDataJs: gerarDataJs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Normalizar = api;
})(typeof window !== 'undefined' ? window : this);
