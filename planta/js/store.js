/* =========================================================================
   store.js — Estado da aplicação + persistência (localStorage)
   -------------------------------------------------------------------------
   Estrutura salva:
   {
     v: 1,
     mesas:   { "12": { nome: "Comercial 03", setor: "comercial", obs: "" } },
     pessoas: [ { id, nome, cargo, status, cor } ],
     lotacao: { "12": "p_3" }          // mesaId -> pessoaId
   }
   ========================================================================= */
(function (global) {
  'use strict';

  var KEY = 'diretiva.planta.pisoSuperior.v1';

  var STATUS = {
    disponivel: { id: 'disponivel', nome: 'Disponível', cor: '#2CADE2' },
    ligacao:    { id: 'ligacao',    nome: 'Em ligação', cor: '#B45309' },
    ausente:    { id: 'ausente',    nome: 'Ausente',    cor: '#94A3B8' }
  };

  var SETORES = [
    { id: '',           nome: '— sem setor —', cor: '#CADCEC' },
    { id: 'comercial',  nome: 'Comercial',     cor: '#2CADE2' },
    { id: 'operacoes',  nome: 'Operações',     cor: '#0E4B83' },
    { id: 'rh',         nome: 'RH',            cor: '#7C3AED' },
    { id: 'financeiro', nome: 'Financeiro',    cor: '#059669' },
    { id: 'licitacoes', nome: 'Licitações',    cor: '#B45309' },
    { id: 'ti',         nome: 'TI',            cor: '#DB2777' }
  ];

  var listeners = [];
  var state = null;
  var seq = 0;

  function vazio() {
    return { v: 1, mesas: {}, pessoas: [], lotacao: {} };
  }

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : vazio();
    } catch (e) {
      state = vazio();
    }
    if (!state || state.v !== 1) state = vazio();
    state.mesas = state.mesas || {};
    state.pessoas = state.pessoas || [];
    state.lotacao = state.lotacao || {};
    state.pessoas.forEach(function (p) {
      var n = parseInt(String(p.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > seq) seq = n;
    });
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) { /* modo privado / cota — segue sem persistir */ }
  }

  function emit(motivo) {
    save();
    listeners.forEach(function (fn) { fn(state, motivo); });
  }

  /* ----------------------------- consultas ------------------------------- */
  function mesa(id) {
    return state.mesas[String(id)] || { nome: '', setor: '', obs: '' };
  }
  function rotuloPadrao(id) {
    var d = global.PlantaDados && global.PlantaDados.mesaPorId(id);
    return d ? d.rotulo + ' ' + d.num : 'Mesa ' + id;
  }
  function nomeMesa(id) {
    var m = mesa(id);
    return m.nome && m.nome.trim() ? m.nome.trim() : rotuloPadrao(id);
  }
  function pessoa(pid) {
    if (!pid) return null;
    for (var i = 0; i < state.pessoas.length; i++) {
      if (state.pessoas[i].id === pid) return state.pessoas[i];
    }
    return null;
  }
  function pessoaDaMesa(id) {
    return pessoa(state.lotacao[String(id)]);
  }
  function mesaDaPessoa(pid) {
    for (var k in state.lotacao) {
      if (state.lotacao[k] === pid) return k;
    }
    return null;
  }
  function naoAlocadas() {
    return state.pessoas.filter(function (p) { return !mesaDaPessoa(p.id); });
  }
  function setorInfo(id) {
    for (var i = 0; i < SETORES.length; i++) {
      if (SETORES[i].id === (id || '')) return SETORES[i];
    }
    return SETORES[0];
  }

  /* ----------------------------- mutações -------------------------------- */
  function setMesa(id, patch) {
    var atual = state.mesas[String(id)] || { nome: '', setor: '', obs: '' };
    state.mesas[String(id)] = Object.assign(atual, patch);
    emit('mesa');
  }

  function addPessoa(dados) {
    seq += 1;
    var p = Object.assign({
      id: 'p' + seq,
      nome: 'Pessoa ' + seq,
      cargo: '',
      status: 'disponivel'
    }, dados || {});
    state.pessoas.push(p);
    emit('pessoa');
    return p;
  }

  function setPessoa(pid, patch) {
    var p = pessoa(pid);
    if (!p) return;
    Object.assign(p, patch);
    emit('pessoa');
  }

  function removePessoa(pid) {
    state.pessoas = state.pessoas.filter(function (p) { return p.id !== pid; });
    for (var k in state.lotacao) {
      if (state.lotacao[k] === pid) delete state.lotacao[k];
    }
    emit('pessoa');
  }

  /** Aloca pessoa numa mesa. Se a mesa já estiver ocupada, troca os dois. */
  function alocar(pid, mesaId) {
    var destino = String(mesaId);
    var origem = mesaDaPessoa(pid);
    var ocupante = state.lotacao[destino];

    if (origem === destino) return;

    if (ocupante && origem) {
      state.lotacao[origem] = ocupante;   // troca de lugar
    } else if (origem) {
      delete state.lotacao[origem];
    } else if (ocupante) {
      delete state.lotacao[destino];      // ocupante volta para a lista
    }
    state.lotacao[destino] = pid;
    emit('lotacao');
  }

  function desalocar(pid) {
    var m = mesaDaPessoa(pid);
    if (m) { delete state.lotacao[m]; emit('lotacao'); }
  }

  function limparMesa(mesaId) {
    if (state.lotacao[String(mesaId)]) {
      delete state.lotacao[String(mesaId)];
      emit('lotacao');
    }
  }

  function resetTudo() {
    state = vazio();
    seq = 0;
    emit('reset');
  }

  /* ----------------------------- import / export -------------------------- */
  function exportar() {
    return JSON.stringify(state, null, 2);
  }
  function importar(json) {
    var novo = JSON.parse(json);
    if (!novo || novo.v !== 1) throw new Error('Arquivo em formato não reconhecido.');
    state = {
      v: 1,
      mesas: novo.mesas || {},
      pessoas: novo.pessoas || [],
      lotacao: novo.lotacao || {}
    };
    seq = 0;
    state.pessoas.forEach(function (p) {
      var n = parseInt(String(p.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > seq) seq = n;
    });
    emit('import');
  }

  global.PlantaStore = {
    STATUS: STATUS,
    SETORES: SETORES,
    load: load,
    get state() { return state; },
    onChange: function (fn) { listeners.push(fn); },
    mesa: mesa,
    nomeMesa: nomeMesa,
    rotuloPadrao: rotuloPadrao,
    pessoa: pessoa,
    pessoaDaMesa: pessoaDaMesa,
    mesaDaPessoa: mesaDaPessoa,
    naoAlocadas: naoAlocadas,
    setorInfo: setorInfo,
    setMesa: setMesa,
    addPessoa: addPessoa,
    setPessoa: setPessoa,
    removePessoa: removePessoa,
    alocar: alocar,
    desalocar: desalocar,
    limparMesa: limparMesa,
    resetTudo: resetTudo,
    exportar: exportar,
    importar: importar
  };
})(window);
