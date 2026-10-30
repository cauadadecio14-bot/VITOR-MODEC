(function () {
  var $ = function (id) { return document.getElementById(id); };
  var atual = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function erro(m) { $('erro').textContent = m; $('erro').hidden = !m; }

  function baixar(nome, texto, tipo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function processar(arq) {
    erro(''); $('acoes-box').hidden = true; $('previa-box').hidden = true;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var res = Normalizar.normalizarPlanilha(XLSX, new Uint8Array(fr.result));
        if (!res.registros.length) throw new Error('Nenhum material encontrado na planilha.');
        atual = res;
        $('drop-txt').textContent = arq.name;
        mostrar(res);
      } catch (e) { atual = null; erro('Não consegui ler a planilha: ' + e.message); }
    };
    fr.onerror = function () { erro('Falha ao abrir o arquivo.'); };
    fr.readAsArrayBuffer(arq);
  }

  function mostrar(res) {
    var cont = {}, tom = {};
    res.registros.forEach(function (r) { cont[r.status] = (cont[r.status] || 0) + 1; tom[r.status] = r.tom; });
    $('resumo').innerHTML = '<span class="status status--neutro"><b>' + res.registros.length + '</b> materiais</span>' +
      Object.keys(cont).map(function (s) { return '<span class="status status--' + tom[s] + '">' + esc(s) + ': <b>' + cont[s] + '</b></span>'; }).join('');
    $('avisos').innerHTML = res.avisos.length
      ? '<div class="avisos"><b>' + res.avisos.length + ' ponto(s) para conferir na planilha:</b><ul>' + res.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '';
    $('previa').innerHTML = res.registros.map(function (r) {
      return '<tr><td>' + esc(r.nome) + '</td><td>' + esc(r.codigo) + '</td><td>' + esc(r.pr) + '</td><td>' + esc(r.po) +
        '</td><td class="num">' + esc(r.qtd) + '</td><td><span class="status status--' + r.tom + '">' + esc(r.status) + '</span></td></tr>';
    }).join('');
    $('msg').textContent = '';
    $('acoes-box').hidden = false; $('previa-box').hidden = false;
  }

  $('arquivo').addEventListener('change', function (e) { if (e.target.files[0]) processar(e.target.files[0]); });
  ['dragover', 'dragenter'].forEach(function (ev) { $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('drop').addEventListener(ev, function () { $('drop').classList.remove('is-over'); }); });
  $('drop').addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) processar(e.dataTransfer.files[0]); });

  $('baixar-data').addEventListener('click', function () {
    if (atual) baixar('data.js', Normalizar.gerarDataJs(atual.registros), 'text/javascript');
  });

  // HTML único: junta index + css + js + dados num só arquivo
  $('baixar-html').addEventListener('click', function () {
    if (!atual) return;
    var busy = $('baixar-html'); busy.disabled = true;
    Promise.all(['index.html', 'styles.css', 'app.js'].map(function (u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u); return r.text(); });
    })).then(function (t) {
      var dados = Normalizar.gerarDataJs(atual.registros).replace(/<\/script/gi, '<\\/script');
      var html = t[0]
        .replace('<link rel="stylesheet" href="styles.css">', function () { return '<style>\n' + t[1] + '\n</style>'; })
        .replace('<script src="data.js"></script>', function () { return '<script>\n' + dados + '</script>'; })
        .replace('<script src="app.js"></script>', function () { return '<script>\n' + t[2].replace(/<\/script/gi, '<\\/script') + '\n</script>'; });
      baixar('consulta-materiais-marinha.html', html, 'text/html');
      $('msg').textContent = 'Arquivo gerado. Ele funciona offline, mas não se atualiza sozinho — prefira o link oficial.';
    }).catch(function () {
      $('msg').textContent = 'Para gerar o HTML único, abra esta página pelo link publicado (não direto do arquivo).';
    }).then(function () { busy.disabled = false; });
  });
})();
