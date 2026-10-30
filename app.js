(function () {
  'use strict';
  var DADOS = window.MATERIAIS || { registros: [] };
  var registros = DADOS.registros || [];

  var el = {
    entrada: document.getElementById('entrada'),
    lista: document.getElementById('lista'),
    limpar: document.getElementById('limpar'),
    dica: document.getElementById('dica'),
    resultado: document.getElementById('resultado'),
    atualizado: document.getElementById('atualizado'),
    modos: Array.prototype.slice.call(document.querySelectorAll('.modo__op')),
    logo: document.querySelector('.marca__img')
  };
  var modo = 'nome', opcoes = [], ativa = -1;

  var TEXTOS = {
    nome: { ph: 'Digite parte do nome do material…', dica: 'Comece a digitar e escolha o material na lista.' },
    codigo: { ph: 'Digite o código do material…', dica: 'Digite o código (ou parte dele) e escolha na lista.' }
  };

  function norm(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function destacar(txt, termo) {
    if (!termo) return esc(txt);
    var i = norm(txt).indexOf(termo);
    if (i < 0) return esc(txt);
    return esc(txt.slice(0, i)) + '<mark>' + esc(txt.slice(i, i + termo.length)) + '</mark>' + esc(txt.slice(i + termo.length));
  }

  // Opções únicas do modo atual (nome ou código)
  function todasOpcoes() {
    var mapa = {}, saida = [];
    registros.forEach(function (r) {
      var valor = modo === 'nome' ? r.nome : r.codigo;
      if (!valor) return;
      var chave = norm(valor);
      if (!mapa[chave]) {
        mapa[chave] = { valor: valor, chave: chave, outros: {} };
        saida.push(mapa[chave]);
      }
      var o = modo === 'nome' ? r.codigo : r.nome;
      if (o) mapa[chave].outros[o] = true;
    });
    saida.forEach(function (o) {
      var n = Object.keys(o.outros);
      o.sub = n.length === 1 ? n[0] : (n.length > 1 ? n.length + (modo === 'nome' ? ' códigos' : ' descrições') : '');
    });
    return saida.sort(function (a, b) { return a.valor.localeCompare(b.valor, 'pt-BR', { numeric: true }); });
  }

  function filtrar() {
    var termo = norm(el.entrada.value.trim());
    var base = todasOpcoes();
    if (!termo) return base.slice(0, 60);
    var ini = [], meio = [];
    base.forEach(function (o) {
      var i = o.chave.indexOf(termo);
      if (i === 0) ini.push(o); else if (i > 0) meio.push(o);
    });
    return ini.concat(meio).slice(0, 60);
  }

  function abrirLista() {
    var termo = norm(el.entrada.value.trim());
    opcoes = filtrar();
    ativa = -1;
    if (!opcoes.length) {
      el.lista.innerHTML = '<li class="vazio">Nenhum material encontrado.</li>';
    } else {
      el.lista.innerHTML = opcoes.map(function (o, i) {
        return '<li role="option" id="op' + i + '" data-i="' + i + '">' + destacar(o.valor, termo) +
          (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</li>';
      }).join('');
    }
    el.lista.hidden = false;
    el.entrada.setAttribute('aria-expanded', 'true');
  }
  function fecharLista() {
    el.lista.hidden = true;
    el.entrada.setAttribute('aria-expanded', 'false');
    el.entrada.removeAttribute('aria-activedescendant');
  }
  function marcar(i) {
    var itens = el.lista.querySelectorAll('li[role="option"]');
    if (!itens.length) return;
    ativa = (i + itens.length) % itens.length;
    itens.forEach(function (li, k) { li.setAttribute('aria-selected', k === ativa ? 'true' : 'false'); });
    el.entrada.setAttribute('aria-activedescendant', itens[ativa].id);
    itens[ativa].scrollIntoView({ block: 'nearest' });
  }

  function selecionar(o) {
    el.entrada.value = o.valor;
    el.limpar.hidden = false;
    fecharLista();
    mostrar(o.valor);
  }

  function fmtData(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  var HOJE = new Date().toISOString().slice(0, 10);

  function celula(v, rot, extra) {
    return '<td data-rot="' + rot + '"' + (v ? '' : ' class="nulo"') + (extra || '') + '>' + (v ? esc(v) : '—') + '</td>';
  }

  function mostrar(valor) {
    var chave = norm(valor);
    var achados = registros.filter(function (r) {
      return norm(modo === 'nome' ? r.nome : r.codigo) === chave;
    });
    // agrupa por material (código + nome)
    var grupos = [], idx = {};
    achados.forEach(function (r) {
      var k = r.codigo + '|' + r.nome;
      if (!(k in idx)) { idx[k] = grupos.length; grupos.push({ codigo: r.codigo, nome: r.nome, linhas: [] }); }
      grupos[idx[k]].linhas.push(r);
    });
    el.resultado.innerHTML = grupos.map(function (g) {
      return '<article class="grupo"><div class="grupo__cab"><h3>' + esc(g.nome || 'Sem descrição') + '</h3>' +
        '<span>Código ' + esc(g.codigo || '—') + '</span></div>' +
        '<table><thead><tr><th>PR</th><th>PO</th><th class="num">Quantidade</th><th>ETA</th><th>Status</th></tr></thead><tbody>' +
        g.linhas.map(function (r) {
          return '<tr>' + celula(r.pr, 'PR') + celula(r.po, 'PO') +
            '<td data-rot="Quantidade" class="num' + (r.qtd ? '' : ' nulo') + '">' + (r.qtd ? esc(r.qtd) : '—') + '</td>' +
            '<td data-rot="ETA"' + (r.eta ? (r.eta < HOJE && r.tom !== 'ok' && r.tom !== 'base' && r.tom !== 'transito' ? ' class="atrasado"' : '') : ' class="nulo"') + '>' +
              (r.eta ? fmtData(r.eta) + (r.eta < HOJE && r.tom !== 'ok' && r.tom !== 'base' && r.tom !== 'transito' ? ' <small>(vencida)</small>' : '') : '—') + '</td>' +
            '<td data-rot="Status"><span class="status status--' + esc(r.tom) + '">' + esc(r.status) + '</span></td></tr>';
        }).join('') + '</tbody></table></article>';
    }).join('');
  }

  function vazio() {
    el.resultado.innerHTML = '<div class="vazio-msg">Selecione um material para ver PR, PO, quantidade, ETA e status.</div>';
  }

  function trocarModo(novo) {
    modo = novo;
    el.modos.forEach(function (b) {
      var on = b.dataset.modo === novo;
      b.classList.toggle('is-ativo', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    el.entrada.placeholder = TEXTOS[novo].ph;
    el.entrada.inputMode = novo === 'codigo' ? 'numeric' : 'text';
    el.dica.textContent = TEXTOS[novo].dica;
    el.entrada.value = '';
    el.limpar.hidden = true;
    fecharLista();
    vazio();
    el.entrada.focus();
  }

  el.modos.forEach(function (b) { b.addEventListener('click', function () { trocarModo(b.dataset.modo); }); });
  el.entrada.addEventListener('input', function () {
    el.limpar.hidden = !el.entrada.value;
    if (!el.entrada.value) vazio();
    abrirLista();
  });
  el.entrada.addEventListener('focus', function () { if (!el.entrada.value) abrirLista(); });
  el.entrada.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (el.lista.hidden) abrirLista(); marcar(ativa + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(ativa - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var o = opcoes[ativa >= 0 ? ativa : 0];
      if (!el.lista.hidden && o) selecionar(o);
      else if (el.entrada.value) { opcoes = filtrar(); if (opcoes[0]) selecionar(opcoes[0]); }
    }
    else if (e.key === 'Escape') fecharLista();
  });
  el.lista.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); selecionar(opcoes[+li.dataset.i]); }
  });
  el.limpar.addEventListener('click', function () {
    el.entrada.value = ''; el.limpar.hidden = true; vazio(); el.entrada.focus(); abrirLista();
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.campo')) fecharLista();
  });

  // Logo: usa assets/logo-modec.png quando existir; senão fica o texto MODEC
  if (el.logo) {
    el.logo.addEventListener('load', function () { el.logo.hidden = false; });
    if (el.logo.complete && el.logo.naturalWidth) el.logo.hidden = false;
  }

  if (DADOS.atualizadoEm) {
    var d = new Date(DADOS.atualizadoEm);
    el.atualizado.textContent = 'Última atualização: ' + d.toLocaleDateString('pt-BR') + ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  el.dica.textContent = TEXTOS.nome.dica;
  vazio();
})();
