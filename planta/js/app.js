/* =========================================================================
   app.js — Amarração: abas de piso, barra de ferramentas e inicialização
   ========================================================================= */
(function (global) {
  'use strict';

  var S = global.PlantaStore;
  var D = global.PlantaDados;
  var R = global.PlantaRender;
  var P = global.PlantaPainel;

  var pisoAtual = D.pisos[0].id;
  var palco;

  function $(id) { return document.getElementById(id); }

  /* ------------------------------ abas ----------------------------------- */
  function montaAbas() {
    var nav = $('abas');
    nav.innerHTML = D.pisos.map(function (p) {
      var ocup = p.mesas.filter(function (m) { return !!S.pessoaDaMesa(m.id); }).length;
      return '<button class="aba' + (p.id === pisoAtual ? ' ativa' : '') + '" data-piso="' + p.id + '">' +
        '<strong>' + p.nome + '</strong>' +
        '<em>' + ocup + '/' + p.mesas.length + ' ocupadas</em></button>';
    }).join('');
    nav.querySelectorAll('[data-piso]').forEach(function (b) {
      b.onclick = function () { trocaPiso(b.getAttribute('data-piso')); };
    });
  }

  function trocaPiso(id) {
    pisoAtual = id;
    R.montar(palco, id);
    var p = D.piso(id);
    $('piso-nome').textContent = p.nome;
    $('piso-sub').textContent = p.subtitulo + ' · ' +
      (p.room.w / 100).toFixed(2).replace('.', ',') + ' × ' +
      (p.room.h / 100).toFixed(2).replace('.', ',') + ' m';
    montaAbas();
    var sel = P.mesaSelecionada;
    if (sel && D.pisoDaMesa(sel) && D.pisoDaMesa(sel).id === id) P.selecionar(sel);
  }

  /* ------------------------------ barra ---------------------------------- */
  function montaBarra() {
    $('zoom-mais').onclick = function () { R.zoom(1.2); };
    $('zoom-menos').onclick = function () { R.zoom(1 / 1.2); };
    $('zoom-ajustar').onclick = function () { R.ajustar(); };

    $('op-cotas').onchange = function () { R.setOpcao('cotas', this.checked); };
    $('op-nomes').onchange = function () { R.setOpcao('nomes', this.checked); };
    $('op-mobiliario').onchange = function () {
      R.setOpcao('mobiliario', this.checked);
      trocaPiso(pisoAtual);
    };

    $('bt-imprimir').onclick = function () { global.print(); };

    $('bt-exportar').onclick = function () {
      var blob = new Blob([S.exportar()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'planta-diretiva-' + hoje() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };

    $('bt-importar').onclick = function () { $('arquivo').click(); };
    $('arquivo').onchange = function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { S.importar(fr.result); trocaPiso(pisoAtual); }
        catch (e) { alert('Não consegui ler esse arquivo: ' + e.message); }
      };
      fr.readAsText(f);
      this.value = '';
    };

    $('bt-exemplo').onclick = function () {
      if (S.state.pessoas.length && !confirm('Isso vai somar pessoas de exemplo à equipe atual. Continuar?')) return;
      exemplo();
    };

    $('bt-limpar').onclick = function () {
      if (confirm('Apagar todos os nomes de mesa, pessoas e alocações? Não dá para desfazer.')) {
        S.resetTudo();
        trocaPiso(pisoAtual);
      }
    };
  }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* ------------------------------ exemplo -------------------------------- */
  function exemplo() {
    var base = [
      ['Ana Ribeiro', 'Coordenadora', 'operacoes'],
      ['Bruno Antunes', 'Analista', 'comercial'],
      ['Carla Menezes', 'Assistente', 'rh'],
      ['Diego Salles', 'Analista', 'licitacoes'],
      ['Elisa Prado', 'Supervisora', 'financeiro'],
      ['Fábio Nunes', 'Suporte', 'ti'],
      ['Gabriela Lima', 'Advogada', 'operacoes'],
      ['Henrique Costa', 'Contador', 'financeiro']
    ];
    var mesas = D.piso(pisoAtual).mesas;
    base.forEach(function (b, i) {
      var p = S.addPessoa({ nome: b[0], cargo: b[1], setor: b[2] });
      if (mesas[i]) {
        S.setMesa(mesas[i].id, { setor: b[2] });
        S.alocar(p.id, mesas[i].id);
      }
    });
    S.setPessoa(S.state.pessoas[1].id, { status: 'ligacao' });
    S.setPessoa(S.state.pessoas[4].id, { status: 'ligacao' });
    S.setPessoa(S.state.pessoas[5].id, { status: 'ausente' });
    trocaPiso(pisoAtual);
  }

  /* ------------------------------ init ----------------------------------- */
  function init() {
    S.load();
    palco = $('palco');

    R.montar(palco, pisoAtual);
    P.init();
    montaAbas();
    montaBarra();
    trocaPiso(pisoAtual);

    global.PlantaDrag.init({
      onSolta: function (pid, mesaId) { S.alocar(pid, mesaId); P.selecionar(mesaId); },
      onRemove: function (pid) { S.desalocar(pid); },
      onClicarMesa: function (id) { P.selecionar(id); }
    });
    global.PlantaDrag.ligaPan(palco);

    S.onChange(montaAbas);

    document.addEventListener('keydown', function (ev) {
      if (ev.target.matches && ev.target.matches('input, select, textarea')) return;
      if (ev.key === '+' || ev.key === '=') R.zoom(1.2);
      if (ev.key === '-') R.zoom(1 / 1.2);
      if (ev.key === '0') R.ajustar();
      if (ev.key === 'Escape') P.selecionar(null);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
