/* =========================================================================
   dragdrop.js — Arrastar pessoas para as mesas (mouse + toque)
   -------------------------------------------------------------------------
   Usa Pointer Events em vez de HTML5 drag-and-drop: funciona em celular,
   permite arrastar de dentro do SVG e não depende de dataTransfer.
   ========================================================================= */
(function (global) {
  'use strict';

  var LIMIAR = 5;          // px até considerar que virou arrasto
  var cb = {};
  var arraste = null;      // { pid, x0, y0, ativo, ghost, alvo }
  var suprimirClique = false;

  function q(sel, ctx) { return (ctx || document).querySelector(sel); }

  /* --------------------------- fantasma ---------------------------------- */
  function criaGhost(pessoa) {
    var g = document.createElement('div');
    g.className = 'ghost';
    var S = global.PlantaStore;
    var setor = S.setorInfo((S.pessoa(pessoa.id) || {}).setor || '');
    g.innerHTML =
      '<span class="ghost-av" style="background:' + (pessoa.cor || setor.cor) + '">' +
      iniciais(pessoa.nome) + '</span>' +
      '<span class="ghost-nome">' + escapa(pessoa.nome) + '</span>';
    document.body.appendChild(g);
    return g;
  }
  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function escapa(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* --------------------------- alvo sob o cursor -------------------------- */
  function alvoEm(x, y) {
    if (arraste && arraste.ghost) arraste.ghost.style.display = 'none';
    var e = document.elementFromPoint(x, y);
    if (arraste && arraste.ghost) arraste.ghost.style.display = '';
    if (!e) return null;
    var mesa = e.closest ? e.closest('[data-desk-id]') : null;
    if (mesa) return { tipo: 'mesa', id: mesa.getAttribute('data-desk-id'), el: mesa };
    var lista = e.closest ? e.closest('[data-drop-lista]') : null;
    if (lista) return { tipo: 'lista', el: lista };
    return null;
  }

  function marcaAlvo(alvo) {
    if (arraste.alvo && arraste.alvo.el !== (alvo && alvo.el)) {
      arraste.alvo.el.classList.remove('alvo-ativo');
    }
    if (alvo) alvo.el.classList.add('alvo-ativo');
    arraste.alvo = alvo;
  }

  /* --------------------------- ciclo do arrasto --------------------------- */
  function inicia(ev, pid) {
    var pessoa = global.PlantaStore.pessoa(pid);
    if (!pessoa) return;
    arraste = {
      pid: pid, pessoa: pessoa,
      x0: ev.clientX, y0: ev.clientY,
      ativo: false, ghost: null, alvo: null,
      pointerId: ev.pointerId
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', solta);
    document.addEventListener('pointercancel', cancela);
  }

  function move(ev) {
    if (!arraste) return;
    var dx = ev.clientX - arraste.x0, dy = ev.clientY - arraste.y0;
    if (!arraste.ativo) {
      if (Math.abs(dx) < LIMIAR && Math.abs(dy) < LIMIAR) return;
      arraste.ativo = true;
      arraste.ghost = criaGhost(arraste.pessoa);
      document.body.classList.add('arrastando');
      var origem = global.PlantaStore.mesaDaPessoa(arraste.pid);
      if (origem && global.PlantaRender.elementoDaMesa(origem)) {
        global.PlantaRender.elementoDaMesa(origem).classList.add('origem-arrasto');
      }
    }
    ev.preventDefault();
    arraste.ghost.style.transform = 'translate(' + (ev.clientX + 14) + 'px,' + (ev.clientY + 14) + 'px)';
    marcaAlvo(alvoEm(ev.clientX, ev.clientY));
  }

  function limpa() {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', solta);
    document.removeEventListener('pointercancel', cancela);
    document.body.classList.remove('arrastando');
    if (arraste) {
      if (arraste.ghost && arraste.ghost.parentNode) arraste.ghost.parentNode.removeChild(arraste.ghost);
      if (arraste.alvo) arraste.alvo.el.classList.remove('alvo-ativo');
    }
    var o = document.querySelector('.origem-arrasto');
    if (o) o.classList.remove('origem-arrasto');
    arraste = null;
  }

  function solta(ev) {
    if (!arraste) return;
    var foiArrasto = arraste.ativo;
    var pid = arraste.pid;
    var alvo = foiArrasto ? alvoEm(ev.clientX, ev.clientY) : null;
    limpa();
    if (!foiArrasto) return;                       // clique simples: deixa para o click
    suprimirClique = true;                         // não deixa o click seguinte reabrir outra mesa
    setTimeout(function () { suprimirClique = false; }, 0);
    if (alvo && alvo.tipo === 'mesa') cb.onSolta && cb.onSolta(pid, alvo.id);
    else if (alvo && alvo.tipo === 'lista') cb.onRemove && cb.onRemove(pid);
  }

  function cancela() { limpa(); }

  /* --------------------------- pan da planta ------------------------------ */
  function ligaPan(area) {
    var pan = null;
    area.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest && ev.target.closest('[data-desk-id]')) return;
      if (ev.button !== 0 && ev.pointerType === 'mouse') return;
      pan = { x: ev.clientX, y: ev.clientY, moveu: false };
      area.setPointerCapture(ev.pointerId);
      area.classList.add('pegando');
    });
    area.addEventListener('pointermove', function (ev) {
      if (!pan) return;
      var k = global.PlantaRender.paraSVG(ev.clientX, ev.clientY);
      var k0 = global.PlantaRender.paraSVG(pan.x, pan.y);
      global.PlantaRender.pan(k.x - k0.x, k.y - k0.y);
      pan.x = ev.clientX; pan.y = ev.clientY; pan.moveu = true;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      area.addEventListener(t, function () { pan = null; area.classList.remove('pegando'); });
    });
    area.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var centro = global.PlantaRender.paraSVG(ev.clientX, ev.clientY);
      global.PlantaRender.zoom(ev.deltaY < 0 ? 1.12 : 1 / 1.12, centro);
    }, { passive: false });
  }

  /* --------------------------- init --------------------------------------- */
  function init(callbacks) {
    cb = callbacks || {};

    document.addEventListener('pointerdown', function (ev) {
      var chip = ev.target.closest && ev.target.closest('[data-drag-pessoa]');
      if (chip) { inicia(ev, chip.getAttribute('data-drag-pessoa')); return; }

      var mesa = ev.target.closest && ev.target.closest('[data-desk-id]');
      if (mesa) {
        var p = global.PlantaStore.pessoaDaMesa(mesa.getAttribute('data-desk-id'));
        if (p) inicia(ev, p.id);
      }
    });

    /* clique (sem arrasto) abre o painel da mesa */
    document.addEventListener('click', function (ev) {
      if (suprimirClique) { suprimirClique = false; return; }
      var mesa = ev.target.closest && ev.target.closest('[data-desk-id]');
      if (mesa && cb.onClicarMesa) cb.onClicarMesa(mesa.getAttribute('data-desk-id'));
    }, true);

    /* teclado: Enter/Espaço na mesa */
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var mesa = ev.target.closest && ev.target.closest('[data-desk-id]');
      if (mesa) { ev.preventDefault(); cb.onClicarMesa && cb.onClicarMesa(mesa.getAttribute('data-desk-id')); }
    });
  }

  global.PlantaDrag = { init: init, ligaPan: ligaPan };
})(window);
