/* =========================================================================
   ui.dialogo.js — Avisos, confirmações e formulários próprios
   -------------------------------------------------------------------------
   Não usamos confirm()/alert()/prompt() do navegador: dentro de um iframe
   com sandbox (visualizador de artifact, embed) essas chamadas são
   bloqueadas e retornam sem perguntar nada.
   ========================================================================= */
(function (global) {
  'use strict';

  var dlg, form, elTitulo, elTexto, elCampos, elExtras, elOk, elCancelar;
  var aoConfirmar = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function monta() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dialogo';
    dlg.innerHTML =
      '<form method="dialog" novalidate>' +
        '<h3 class="dialogo-tit"></h3>' +
        '<p class="dialogo-txt"></p>' +
        '<div class="dialogo-campos"></div>' +
        '<div class="dialogo-acoes">' +
          '<span class="dialogo-extras"></span>' +
          '<button type="button" class="btn btn-sec" data-cancelar>Cancelar</button>' +
          '<button type="submit" class="btn btn-pri" data-ok>Confirmar</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(dlg);

    form = dlg.querySelector('form');
    elTitulo = dlg.querySelector('.dialogo-tit');
    elTexto = dlg.querySelector('.dialogo-txt');
    elCampos = dlg.querySelector('.dialogo-campos');
    elExtras = dlg.querySelector('.dialogo-extras');
    elOk = dlg.querySelector('[data-ok]');
    elCancelar = dlg.querySelector('[data-cancelar]');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var valores = {}, faltou = null;
      elCampos.querySelectorAll('[data-campo]').forEach(function (c) {
        var v = c.value;
        valores[c.getAttribute('data-campo')] = v;
        if (c.dataset.obrigatorio === '1' && !String(v).trim() && !faltou) faltou = c;
      });
      if (faltou) { faltou.focus(); faltou.classList.add('campo-erro'); return; }
      var fn = aoConfirmar;
      aoConfirmar = null;
      fecha();
      if (fn) fn(valores);
    });

    elCancelar.addEventListener('click', function () { aoConfirmar = null; fecha(); });
    dlg.addEventListener('cancel', function () { aoConfirmar = null; });
  }

  function fecha() {
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else dlg.removeAttribute('open');
  }

  function campoHTML(c) {
    var comum = 'data-campo="' + esc(c.id) + '" id="dlg-' + esc(c.id) + '"' +
      (c.obrigatorio ? ' data-obrigatorio="1"' : '') +
      (c.maxlength ? ' maxlength="' + c.maxlength + '"' : '') +
      (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '');

    var controle;
    if (c.tipo === 'textarea') {
      controle = '<textarea ' + comum + ' rows="' + (c.linhas || 8) + '"' +
        (c.somenteLeitura ? ' readonly' : '') + ' spellcheck="false">' + esc(c.valor) + '</textarea>';
    } else if (c.tipo === 'select') {
      controle = '<select ' + comum + '>' + (c.opcoes || []).map(function (o) {
        return '<option value="' + esc(o.valor) + '"' +
          (String(o.valor) === String(c.valor) ? ' selected' : '') + '>' + esc(o.rotulo) + '</option>';
      }).join('') + '</select>';
    } else if (c.tipo === 'color') {
      controle = '<input type="color" class="campo-cor" ' + comum + ' value="' + esc(c.valor) + '" />';
    } else {
      controle = '<input type="text" ' + comum + ' value="' + esc(c.valor) + '" />';
    }
    return '<label class="cmp' + (c.tipo === 'color' ? ' cmp-cor' : '') + '">' +
      esc(c.rotulo) + controle + '</label>';
  }

  /**
   * @param cfg {titulo, texto, campos[], ok, perigo, extras[{rotulo, fn}], semCancelar}
   * @param fn  recebe um objeto { idDoCampo: valor }
   */
  function abre(cfg, fn) {
    monta();
    elTitulo.textContent = cfg.titulo || '';
    elTitulo.hidden = !cfg.titulo;
    elTexto.textContent = cfg.texto || '';
    elTexto.hidden = !cfg.texto;

    elCampos.innerHTML = (cfg.campos || []).map(campoHTML).join('');
    elCampos.hidden = !(cfg.campos && cfg.campos.length);
    elCampos.querySelectorAll('[data-campo]').forEach(function (c) {
      c.addEventListener('input', function () { c.classList.remove('campo-erro'); });
    });

    elExtras.innerHTML = '';
    (cfg.extras || []).forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sec';
      b.textContent = e.rotulo;
      b.addEventListener('click', function () {
        e.fn(valoresAtuais(), b);
        if (e.fecha) { aoConfirmar = null; fecha(); }
      });
      elExtras.appendChild(b);
    });

    elOk.textContent = cfg.ok || 'Confirmar';
    elOk.className = 'btn ' + (cfg.perigo ? 'btn-perigo' : 'btn-pri');
    elCancelar.hidden = !!cfg.semCancelar;
    aoConfirmar = fn || null;

    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');

    var primeiro = elCampos.querySelector('[data-campo]:not([readonly])');
    (primeiro || elOk).focus();
    if (primeiro && primeiro.select && primeiro.type === 'text') primeiro.select();
  }

  function valoresAtuais() {
    var v = {};
    elCampos.querySelectorAll('[data-campo]').forEach(function (c) {
      v[c.getAttribute('data-campo')] = c.value;
    });
    return v;
  }

  /** Copia um texto usando o caminho que estiver disponível no ambiente. */
  function copiar(texto, campoId) {
    var campo = campoId && document.getElementById('dlg-' + campoId);
    if (campo) { campo.focus(); campo.select(); }
    var ok = false;
    try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
    if (!ok && global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).catch(function () { });
      ok = true;
    }
    return ok;
  }

  global.PlantaDialogo = {
    abre: abre,
    copiar: copiar,
    aviso: function (texto, titulo) {
      abre({ titulo: titulo, texto: texto, ok: 'Entendi', semCancelar: true }, null);
    },
    confirmar: function (texto, rotuloOk, fn) {
      abre({ texto: texto, ok: rotuloOk || 'Confirmar', perigo: true }, fn);
    },
    pedir: function (cfg, fn) { abre(cfg, fn); }
  };
})(window);
