/* =========================================================================
   ui.painel.js — Barra lateral: equipe, resumo e detalhe da mesa
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.PlantaStore;
  var D = global.PlantaDados;
  var R = global.PlantaRender;

  var els = {};
  var mesaSelecionada = null;
  var filtro = '';
  var editandoCampo = false;   // trava o redesenho do painel enquanto se digita

  /** Envolve um handler de digitação para o painel não se redesenhar (perderia o foco). */
  function digitando(fn) {
    return function () {
      editandoCampo = true;
      try { fn.apply(this, arguments); } finally { editandoCampo = false; }
    };
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }

  /* ======================= lista de pessoas =============================== */
  function chip(p, alocada) {
    var setor = S.setorInfo(p.setor);
    var st = S.STATUS[p.status] || S.STATUS.disponivel;
    var mesaId = S.mesaDaPessoa(p.id);
    var onde = '';
    if (alocada && mesaId) {
      var piso = D.pisoDaMesa(mesaId);
      onde = '<span class="chip-onde">' + esc(S.nomeMesa(mesaId)) +
             (piso ? ' · ' + esc(piso.nome.replace('Piso ', '')) : '') + '</span>';
    }
    return '' +
      '<li class="chip' + (alocada ? ' chip-alocada' : '') + '" data-drag-pessoa="' + p.id + '" ' +
      'data-pessoa="' + p.id + '" title="Arraste para uma mesa">' +
        '<span class="chip-av" style="background:' + setor.cor + '">' + esc(iniciais(p.nome)) + '</span>' +
        '<span class="chip-txt">' +
          '<strong>' + esc(p.nome) + '</strong>' +
          '<em>' + esc(p.cargo || setor.nome) + '</em>' + onde +
        '</span>' +
        '<span class="chip-status" style="background:' + st.cor + '" title="' + esc(st.nome) + '"></span>' +
        '<button class="chip-x" data-remover="' + p.id + '" title="Excluir pessoa" aria-label="Excluir ' +
          esc(p.nome) + '">×</button>' +
      '</li>';
  }

  function passaFiltro(p) {
    if (!filtro) return true;
    var t = (p.nome + ' ' + (p.cargo || '')).toLowerCase();
    return t.indexOf(filtro) >= 0;
  }

  function renderEquipe() {
    var livres = S.naoAlocadas().filter(passaFiltro);
    var alocadas = S.state.pessoas.filter(function (p) {
      return S.mesaDaPessoa(p.id) && passaFiltro(p);
    });

    els.semMesa.innerHTML = livres.length
      ? livres.map(function (p) { return chip(p, false); }).join('')
      : '<li class="vazio">Ninguém na fila. Arraste uma pessoa de volta para cá para liberar a mesa.</li>';

    els.comMesa.innerHTML = alocadas.length
      ? alocadas.map(function (p) { return chip(p, true); }).join('')
      : '<li class="vazio">Nenhuma pessoa alocada ainda.</li>';

    els.contSem.textContent = livres.length;
    els.contCom.textContent = alocadas.length;
  }

  /* ======================= resumo ========================================= */
  function renderResumo() {
    var linhas = D.pisos.map(function (piso) {
      var total = piso.mesas.length;
      var ocup = piso.mesas.filter(function (m) { return !!S.pessoaDaMesa(m.id); }).length;
      var pct = total ? Math.round(ocup / total * 100) : 0;
      return '' +
        '<li class="res-item">' +
          '<div class="res-top"><span>' + esc(piso.nome) + '</span><b>' + ocup + '/' + total + '</b></div>' +
          '<div class="res-bar"><span style="width:' + pct + '%"></span></div>' +
        '</li>';
    }).join('');

    var emLigacao = S.state.pessoas.filter(function (p) {
      return p.status === 'ligacao' && S.mesaDaPessoa(p.id);
    }).length;

    els.resumo.innerHTML = linhas +
      '<li class="res-tags">' +
        '<span class="tag"><i style="background:' + S.STATUS.ligacao.cor + '"></i>' +
          emLigacao + ' em ligação</span>' +
        '<span class="tag"><i style="background:' + S.STATUS.disponivel.cor + '"></i>' +
          S.state.pessoas.length + ' pessoas</span>' +
      '</li>';
  }

  /* ======================= detalhe da mesa ================================ */
  function opcoesSetor(sel) {
    return S.SETORES.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === (sel || '') ? ' selected' : '') + '>' +
        esc(s.nome) + '</option>';
    }).join('');
  }
  function opcoesStatus(sel) {
    return Object.keys(S.STATUS).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' +
        esc(S.STATUS[k].nome) + '</option>';
    }).join('');
  }
  function opcoesPessoa(sel) {
    var livres = S.naoAlocadas();
    var atual = S.pessoa(sel);
    if (atual && livres.indexOf(atual) < 0) livres = [atual].concat(livres);
    return '<option value="">— mesa livre —</option>' + livres.map(function (p) {
      return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' +
        esc(p.nome) + '</option>';
    }).join('');
  }

  function renderMesa() {
    if (!mesaSelecionada) {
      els.detalhe.innerHTML =
        '<p class="dica">Clique em uma mesa da planta para dar nome a ela, definir o setor ' +
        'e escolher quem senta ali. Ou arraste alguém da lista direto para a mesa.</p>';
      return;
    }
    var d = D.mesaPorId(mesaSelecionada);
    var meta = S.mesa(mesaSelecionada);
    var p = S.pessoaDaMesa(mesaSelecionada);
    var piso = D.pisoDaMesa(mesaSelecionada);

    els.detalhe.innerHTML = '' +
      '<div class="det-cab">' +
        '<span class="det-num">' + esc(d.num) + '</span>' +
        '<div><strong>' + esc(S.nomeMesa(mesaSelecionada)) + '</strong>' +
        '<em>' + esc(piso.nome) + ' · ' + esc(d.rotulo) + ' ' + esc(d.num) +
        ' · ' + (d.w) + '×' + (d.h) + ' cm</em></div>' +
        '<button class="det-fechar" id="det-fechar" aria-label="Fechar">×</button>' +
      '</div>' +

      '<label class="cmp">Nome da mesa' +
        '<input id="f-nome" type="text" maxlength="28" placeholder="' +
          esc(S.rotuloPadrao(mesaSelecionada)) + '" value="' + esc(meta.nome || '') + '" />' +
      '</label>' +

      '<label class="cmp">Setor' +
        '<select id="f-setor">' + opcoesSetor(meta.setor) + '</select>' +
      '</label>' +

      '<label class="cmp">Quem senta aqui' +
        '<select id="f-pessoa">' + opcoesPessoa(p ? p.id : '') + '</select>' +
      '</label>' +

      (p ? '<label class="cmp">Situação de ' + esc(p.nome.split(' ')[0]) +
        '<select id="f-status">' + opcoesStatus(p.status) + '</select></label>' +
        '<label class="cmp">Cargo / função' +
        '<input id="f-cargo" type="text" maxlength="24" value="' + esc(p.cargo || '') + '" ' +
        'placeholder="ex.: Analista" /></label>' : '') +

      '<label class="cmp">Observação' +
        '<input id="f-obs" type="text" maxlength="60" value="' + esc(meta.obs || '') + '" ' +
        'placeholder="ex.: ramal 214, monitor duplo" />' +
      '</label>' +

      '<div class="det-acoes">' +
        (p ? '<button class="btn btn-sec" id="f-liberar">Liberar mesa</button>' : '') +
        '<button class="btn btn-sec" id="f-nova">+ Nova pessoa aqui</button>' +
      '</div>';

    $('det-fechar').onclick = function () { selecionar(null); };
    $('f-nome').oninput = digitando(function () { S.setMesa(mesaSelecionada, { nome: this.value }); });
    $('f-setor').onchange = function () { S.setMesa(mesaSelecionada, { setor: this.value }); };
    $('f-obs').oninput = digitando(function () { S.setMesa(mesaSelecionada, { obs: this.value }); });
    $('f-pessoa').onchange = function () {
      if (this.value) S.alocar(this.value, mesaSelecionada);
      else S.limparMesa(mesaSelecionada);
    };
    if ($('f-status')) $('f-status').onchange = function () { S.setPessoa(p.id, { status: this.value }); };
    if ($('f-cargo')) $('f-cargo').oninput = digitando(function () { S.setPessoa(p.id, { cargo: this.value }); });
    if ($('f-liberar')) $('f-liberar').onclick = function () { S.limparMesa(mesaSelecionada); };
    $('f-nova').onclick = function () {
      var nova = S.addPessoa({ setor: S.mesa(mesaSelecionada).setor });
      S.alocar(nova.id, mesaSelecionada);
      setTimeout(function () { var i = $('f-cargo'); if (i) i.focus(); }, 30);
    };
  }

  function selecionar(id) {
    mesaSelecionada = id;
    var atual = document.querySelector('.mesa.selecionada');
    if (atual) atual.classList.remove('selecionada');
    if (id) {
      var e = R.elementoDaMesa(id);
      if (e) e.classList.add('selecionada');
    }
    renderMesa();
    if (global.innerWidth <= 1080) {
      els.detalhe.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* ======================= init =========================================== */
  function init() {
    els = {
      semMesa: $('lista-sem-mesa'),
      comMesa: $('lista-com-mesa'),
      contSem: $('cont-sem-mesa'),
      contCom: $('cont-com-mesa'),
      resumo: $('resumo'),
      detalhe: $('detalhe-mesa'),
      busca: $('busca'),
      formNome: $('novo-nome'),
      form: $('form-pessoa')
    };

    els.form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = els.formNome.value.trim();
      if (!nome) return;
      S.addPessoa({ nome: nome });
      els.formNome.value = '';
      els.formNome.focus();
    });

    els.busca.addEventListener('input', function () {
      filtro = this.value.trim().toLowerCase();
      renderEquipe();
    });

    document.addEventListener('click', function (ev) {
      var rm = ev.target.closest && ev.target.closest('[data-remover]');
      if (rm) {
        ev.preventDefault();
        ev.stopPropagation();
        var pid = rm.getAttribute('data-remover');
        var p = S.pessoa(pid);
        if (!p) return;
        global.PlantaDialogo.confirmar(
          'Excluir "' + p.nome + '" da equipe? A mesa dessa pessoa fica livre.',
          'Excluir',
          function () { S.removePessoa(pid); }
        );
      }
    });

    S.onChange(function () {
      renderEquipe();
      renderResumo();
      if (!editandoCampo) renderMesa();
      R.redesenhar();
      reaplicaSelecao();
    });
    renderEquipe(); renderResumo(); renderMesa();
  }

  function reaplicaSelecao() {
    if (!mesaSelecionada) return;
    var e = R.elementoDaMesa(mesaSelecionada);
    if (e) e.classList.add('selecionada');
  }

  global.PlantaPainel = {
    init: init,
    selecionar: selecionar,
    atualizar: function () { renderEquipe(); renderResumo(); renderMesa(); },
    get mesaSelecionada() { return mesaSelecionada; }
  };
})(window);
