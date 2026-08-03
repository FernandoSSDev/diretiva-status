/* =========================================================================
   ui.dialogo.js — Confirmação e aviso próprios
   -------------------------------------------------------------------------
   Não usamos confirm()/alert() do navegador: dentro de um iframe com
   sandbox (visualizador de artifact, embed) essas chamadas são bloqueadas
   e retornam sem perguntar nada — o botão simplesmente não fazia efeito.
   ========================================================================= */
(function (global) {
  'use strict';

  var dlg, elTexto, elOk, elCancelar, aoConfirmar;

  function monta() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dialogo';
    dlg.innerHTML =
      '<p class="dialogo-txt"></p>' +
      '<div class="dialogo-acoes">' +
        '<button class="btn btn-sec" data-cancelar>Cancelar</button>' +
        '<button class="btn btn-perigo" data-ok>Confirmar</button>' +
      '</div>';
    document.body.appendChild(dlg);

    elTexto = dlg.querySelector('.dialogo-txt');
    elOk = dlg.querySelector('[data-ok]');
    elCancelar = dlg.querySelector('[data-cancelar]');

    elOk.addEventListener('click', function () {
      var fn = aoConfirmar;
      aoConfirmar = null;
      dlg.close();
      if (fn) fn();
    });
    elCancelar.addEventListener('click', function () { aoConfirmar = null; dlg.close(); });
    dlg.addEventListener('cancel', function () { aoConfirmar = null; });
  }

  function abre(texto, rotuloOk, perigo, fn) {
    monta();
    elTexto.textContent = texto;
    elOk.textContent = rotuloOk;
    elOk.className = 'btn ' + (perigo ? 'btn-perigo' : 'btn-pri');
    elCancelar.hidden = !fn;
    aoConfirmar = fn || null;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    elOk.focus();
  }

  global.PlantaDialogo = {
    /** Pergunta antes de uma ação destrutiva. */
    confirmar: function (texto, rotuloOk, fn) { abre(texto, rotuloOk || 'Confirmar', true, fn); },
    /** Só informa — um botão de OK. */
    aviso: function (texto) { abre(texto, 'Entendi', false, null); }
  };
})(window);
