/* =========================================================================
   render.plan.js — Desenho da planta em SVG (1 unidade = 1 cm)
   ========================================================================= */
(function (global) {
  'use strict';

  var D = global.PlantaDados;
  var S = global.PlantaStore;
  var NS = 'http://www.w3.org/2000/svg';
  var WALL = D.CM.WALL;
  var PAD = 115;                       // respiro para cotas e rótulos externos

  var svg, gMundo, gMesas, piso, VW, VH, OFF;
  var view = { escala: 1, tx: 0, ty: 0 };
  var opcoes = { cotas: true, nomes: true, mobiliario: true };

  /* --------------------------- utilidades -------------------------------- */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, str, cls, anchor, girar) {
    var t = el('text', { x: x, y: y, class: cls || '', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    if (girar) t.setAttribute('transform', 'rotate(' + girar + ' ' + x + ' ' + y + ')');
    return t;
  }
  function corta(s, max) {
    s = String(s || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  }
  function primeiro(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  }
  function metros(cm) {
    return (cm / 100).toFixed(2).replace('.', ',') + ' m';
  }

  /* --------------------------- defs -------------------------------------- */
  function defs(parent) {
    var d = el('defs', {}, parent);

    var hatch = el('pattern', {
      id: 'p-pista', width: 14, height: 14, patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    }, d);
    el('rect', { width: 14, height: 14, fill: '#E9F4FB' }, hatch);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 14, stroke: '#A6D0E8', 'stroke-width': 3 }, hatch);

    var wc = el('pattern', {
      id: 'p-wc', width: 12, height: 12, patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    }, d);
    el('rect', { width: 12, height: 12, fill: '#EAF6FC' }, wc);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: '#2CADE2', 'stroke-width': 2 }, wc);

    var vidro = el('pattern', {
      id: 'p-vidro', width: 10, height: 10, patternUnits: 'userSpaceOnUse',
      patternTransform: 'rotate(45)'
    }, d);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: '#2CADE2', 'stroke-width': 2.5 }, vidro);

    var arm = el('pattern', { id: 'p-armario', width: 60, height: 60, patternUnits: 'userSpaceOnUse' }, d);
    el('rect', { width: 60, height: 60, fill: '#E7EEF6' }, arm);
    el('rect', { width: 60, height: 60, fill: 'none', stroke: '#B9CDE0', 'stroke-width': 2 }, arm);

    var sombra = el('filter', { id: 'f-mesa', x: '-40%', y: '-40%', width: '180%', height: '200%' }, d);
    el('feDropShadow', { dx: 0, dy: 3, stdDeviation: 4, 'flood-color': '#0E4B83', 'flood-opacity': '.20' }, sombra);

    var glow = el('filter', { id: 'f-alvo', x: '-50%', y: '-50%', width: '200%', height: '200%' }, d);
    el('feDropShadow', { dx: 0, dy: 0, stdDeviation: 9, 'flood-color': '#2CADE2', 'flood-opacity': '.95' }, glow);
  }

  /* --------------------------- casca ------------------------------------- */
  function estrutura(g) {
    var R = piso.room;

    el('rect', { x: 0, y: 0, width: R.w, height: R.h, class: 'piso' }, g);

    (piso.pistas || []).forEach(function (p) {
      el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: 'url(#p-pista)', opacity: '.8' }, g);
    });

    /* paredes externas */
    el('rect', {
      x: -WALL / 2, y: -WALL / 2, width: R.w + WALL, height: R.h + WALL, class: 'parede'
    }, g);

    /* paredes internas */
    (piso.paredes || []).forEach(function (p) {
      el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, class: 'parede-int' }, g);
    });

    /* portas (vão + arco de abertura) */
    (piso.portas || []).forEach(function (p) {
      el('rect', { x: p.x, y: p.y - WALL / 2, width: p.w, height: WALL, class: 'vao' }, g);
      var arco = el('path', {
        d: 'M ' + p.x + ' ' + p.y + ' a ' + p.w + ' ' + p.w + ' 0 0 0 ' + p.w + ' ' + (-p.w),
        class: 'porta-arco'
      }, g);
      arco.setAttribute('transform', 'translate(0,0)');
      el('line', { x1: p.x, y1: p.y, x2: p.x, y2: p.y - p.w, class: 'porta-folha' }, g);
      txt(g, p.x + p.w / 2, p.y + 30, 'PORTA', 'legenda-mini', 'middle');
    });

    /* janelas */
    (piso.janelas || []).forEach(function (j) {
      if (j.lado === 'direita') {
        el('rect', {
          x: R.w - WALL / 2, y: j.ini, width: WALL, height: j.fim - j.ini,
          fill: 'url(#p-vidro)', stroke: '#2CADE2', 'stroke-width': 2.5
        }, g);
        txt(g, R.w + 62, (j.ini + j.fim) / 2, 'J A N E L A S', 'rot-label', 'middle', 90);
      }
    });

    /* salas fechadas */
    (piso.salas || []).forEach(function (s) {
      el('rect', {
        x: s.x, y: s.y, width: s.w, height: s.h,
        class: 'sala', fill: s.tipo === 'wc' ? 'url(#p-wc)' : null
      }, g);
      txt(g, s.x + s.w / 2, s.y + s.h / 2 - 3, s.nome.toUpperCase(), 'sala-nome', 'middle');
      txt(g, s.x + s.w / 2, s.y + s.h / 2 + 25, metros(s.w) + ' × ' + metros(s.h), 'sala-dim', 'middle');
    });

    /* armários */
    if (opcoes.mobiliario) {
      (piso.armarios || []).forEach(function (c) {
        el('rect', {
          x: c.x, y: c.y, width: c.w, height: c.h,
          fill: 'url(#p-armario)', stroke: '#93AFC9', 'stroke-width': 2
        }, g);
        txt(g, c.x + c.w / 2, c.y + c.h / 2 + 7, 'A R M Á R I O', 'armario-nome', 'middle');
      });
    }

    /* escadas */
    (piso.escadas || []).forEach(function (e) { escada(g, e); });

    /* separadores de 10 cm */
    (piso.dividers || []).forEach(function (d) {
      el('rect', { x: d.x, y: d.y, width: d.w, height: d.h, rx: 2, class: 'separador' }, g);
    });

    /* rótulos de zona */
    (piso.zonas || []).forEach(function (z) {
      txt(g, z.x, z.y, z.nome, 'zona-nome', 'start');
    });
  }

  function escada(g, e) {
    var ge = el('g', { class: 'escada' }, g);
    if (e.patamar) {
      el('rect', {
        x: e.patamar.x, y: e.patamar.y, width: e.patamar.w, height: e.patamar.h,
        class: 'escada-base'
      }, ge);
    }
    e.lances.forEach(function (l) {
      el('rect', { x: l.x, y: l.y, width: l.w, height: l.h, class: 'escada-base' }, ge);
      var passo = l.w / l.degraus;
      for (var i = 1; i < l.degraus; i++) {
        el('line', {
          x1: l.x + i * passo, y1: l.y, x2: l.x + i * passo, y2: l.y + l.h, class: 'degrau'
        }, ge);
      }
    });
    var l0 = e.lances[0];
    txt(ge, l0.x + l0.w / 2, l0.y + l0.h / 2 + 7, (e.rotulo || 'Escada').toUpperCase(),
      'escada-nome', 'middle');
  }

  /* --------------------------- cotas ------------------------------------- */
  function cotas(g) {
    var gc = el('g', { class: 'cotas' }, g);
    var R = piso.room;

    function cotaH(a, b, y, label) {
      el('line', { x1: a, y1: y, x2: b, y2: y }, gc);
      el('line', { x1: a, y1: y - 9, x2: a, y2: y + 9 }, gc);
      el('line', { x1: b, y1: y - 9, x2: b, y2: y + 9 }, gc);
      txt(gc, (a + b) / 2, y - 11, label, 'cota-txt', 'middle');
    }
    function cotaV(a, b, x, label) {
      el('line', { x1: x, y1: a, x2: x, y2: b }, gc);
      el('line', { x1: x - 9, y1: a, x2: x + 9, y2: a }, gc);
      el('line', { x1: x - 9, y1: b, x2: x + 9, y2: b }, gc);
      txt(gc, x - 11, (a + b) / 2, label, 'cota-txt', 'middle', -90);
    }

    cotaH(0, R.w, -64, metros(R.w));
    cotaV(0, R.h, -64, metros(R.h));
    (piso.cotasDetalhe || []).forEach(function (c) {
      if (c.tipo === 'h') cotaH(c.a, c.b, c.pos, c.texto);
      else cotaV(c.a, c.b, c.pos, c.texto);
    });
    return gc;
  }

  /* --------------------------- mesas ------------------------------------- */
  /** A cadeira herda a cor do setor DA MESA — é o que marca a área no desenho. */
  function cadeira(g, d, cor) {
    var cx = d.x + d.w / 2, cy = d.y + d.h / 2, a = { class: 'cadeira', rx: 8 };
    if (d.face === 'up')    { a.x = cx - 23; a.y = d.y - 31;      a.width = 46; a.height = 25; }
    if (d.face === 'down')  { a.x = cx - 23; a.y = d.y + d.h + 6; a.width = 46; a.height = 25; }
    if (d.face === 'left')  { a.x = d.x - 31; a.y = cy - 23;      a.width = 25; a.height = 46; }
    if (d.face === 'right') { a.x = d.x + d.w + 6; a.y = cy - 23; a.width = 25; a.height = 46; }
    /* precisa ser style inline: atributo de apresentação perde para o .cadeira do CSS */
    if (cor) a.style = 'fill:' + cor + ';fill-opacity:.5;stroke:' + cor + ';stroke-opacity:.9';
    el('rect', a, g);
  }

  function desenhaMesa(g, d) {
    var vertical = d.h > d.w;
    var p = S.pessoaDaMesa(d.id);
    var meta = S.mesa(d.id);
    var setor = S.setorInfo(meta.setor);

    var gm = el('g', {
      class: 'mesa ' + (p ? 'ocupada' : 'vaga'),
      'data-desk-id': d.id,
      tabindex: '0',
      role: 'button',
      'aria-label': S.nomeMesa(d.id) + (p ? ' — ' + p.nome : ' — livre')
    }, g);

    cadeira(gm, d, meta.setor ? setor.cor : null);
    el('rect', {
      x: d.x, y: d.y, width: d.w, height: d.h, rx: 4, class: 'mesa-tampo', filter: 'url(#f-mesa)'
    }, gm);

    /* A área do setor é fixa: fica na mesa, não em quem senta nela. */
    if (meta.setor) {
      el('rect', {
        x: d.x, y: d.y, width: d.w, height: d.h, rx: 4,
        fill: setor.cor, opacity: '.13', class: 'mesa-tinta'
      }, gm);
      el('rect', {
        x: d.x, y: d.y, width: vertical ? d.w : 7, height: vertical ? 7 : d.h,
        rx: 3, fill: setor.cor
      }, gm);
    }

    el('rect', {
      x: d.x, y: d.y, width: d.w, height: d.h, rx: 4, class: 'mesa-alvo'
    }, gm);

    /* número */
    el('rect', {
      x: d.x + (vertical ? d.w / 2 - 12 : 9), y: d.y + 7, width: 24, height: 15,
      rx: 4, class: 'mesa-num-bg'
    }, gm);
    txt(gm, d.x + (vertical ? d.w / 2 : 21), d.y + 18.4, String(d.num), 'mesa-num', 'middle');

    /* o rótulo só aparece quando a mesa recebeu um nome próprio — o número já identifica */
    if (opcoes.nomes && !vertical && meta.nome && meta.nome.trim()) {
      txt(gm, d.x + 39, d.y + 18.4, corta(meta.nome.trim(), 13), 'mesa-nome', 'start');
    }

    if (p) {
      var st = S.STATUS[p.status] || S.STATUS.disponivel;
      if (vertical) {
        el('circle', { cx: d.x + d.w / 2, cy: d.y + 52, r: 15, fill: S.corDaPessoa(p), class: 'avatar' }, gm);
        txt(gm, d.x + d.w / 2, d.y + 57, iniciais(p.nome), 'avatar-txt', 'middle');
        txt(gm, d.x + d.w / 2, d.y + 84, corta(primeiro(p.nome), 9), 'pessoa-nome', 'middle');
        txt(gm, d.x + d.w / 2, d.y + 98, corta(p.cargo || st.nome, 10), 'pessoa-cargo', 'middle');
      } else {
        el('circle', { cx: d.x + 24, cy: d.y + 40, r: 15, fill: S.corDaPessoa(p), class: 'avatar' }, gm);
        txt(gm, d.x + 24, d.y + 45, iniciais(p.nome), 'avatar-txt', 'middle');
        txt(gm, d.x + 46, d.y + 38, corta(p.nome, 15), 'pessoa-nome', 'start');
        txt(gm, d.x + 46, d.y + 51, corta(p.cargo || st.nome, 18), 'pessoa-cargo', 'start');
      }
      el('circle', {
        cx: d.x + d.w - 12, cy: d.y + 14, r: 6, fill: st.cor,
        class: 'farol' + (p.status === 'ligacao' ? ' pulsa' : '')
      }, gm);
    } else {
      txt(gm, d.x + d.w / 2, d.y + (vertical ? 72 : 44), 'livre', 'mesa-livre', 'middle');
    }
    return gm;
  }

  /* --------------------------- API ---------------------------------------- */
  function montar(container, pisoId) {
    piso = D.piso(pisoId);
    VW = piso.room.w + WALL * 2 + PAD * 2;
    VH = piso.room.h + WALL * 2 + PAD * 2;
    OFF = WALL + PAD;

    container.innerHTML = '';
    svg = el('svg', {
      viewBox: '0 0 ' + VW + ' ' + VH,
      class: 'planta-svg',
      preserveAspectRatio: 'xMidYMid meet',
      xmlns: NS,
      'aria-label': 'Planta baixa — ' + piso.nome
    }, container);

    defs(svg);
    gMundo = el('g', { class: 'mundo' }, svg);
    estrutura(gMundo);
    cotas(gMundo);
    gMesas = el('g', { class: 'mesas' }, gMundo);
    view = { escala: 1, tx: 0, ty: 0 };
    redesenhar();
    return svg;
  }

  function redesenhar() {
    if (!gMesas) return;
    while (gMesas.firstChild) gMesas.removeChild(gMesas.firstChild);
    piso.mesas.forEach(function (d) { desenhaMesa(gMesas, d); });
    var gc = svg.querySelector('.cotas');
    if (gc) gc.style.display = opcoes.cotas ? '' : 'none';
    aplicaView();
  }

  function aplicaView() {
    if (!gMundo) return;
    gMundo.setAttribute('transform',
      'translate(' + (OFF + view.tx) + ',' + (OFF + view.ty) + ') scale(' + view.escala + ')');
  }

  function zoom(fator, centro) {
    var novo = Math.min(5, Math.max(0.4, view.escala * fator));
    if (centro) {
      view.tx = centro.x - (centro.x - view.tx) * (novo / view.escala);
      view.ty = centro.y - (centro.y - view.ty) * (novo / view.escala);
    }
    view.escala = novo;
    aplicaView();
  }
  function ajustar() { view = { escala: 1, tx: 0, ty: 0 }; aplicaView(); }
  function pan(dx, dy) { view.tx += dx; view.ty += dy; aplicaView(); }

  function setOpcao(k, v) {
    opcoes[k] = v;
    redesenhar();
  }

  function elementoDaMesa(id) {
    return gMesas ? gMesas.querySelector('[data-desk-id="' + CSS.escape(id) + '"]') : null;
  }

  /** tela -> unidades do SVG (cm) */
  function paraSVG(clientX, clientY) {
    var r = svg.getBoundingClientRect();
    var k = VW / r.width;
    return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
  }

  global.PlantaRender = {
    montar: montar,
    redesenhar: redesenhar,
    zoom: zoom,
    ajustar: ajustar,
    pan: pan,
    setOpcao: setOpcao,
    opcoes: opcoes,
    elementoDaMesa: elementoDaMesa,
    paraSVG: paraSVG,
    get svg() { return svg; },
    get piso() { return piso; },
    get view() { return view; }
  };
})(window);
