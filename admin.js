(function () {
  var $ = function (id) { return document.getElementById(id); };
  var atual = null, token = null;
  var REPO = 'cauadadecio14-bot/VITOR-MODEC', BRANCH = 'main', ARQUIVO = 'data.js';

  // ---- Login: o token do GitHub fica criptografado (AES-GCM) com a senha ----
  var enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) { var s = ''; new Uint8Array(buf).forEach(function (c) { s += String.fromCharCode(c); }); return btoa(s); }
  function deb64(t) { return Uint8Array.from(atob(t), function (c) { return c.charCodeAt(0); }); }
  function chave(user, senha, sal) {
    return crypto.subtle.importKey('raw', enc.encode(user.trim().toLowerCase() + '\u0000' + senha), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 310000, hash: 'SHA-256' }, km,
          { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }
  function criarAcesso(tk, user, senha) {
    var sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return chave(user, senha, sal).then(function (k) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(tk)); })
      .then(function (c) { return 'window.ACESSO = ' + JSON.stringify({ v: 1, s: b64(sal), i: b64(iv), d: b64(c) }) + ';\n'; });
  }
  function abrirAcesso(user, senha) {
    var A = window.ACESSO;
    return chave(user, senha, deb64(A.s)).then(function (k) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: deb64(A.i) }, k, deb64(A.d)); })
      .then(function (p) { return dec.decode(p); });
  }
  function tela(id) { ['tela-login', 'tela-setup', 'tela-painel'].forEach(function (t) { $(t).hidden = t !== id; }); }

  $('form-login').addEventListener('submit', function (e) {
    e.preventDefault(); $('login-erro').hidden = true;
    abrirAcesso($('login-user').value, $('login-senha').value).then(function (tk) {
      token = tk; $('login-senha').value = ''; tela('tela-painel');
    }).catch(function () {
      $('login-erro').textContent = 'Usuário ou senha incorretos.'; $('login-erro').hidden = false;
    });
  });
  $('form-setup').addEventListener('submit', function (e) {
    e.preventDefault(); $('setup-erro').hidden = true;
    var tk = $('setup-token').value.trim();
    if (!/^(github_pat_|ghp_)/.test(tk)) { $('setup-erro').textContent = 'Esse não parece um token do GitHub (começa com github_pat_).'; $('setup-erro').hidden = false; return; }
    criarAcesso(tk, $('setup-user').value, $('setup-senha').value).then(function (txt) {
      baixar('acesso.js', txt, 'text/javascript');
      $('setup-token').value = ''; $('setup-senha').value = '';
      $('setup-ok').textContent = 'Pronto! Envie o arquivo acesso.js baixado para o repositório (Add file → Upload files → Commit). Depois recarregue esta página e entre com seu usuário e senha.';
      $('setup-ok').hidden = false;
    });
  });
  $('sair').addEventListener('click', function () { token = null; atual = null; location.reload(); });

  function publicarGithub(texto) {
    var url = 'https://api.github.com/repos/' + REPO + '/contents/' + ARQUIVO;
    var h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
    return fetch(url + '?ref=' + BRANCH, { headers: h, cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(r.status === 401 ? 'token inválido ou expirado' : 'GitHub respondeu ' + r.status);
      return r.json();
    }).then(function (atualArq) {
      var corpo = { message: 'Atualiza dados da planilha (' + new Date().toLocaleString('pt-BR') + ')', branch: BRANCH,
        content: btoa(unescape(encodeURIComponent(texto))) };
      if (atualArq && atualArq.sha) corpo.sha = atualArq.sha;
      return fetch(url, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, h), body: JSON.stringify(corpo) });
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? 'o token não tem permissão de escrita neste repositório' : 'GitHub respondeu ' + r.status);
    });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function erro(m) { $('erro').textContent = m; $('erro').hidden = !m; }

  function baixar(nome, texto, tipo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function processar(arq) {
    erro(''); $('ok').hidden = true; $('acoes-box').hidden = true; $('previa-box').hidden = true;
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
        '</td><td class="num">' + esc(r.qtd) + '</td><td>' + esc(r.eta ? r.eta.split('-').reverse().join('/') : '') + '</td><td><span class="status status--' + r.tom + '">' + esc(r.status) + '</span></td></tr>';
    }).join('');
    $('msg').textContent = '';
    $('acoes-box').hidden = false; $('previa-box').hidden = false;
  }

  $('arquivo').addEventListener('change', function (e) { if (e.target.files[0]) processar(e.target.files[0]); });
  ['dragover', 'dragenter'].forEach(function (ev) { $('drop').addEventListener(ev, function (e) { e.preventDefault(); $('drop').classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('drop').addEventListener(ev, function () { $('drop').classList.remove('is-over'); }); });
  $('drop').addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) processar(e.dataTransfer.files[0]); });

  $('publicar').addEventListener('click', function () {
    if (!atual || !token) return;
    var b = $('publicar'); b.disabled = true; $('ok').hidden = true; erro('');
    $('msg').textContent = 'Publicando…';
    publicarGithub(Normalizar.gerarDataJs(atual.registros)).then(function () {
      $('ok').textContent = 'Publicado! ' + atual.registros.length + ' materiais enviados. O link da equipe será atualizado em cerca de 1 minuto.';
      $('ok').hidden = false; $('msg').textContent = '';
    }).catch(function (e) { erro('Não foi possível publicar: ' + e.message + '.'); $('msg').textContent = ''; })
      .then(function () { b.disabled = false; });
  });

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
        .replace(/\s*<a class="topo__acao"[^>]*>.*?<\/a>/, '')
        .replace('<link rel="stylesheet" href="styles.css">', function () { return '<style>\n' + t[1] + '\n</style>'; })
        .replace('<script src="data.js"></script>', function () { return '<script>\n' + dados + '</script>'; })
        .replace('<script src="app.js"></script>', function () { return '<script>\n' + t[2].replace(/<\/script/gi, '<\\/script') + '\n</script>'; });
      baixar('consulta-materiais-marinha.html', html, 'text/html');
      $('msg').textContent = 'Arquivo gerado. Ele funciona offline, mas não se atualiza sozinho — prefira o link oficial.';
    }).catch(function () {
      $('msg').textContent = 'Para gerar o HTML único, abra esta página pelo link publicado (não direto do arquivo).';
    }).then(function () { busy.disabled = false; });
  });

  // Logo e tela inicial
  var logo = document.querySelector('.marca__img');
  if (logo) logo.addEventListener('load', function () { logo.hidden = false; });
  tela(window.ACESSO && window.ACESSO.d ? 'tela-login' : 'tela-setup');
})();
