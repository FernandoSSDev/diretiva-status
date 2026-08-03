/* =========================================================================
   data.pisos.js — Modelo geométrico dos ambientes
   -------------------------------------------------------------------------
   Medidas em CENTÍMETROS. Origem (0,0) = canto superior esquerdo da área
   interna (face interna das paredes externas).

   Padrão das estações (definido pelo cliente):
     • mesa ........ 120 x 60 cm
     • separador ... 10 cm entre mesas de frente uma para a outra

   Os croquis foram desenhados com a folha girada; a planta abaixo já está
   na orientação de leitura (numeração na posição correta).
   ========================================================================= */
(function (global) {
  'use strict';

  var CM = { DESK_W: 120, DESK_D: 60, DIVIDER: 10, WALL: 15 };

  /* ----------------------------- helpers --------------------------------- */
  function mesaH(id, num, rot, x, y, face) {
    return { id: id, num: num, rotulo: rot, x: x, y: y, w: CM.DESK_W, h: CM.DESK_D, face: face };
  }
  function mesaV(id, num, rot, x, y, face) {
    return { id: id, num: num, rotulo: rot, x: x, y: y, w: CM.DESK_D, h: CM.DESK_W, face: face };
  }

  /**
   * Ilha de bancada: duas fileiras de frente uma para a outra.
   * @param pref  prefixo do id (ex.: 'S')
   * @param rot   rótulo base (ex.: 'Mesa')
   * @param cima  números da fileira de cima (esquerda -> direita)
   * @param baixo números da fileira de baixo
   */
  function ilha(pref, rot, cima, baixo, x0, yTop) {
    var mesas = [], divs = [];
    var yBot = yTop + CM.DESK_D + CM.DIVIDER;
    cima.forEach(function (n, i) {
      mesas.push(mesaH(pref + n, n, rot, x0 + i * CM.DESK_W, yTop, 'up'));
    });
    baixo.forEach(function (n, i) {
      mesas.push(mesaH(pref + n, n, rot, x0 + i * CM.DESK_W, yBot, 'down'));
    });
    divs.push({
      x: x0, y: yTop + CM.DESK_D,
      w: CM.DESK_W * Math.max(cima.length, baixo.length), h: CM.DIVIDER
    });
    return { mesas: mesas, divs: divs };
  }

  function juntar(alvo, parte) {
    alvo.mesas = alvo.mesas.concat(parte.mesas);
    alvo.dividers = alvo.dividers.concat(parte.divs);
    return alvo;
  }

  /* =======================================================================
     1) PISO SUPERIOR — 25 mesas
     ======================================================================= */
  var superior = (function () {
    var ROOM = { w: 1060, h: 1260 };
    var SALAS_W = 300, BLOCO_X = 400, SAT_X = 860, CAB_D = 45;
    var Y = { D: 105, C: 405, B: 715, A: 1025 };

    var acc = { mesas: [], dividers: [] };

    /* Ilha D — mesas 24 e 25 giradas 90° */
    acc.mesas.push(mesaV('S24', 24, 'Mesa', BLOCO_X, Y.D, 'left'));
    acc.mesas.push(mesaV('S25', 25, 'Mesa', BLOCO_X + CM.DESK_D + CM.DIVIDER, Y.D, 'right'));
    acc.dividers.push({ x: BLOCO_X + CM.DESK_D, y: Y.D, w: CM.DIVIDER, h: CM.DESK_W });

    /* Ilhas C, B, A (3 + 3) */
    juntar(acc, ilha('S', 'Mesa', [21, 22, 23], [16, 17, 18], BLOCO_X, Y.C));
    juntar(acc, ilha('S', 'Mesa', [15, 14, 13], [8, 9, 10], BLOCO_X, Y.B));
    juntar(acc, ilha('S', 'Mesa', [4, 5, 6], [1, 2, 3], BLOCO_X, Y.A));

    /* Satélites junto às janelas */
    juntar(acc, ilha('S', 'Mesa', [20], [19], SAT_X, Y.C));
    juntar(acc, ilha('S', 'Mesa', [12], [11], SAT_X, Y.B));
    acc.mesas.push(mesaH('S7', 7, 'Mesa', SAT_X, Y.A + CM.DESK_D + CM.DIVIDER, 'down'));

    return {
      id: 'superior',
      nome: 'Piso Superior',
      subtitulo: 'Salão principal · 25 estações',
      room: ROOM,
      mesas: acc.mesas,
      dividers: acc.dividers,
      salas: [
        { nome: 'Reunião',   x: 0, y: 0,   w: SALAS_W, h: 420 },
        { nome: 'Diretoria', x: 0, y: 420, w: SALAS_W, h: 480 },
        { nome: 'Banheiro',  x: 0, y: 900, w: SALAS_W, h: 360, tipo: 'wc' }
      ],
      armarios: [
        { x: SALAS_W, y: 0,              w: ROOM.w - SALAS_W, h: CAB_D },
        { x: SALAS_W, y: ROOM.h - CAB_D, w: ROOM.w - SALAS_W, h: CAB_D }
      ],
      pistas: [
        { x: 300, y: CAB_D, w: 100, h: ROOM.h - CAB_D * 2 },
        { x: 760, y: CAB_D, w: 100, h: ROOM.h - CAB_D * 2 }
      ],
      janelas: [{ lado: 'direita', ini: 60, fim: ROOM.h - 60 }],
      paredes: [],
      portas: [],
      escadas: [],
      zonas: [],
      cotasDetalhe: [
        { tipo: 'h', a: 400, b: 760, pos: Y.A - 34, texto: '3 × 1,20 = 3,60 m' },
        { tipo: 'v', a: Y.A, b: Y.A + 130, pos: 806, texto: '0,60 + 0,10 + 0,60' }
      ],
      grupos: [
        { nome: 'Ilha A', mesas: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'] },
        { nome: 'Ilha B', mesas: ['S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15'] },
        { nome: 'Ilha C', mesas: ['S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23'] },
        { nome: 'Ilha D', mesas: ['S24', 'S25'] }
      ]
    };
  })();

  /* =======================================================================
     2) PISO INFERIOR — JURÍDICO + PATRIMONIAL — 9 mesas
     ======================================================================= */
  var juridicoPatrimonial = (function () {
    var ROOM = { w: 1200, h: 850 };
    var acc = { mesas: [], dividers: [] };

    /* Patrimonial: 1·2 em cima, 3·4 embaixo, + mesa 5 isolada */
    juntar(acc, ilha('PAT', 'Patrimonial', [1, 2], [3, 4], 130, 160));
    acc.mesas.push(mesaH('PAT5', 5, 'Patrimonial', 60, 400, 'down'));

    /* Jurídico: 1·2 em cima, 3·4 embaixo */
    juntar(acc, ilha('JUR', 'Jurídico', [1, 2], [3, 4], 780, 520));

    return {
      id: 'inferior-jp',
      nome: 'Piso Inferior — Jurídico + Patrimonial',
      subtitulo: 'Patrimonial (5) · Jurídico (4)',
      room: ROOM,
      mesas: acc.mesas,
      dividers: acc.dividers,
      salas: [
        { nome: 'Banheiro', x: 1000, y: 170, w: 200, h: 180, tipo: 'wc' }
      ],
      armarios: [
        { x: 60, y: ROOM.h - 60, w: 370, h: 60 }
      ],
      pistas: [
        { x: 440, y: 60, w: 90, h: ROOM.h - 120 }
      ],
      janelas: [],
      paredes: [
        { x: 530, y: 0, w: 15, h: 360 }
      ],
      portas: [
        { x: 465, y: ROOM.h, w: 100, lado: 'baixo' }
      ],
      escadas: [{
        rotulo: 'Escada',
        lances: [
          { x: 620, y: 30,  w: 252, h: 110, degraus: 9, eixo: 'x' },
          { x: 620, y: 140, w: 168, h: 110, degraus: 6, eixo: 'x' }
        ],
        patamar: { x: 872, y: 30, w: 110, h: 220 }
      }],
      zonas: [
        { nome: 'PATRIMONIAL', x: 60,  y: 92 },
        { nome: 'JURÍDICO',    x: 780, y: 478 }
      ],
      cotasDetalhe: [
        { tipo: 'h', a: 130, b: 370, pos: 142, texto: '2 × 1,20 = 2,40 m' },
        { tipo: 'v', a: 160, b: 290, pos: 416, texto: '0,60 + 0,10 + 0,60' }
      ],
      grupos: [
        { nome: 'Patrimonial', mesas: ['PAT1', 'PAT2', 'PAT3', 'PAT4', 'PAT5'] },
        { nome: 'Jurídico',    mesas: ['JUR1', 'JUR2', 'JUR3', 'JUR4'] }
      ]
    };
  })();

  /* =======================================================================
     3) PISO INFERIOR — CONTABILIDADE — 13 mesas
     ======================================================================= */
  var contabilidade = (function () {
    var ROOM = { w: 900, h: 620 };
    var acc = { mesas: [], dividers: [] };

    /* mesa 1 — isolada, girada 90° */
    acc.mesas.push(mesaV('CTB1', 1, 'Contabilidade', 110, 250, 'left'));

    /* pares 5/4 e 3/2 (uma mesa de frente para a outra) */
    juntar(acc, ilha('CTB', 'Contabilidade', [5], [4], 245, 90));
    juntar(acc, ilha('CTB', 'Contabilidade', [3], [2], 250, 400));

    /* ilhas 2 + 2 */
    juntar(acc, ilha('CTB', 'Contabilidade', [13, 12], [10, 11], 545, 90));
    juntar(acc, ilha('CTB', 'Contabilidade', [8, 9], [6, 7], 535, 380));

    return {
      id: 'inferior-contab',
      nome: 'Piso Inferior — Contabilidade',
      subtitulo: 'Sala da contabilidade · 13 estações',
      room: ROOM,
      mesas: acc.mesas,
      dividers: acc.dividers,
      salas: [],
      armarios: [],
      pistas: [
        { x: 420, y: 40, w: 90, h: ROOM.h - 80 }
      ],
      janelas: [],
      paredes: [],
      portas: [],
      escadas: [],
      zonas: [],
      cotasDetalhe: [
        { tipo: 'h', a: 545, b: 785, pos: 56, texto: '2 × 1,20 = 2,40 m' },
        { tipo: 'v', a: 90, b: 220, pos: 831, texto: '0,60 + 0,10 + 0,60' }
      ],
      grupos: [
        { nome: 'Contabilidade', mesas: ['CTB1', 'CTB2', 'CTB3', 'CTB4', 'CTB5', 'CTB6',
          'CTB7', 'CTB8', 'CTB9', 'CTB10', 'CTB11', 'CTB12', 'CTB13'] }
      ]
    };
  })();

  /* ----------------------------------------------------------------------- */
  var pisos = [superior, juridicoPatrimonial, contabilidade];

  global.PlantaDados = {
    CM: CM,
    pisos: pisos,
    piso: function (id) {
      for (var i = 0; i < pisos.length; i++) if (pisos[i].id === id) return pisos[i];
      return pisos[0];
    },
    todasMesas: function () {
      return pisos.reduce(function (a, p) { return a.concat(p.mesas); }, []);
    },
    pisoDaMesa: function (mesaId) {
      for (var i = 0; i < pisos.length; i++) {
        for (var j = 0; j < pisos[i].mesas.length; j++) {
          if (pisos[i].mesas[j].id === mesaId) return pisos[i];
        }
      }
      return null;
    },
    mesaPorId: function (mesaId) {
      for (var i = 0; i < pisos.length; i++) {
        for (var j = 0; j < pisos[i].mesas.length; j++) {
          if (pisos[i].mesas[j].id === mesaId) return pisos[i].mesas[j];
        }
      }
      return null;
    }
  };
})(window);
