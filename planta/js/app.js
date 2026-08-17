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

    $('bt-exportar').onclick = exportar;
    $('bt-importar').onclick = importarDialogo;
    $('arquivo').onchange = function () {
      var f = this.files && this.files[0];
      this.value = '';
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { aplicaBackup(fr.result); };
      fr.readAsText(f);
    };

    $('bt-exemplo').onclick = function () {
      if (!S.state.pessoas.length) { exemplo(); return; }
      global.PlantaDialogo.confirmar(
        'Isso vai somar 8 pessoas de exemplo à equipe atual. Continuar?', 'Adicionar exemplo', exemplo);
    };

    $('bt-limpar').onclick = function () {
      global.PlantaDialogo.confirmar(
        'Apagar todos os nomes de mesa, pessoas e alocações? Não dá para desfazer.',
        'Apagar tudo',
        function () { S.resetTudo(); trocaPiso(pisoAtual); }
      );
    };
  }

  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* --------------------------- backup ------------------------------------ */
  /* Dentro de um iframe com sandbox o navegador ignora downloads iniciados
     pela página e o seletor de arquivos costuma não abrir. Por isso o caminho
     principal é copiar/colar o texto; o arquivo só aparece quando a página
     está aberta direto no navegador, onde realmente funciona. */
  var pagInteira = (function () {
    try { return global.self === global.top; } catch (e) { return false; }
  })();
  function baixaArquivo(json) {
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'planta-diretiva-' + hoje() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { /* bloqueado pelo sandbox — o texto acima resolve */ }
  }

  function exportar() {
    var json = S.exportar();
    var resumo = S.state.pessoas.length + ' pessoas · ' +
      Object.keys(S.state.lotacao).length + ' mesas ocupadas · ' +
      S.setores().length + ' setores';

    var extras = [{
      rotulo: 'Copiar', fn: function (v, botao) {
        var ok = global.PlantaDialogo.copiar(v.json, 'json');
        botao.textContent = ok ? 'Copiado ✓' : 'Selecione e use Ctrl+C';
        setTimeout(function () { botao.textContent = 'Copiar'; }, 2600);
      }
    }];
    if (pagInteira) extras.push({ rotulo: 'Baixar .json', fn: function (v) { baixaArquivo(v.json); } });

    global.PlantaDialogo.pedir({
      titulo: 'Backup dos dados',
      texto: 'Guardado aqui: ' + resumo + '. Copie o texto abaixo e salve onde quiser ' +
             '(bloco de notas, e-mail para você mesmo, WhatsApp). Para voltar com ele, ' +
             'use Importar e cole.',
      campos: [{ id: 'json', rotulo: '', tipo: 'textarea', valor: json, linhas: 9, somenteLeitura: true }],
      ok: 'Fechar',
      semCancelar: true,
      extras: extras
    }, null);
  }

  function aplicaBackup(texto) {
    try {
      S.importar(texto);
      trocaPiso(pisoAtual);
      global.PlantaDialogo.aviso(
        'Backup restaurado: ' + S.state.pessoas.length + ' pessoas e ' +
        Object.keys(S.state.lotacao).length + ' mesas ocupadas.', 'Pronto');
    } catch (e) {
      global.PlantaDialogo.aviso('Não consegui ler esse backup. ' + e.message, 'Deu ruim');
    }
  }

  function importarDialogo() {
    global.PlantaDialogo.pedir({
      titulo: 'Restaurar backup',
      texto: 'Cole aqui o texto que você copiou no Exportar. Isso substitui tudo que está salvo agora.',
      campos: [{ id: 'json', rotulo: '', tipo: 'textarea', valor: '', linhas: 9,
                 placeholder: '{ "v": 2, "setores": [ … ] }', obrigatorio: true }],
      ok: 'Restaurar',
      perigo: true,
      extras: pagInteira
        ? [{ rotulo: 'Abrir arquivo…', fecha: true, fn: function () { $('arquivo').click(); } }]
        : []
    }, function (v) { aplicaBackup(v.json); });
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
    global.PlantaSetores.init();
    montaAbas();
    montaBarra();
    trocaPiso(pisoAtual);

    global.PlantaDrag.init({
      onSolta: function (pid, mesaId) { S.alocar(pid, mesaId); P.selecionar(mesaId); },
      onRemove: function (pid) { S.desalocar(pid); },
      onClicarMesa: function (id) { P.selecionar(id); },
      onClicarPessoa: function (pid) { P.editarPessoa(pid); }
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
