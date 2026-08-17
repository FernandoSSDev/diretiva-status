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
    montaLegendaSetores();
    atualizaCabecalhoImpressao();
    var sel = P.mesaSelecionada;
    if (sel && D.pisoDaMesa(sel) && D.pisoDaMesa(sel).id === id) P.selecionar(sel);
  }

  /* Legenda das áreas: só os setores que realmente aparecem neste ambiente. */
  function montaLegendaSetores() {
    var alvo = $('legenda-setores');
    if (!alvo) return;
    var piso = D.piso(pisoAtual);
    var usados = [];
    piso.mesas.forEach(function (m) {
      var id = S.mesa(m.id).setor;
      if (id && usados.indexOf(id) < 0) usados.push(id);
    });

    if (!usados.length) { alvo.hidden = true; alvo.innerHTML = ''; return; }
    alvo.hidden = false;
    alvo.innerHTML = '<span class="legenda-tit">Áreas neste piso:</span>' + usados.map(function (id) {
      var s = S.setorInfo(id);
      var n = piso.mesas.filter(function (m) { return S.mesa(m.id).setor === id; }).length;
      return '<span><i style="background:' + s.cor + '"></i>' + s.nome +
        ' <b>' + n + '</b></span>';
    }).join('');
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

    $('bt-imprimir').onclick = imprimir;

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
  /* Caminhos de saída, do melhor para o pior conforme o ambiente permitir:
     salvar arquivo (capacidade "downloads" do visualizador, ou download comum
     fora de iframe), enviar pelo compartilhamento do celular, e copiar o texto
     — este último sempre funciona. Na entrada, abrir arquivo ou colar.
     O seletor de arquivo funciona mesmo dentro de iframe com sandbox. */
  var pagInteira = (function () {
    try { return global.self === global.top; } catch (e) { return false; }
  })();
  var salvador = null;     // namespace da capacidade "downloads", quando houver

  function detectaSalvador() {
    if (!global.claude || typeof global.claude.use !== 'function') return;
    try {
      global.claude.use('downloads').then(
        function (d) { salvador = d || null; },
        function () { salvador = null; }
      );
    } catch (e) { salvador = null; }
  }
  function podeSalvarArquivo() { return !!salvador || pagInteira; }
  function podeCompartilhar() { return !!(global.navigator && navigator.share); }
  function podeColar() {
    return !!(global.navigator && navigator.clipboard && navigator.clipboard.readText);
  }
  function nomeArquivo() { return 'planta-diretiva-' + hoje() + '.json'; }

  function piscaBotao(botao, texto) {
    var antes = botao.textContent;
    botao.textContent = texto;
    setTimeout(function () { botao.textContent = antes; }, 2600);
  }

  function salvaArquivo(json) {
    if (salvador) {
      salvador.save({ filename: nomeArquivo(), data: json }).then(null, function (e) {
        if (e && e.code === 'declined') return;              // o usuário recusou
        global.PlantaDialogo.aviso(
          'Não consegui salvar o arquivo aqui. Use o botão Copiar e cole o texto onde ' +
          'preferir.', 'Salvar não deu');
      });
      return;
    }
    try {
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nomeArquivo();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { /* sem jeito por aqui — o texto na tela resolve */ }
  }

  /* --------------------------- impressão --------------------------------- */
  /* Dentro do visualizador, mandar imprimir a partir da página imprimiria a
     página inteira do site que nos hospeda, não a planta. Nesse caso o
     caminho é gerar um PNG da planta e imprimir por ele. */
  function salvaPNG(botao) {
    var original = botao && botao.textContent;
    if (botao) botao.textContent = 'Gerando…';
    R.paraPNG(2.5).then(function (blob) {
      var nome = 'planta-' + D.piso(pisoAtual).id + '-' + hoje() + '.png';
      if (salvador) {
        return salvador.save({ filename: nome, data: blob }).then(function () {
          if (botao) piscaBotao(botao, 'Salvo ✓');
        }, function (e) {
          if (botao) botao.textContent = original;
          if (e && e.code === 'declined') return;
          throw e;
        });
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      if (botao) piscaBotao(botao, 'Salvo ✓');
    }).catch(function (e) {
      if (botao) botao.textContent = original;
      global.PlantaDialogo.aviso('Não consegui gerar a imagem da planta. ' +
        ((e && e.message) || ''), 'Imagem não saiu');
    });
  }

  function atualizaCabecalhoImpressao() {
    var cab = $('impressao-cab');
    if (!cab) return;
    var piso = D.piso(pisoAtual);
    var ocup = piso.mesas.filter(function (m) { return !!S.pessoaDaMesa(m.id); }).length;
    cab.innerHTML =
      '<strong>Diretiva Patrimonial — ' + piso.nome + '</strong>' +
      '<span>' + piso.subtitulo + ' · ' +
        (piso.room.w / 100).toFixed(2).replace('.', ',') + ' × ' +
        (piso.room.h / 100).toFixed(2).replace('.', ',') + ' m · ' +
        ocup + ' de ' + piso.mesas.length + ' mesas ocupadas · ' +
        'mesas de 1,20 × 0,60 m com separador de 10 cm</span>';
  }

  var temToque = (function () {
    return ('ontouchstart' in global) || (global.navigator && navigator.maxTouchPoints > 0);
  })();
  var urlPrevia = null;

  function imprimir() {
    atualizaCabecalhoImpressao();

    if (pagInteira) {
      R.ajustar();                       // o papel recebe a planta enquadrada
      setTimeout(function () { global.print(); }, 80);
      return;
    }

    /* No visualizador, mandar imprimir daqui levaria a página inteira do site
       hospedeiro para o papel. Então geramos a imagem e mostramos na tela: dá
       para salvar e imprimir por ela em qualquer navegador, sem permissão. */
    global.PlantaDialogo.pedir({
      titulo: 'Imprimir a planta', texto: 'Gerando a imagem da planta…',
      ok: 'Fechar', semCancelar: true
    }, null);

    R.paraPNG(2.5).then(function (blob) {
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
      urlPrevia = URL.createObjectURL(blob);
      var piso = D.piso(pisoAtual);

      var extras = [];
      if (podeSalvarArquivo()) {
        extras.push({ rotulo: 'Salvar arquivo', fn: function (v, botao) { salvaPNG(botao); } });
      }

      global.PlantaDialogo.pedir({
        titulo: 'Planta pronta para imprimir',
        texto: (temToque
          ? 'Toque e segure na imagem abaixo e escolha "Salvar imagem". '
          : 'Clique com o botão direito na imagem abaixo e escolha "Salvar imagem como…". ') +
          'Depois é só abrir a imagem e mandar imprimir — ela sai em alta resolução, ' +
          'com as cores dos setores, as cotas e os nomes.',
        html: '<img class="previa-planta" src="' + urlPrevia +
              '" alt="Planta do ' + piso.nome + '" />',
        ok: 'Fechar', semCancelar: true, extras: extras
      }, null);
    }, function (e) {
      global.PlantaDialogo.aviso('Não consegui gerar a imagem da planta. ' +
        ((e && e.message) || ''), 'Imagem não saiu');
    });
  }

  function exportar() {
    var json = S.exportar();
    var resumo = S.state.pessoas.length + ' pessoas · ' +
      Object.keys(S.state.lotacao).length + ' mesas ocupadas · ' +
      S.setores().length + ' setores';

    var extras = [];
    if (podeSalvarArquivo()) {
      extras.push({ rotulo: 'Salvar arquivo', fn: function (v) { salvaArquivo(v.json); } });
    }
    if (podeCompartilhar()) {
      extras.push({ rotulo: 'Enviar', fn: function (v, botao) {
        navigator.share({ title: 'Backup da planta — Diretiva', text: v.json }).then(
          function () { piscaBotao(botao, 'Enviado ✓'); },
          function (e) { if (!e || e.name !== 'AbortError') piscaBotao(botao, 'Use Copiar'); }
        );
      } });
    }
    extras.push({ rotulo: 'Copiar', fn: function (v, botao) {
      global.PlantaDialogo.copiar(v.json, 'json').then(function (ok) {
        piscaBotao(botao, ok ? 'Copiado ✓' : 'Não deu — o texto já está selecionado');
      });
    } });

    global.PlantaDialogo.pedir({
      titulo: 'Backup dos dados',
      texto: 'Guardado aqui: ' + resumo + '. ' + (podeSalvarArquivo()
        ? 'Salve o arquivo — é o jeito mais simples de levar para outro aparelho. '
        : '') + 'Você também pode copiar o texto abaixo e mandar para si mesmo. ' +
        'Para voltar com ele, use Importar.',
      campos: [{ id: 'json', rotulo: '', tipo: 'textarea', valor: json, linhas: 8, somenteLeitura: true }],
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
    var extras = [{
      rotulo: 'Abrir arquivo…', fecha: true, fn: function () { $('arquivo').click(); }
    }];
    if (podeColar()) {
      extras.push({ rotulo: 'Colar', fn: function (v, botao) {
        navigator.clipboard.readText().then(function (t) {
          var campo = document.getElementById('dlg-json');
          if (!campo) return;
          campo.value = t;
          campo.classList.remove('campo-erro');
          piscaBotao(botao, 'Colado ✓');
        }, function () { piscaBotao(botao, 'Cole no campo abaixo'); });
      } });
    }

    global.PlantaDialogo.pedir({
      titulo: 'Restaurar backup',
      texto: 'Abra o arquivo do backup, ou cole no campo o texto que você copiou. ' +
             'Isso substitui tudo que está salvo neste aparelho.',
      campos: [{ id: 'json', rotulo: '', tipo: 'textarea', valor: '', linhas: 8,
                 placeholder: '{"v":2,"setores":[ … ]}', obrigatorio: true }],
      ok: 'Restaurar',
      perigo: true,
      extras: extras
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
    detectaSalvador();
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

    S.onChange(function () { montaAbas(); montaLegendaSetores(); });

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
