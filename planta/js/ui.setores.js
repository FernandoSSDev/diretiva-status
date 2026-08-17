/* =========================================================================
   ui.setores.js — Gerenciador de setores (criar, renomear, recolorir, excluir)
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.PlantaStore;
  var lista, form, campoNome, campoCor;
  var editando = false;      // trava o redesenho enquanto se digita num campo

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function usoTexto(u) {
    if (!u.total) return 'ainda não usado';
    var p = [];
    if (u.mesas) p.push(u.mesas + (u.mesas > 1 ? ' mesas' : ' mesa'));
    if (u.pessoas) p.push(u.pessoas + (u.pessoas > 1 ? ' pessoas' : ' pessoa'));
    return p.join(' · ');
  }

  function render() {
    if (!lista || editando) return;
    var setores = S.setores();
    lista.innerHTML = setores.map(function (s) {
      var u = S.usoSetor(s.id);
      return '' +
        '<li class="setor-item" data-setor="' + esc(s.id) + '">' +
          '<input type="color" class="setor-cor" value="' + esc(s.cor) + '" data-cor ' +
            'aria-label="Cor do setor ' + esc(s.nome) + '" />' +
          '<input type="text" class="setor-nome" value="' + esc(s.nome) + '" maxlength="24" ' +
            'data-nome aria-label="Nome do setor" />' +
          '<span class="setor-uso" title="' + esc(usoTexto(u)) + '">' + (u.total || '—') + '</span>' +
          '<button type="button" class="chip-x" data-x aria-label="Excluir setor ' +
            esc(s.nome) + '">×</button>' +
        '</li>';
    }).join('');
  }

  /* Ao digitar/escolher cor, grava sem redesenhar a lista (perderia o foco). */
  function comFoco(fn) {
    return function () {
      editando = true;
      try { fn.apply(this, arguments); } finally { editando = false; }
    };
  }

  function idDoAlvo(el) {
    var li = el.closest('.setor-item');
    return li && li.getAttribute('data-setor');
  }

  function init() {
    lista = document.getElementById('lista-setores');
    form = document.getElementById('form-setor');
    campoNome = document.getElementById('novo-setor-nome');
    campoCor = document.getElementById('novo-setor-cor');
    if (!lista) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = campoNome.value.trim();
      if (!nome) { campoNome.focus(); return; }
      S.addSetor({ nome: nome, cor: campoCor.value });
      campoNome.value = '';
      campoCor.value = corSugerida();
      campoNome.focus();
    });

    lista.addEventListener('input', comFoco(function (ev) {
      var id = idDoAlvo(ev.target);
      if (!id) return;
      if (ev.target.hasAttribute('data-nome')) S.setSetor(id, { nome: ev.target.value });
      if (ev.target.hasAttribute('data-cor')) S.setSetor(id, { cor: ev.target.value });
    }));

    /* input[type=color] em alguns navegadores só dispara "change" ao fechar o seletor */
    lista.addEventListener('change', comFoco(function (ev) {
      var id = idDoAlvo(ev.target);
      if (id && ev.target.hasAttribute('data-cor')) S.setSetor(id, { cor: ev.target.value });
    }));

    /* ao sair do campo de nome, redesenha para atualizar contagens e rótulos */
    lista.addEventListener('focusout', function () { setTimeout(render, 0); });

    lista.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-x]')) return;
      var id = idDoAlvo(ev.target);
      if (!id) return;
      var s = S.setorInfo(id);
      var u = S.usoSetor(id);
      var aviso = u.total
        ? ' Ele será removido de ' + usoTexto(u) + ', que ficam sem setor.'
        : '';
      global.PlantaDialogo.confirmar(
        'Excluir o setor "' + s.nome + '"?' + aviso,
        'Excluir setor',
        function () { S.removeSetor(id); }
      );
    });

    campoCor.value = corSugerida();
    S.onChange(render);
    render();
  }

  /* Sugere uma cor ainda não usada, para não nascer tudo azul. */
  var PALETA = ['#2CADE2', '#0E4B83', '#7C3AED', '#059669', '#B45309',
                '#DB2777', '#0891B2', '#65A30D', '#6366F1', '#E11D48'];
  function corSugerida() {
    var usadas = S.setores().map(function (s) { return s.cor.toLowerCase(); });
    for (var i = 0; i < PALETA.length; i++) {
      if (usadas.indexOf(PALETA[i].toLowerCase()) < 0) return PALETA[i];
    }
    return PALETA[S.setores().length % PALETA.length];
  }

  global.PlantaSetores = { init: init, render: render, corSugerida: corSugerida };
})(window);
