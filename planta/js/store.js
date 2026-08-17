/* =========================================================================
   store.js — Estado da aplicação + persistência (localStorage)
   -------------------------------------------------------------------------
   Estrutura salva:
   {
     v: 2,
     setores: [ { id, nome, cor } ],           // editável pelo usuário
     mesas:   { "S12": { nome, setor, obs } },
     pessoas: [ { id, nome, cargo, setor, status } ],
     lotacao: { "S12": "p3" }                  // mesaId -> pessoaId
   }
   ========================================================================= */
(function (global) {
  'use strict';

  var KEY = 'diretiva.planta.pisoSuperior.v1';
  var VERSAO = 2;

  var STATUS = {
    disponivel: { id: 'disponivel', nome: 'Disponível', cor: '#2CADE2' },
    ligacao:    { id: 'ligacao',    nome: 'Em ligação', cor: '#B45309' },
    ausente:    { id: 'ausente',    nome: 'Ausente',    cor: '#94A3B8' }
  };

  /* Semente inicial — depois disso quem manda é o usuário. */
  var SETORES_PADRAO = [
    { id: 'comercial',     nome: 'Comercial',     cor: '#2CADE2' },
    { id: 'operacoes',     nome: 'Operações',     cor: '#0E4B83' },
    { id: 'rh',            nome: 'RH',            cor: '#7C3AED' },
    { id: 'financeiro',    nome: 'Financeiro',    cor: '#059669' },
    { id: 'licitacoes',    nome: 'Licitações',    cor: '#B45309' },
    { id: 'juridico',      nome: 'Jurídico',      cor: '#DB2777' },
    { id: 'patrimonial',   nome: 'Patrimonial',   cor: '#0891B2' },
    { id: 'contabilidade', nome: 'Contabilidade', cor: '#65A30D' },
    { id: 'ti',            nome: 'TI',            cor: '#6366F1' }
  ];

  var SEM_SETOR = { id: '', nome: '— sem setor —', cor: '#CADCEC' };

  var listeners = [];
  var state = null;
  var seq = 0;

  /* ----------------------------- base ------------------------------------ */
  function clonePadrao() {
    return SETORES_PADRAO.map(function (s) { return { id: s.id, nome: s.nome, cor: s.cor }; });
  }
  function vazio() {
    return { v: VERSAO, setores: clonePadrao(), mesas: {}, pessoas: [], lotacao: {} };
  }

  function normaliza(bruto) {
    var s = bruto && typeof bruto === 'object' ? bruto : {};
    var out = {
      v: VERSAO,
      setores: Array.isArray(s.setores) && s.setores.length ? s.setores : clonePadrao(),
      mesas: s.mesas && typeof s.mesas === 'object' ? s.mesas : {},
      pessoas: Array.isArray(s.pessoas) ? s.pessoas : [],
      lotacao: s.lotacao && typeof s.lotacao === 'object' ? s.lotacao : {}
    };
    /* saneia setores vindos de arquivo */
    out.setores = out.setores
      .filter(function (x) { return x && x.id; })
      .map(function (x) {
        return { id: String(x.id), nome: String(x.nome || x.id), cor: corValida(x.cor) };
      });
    if (!out.setores.length) out.setores = clonePadrao();
    return out;
  }

  function corValida(c) {
    return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : '#2CADE2';
  }

  function proximoSeq() {
    seq = 0;
    state.pessoas.forEach(function (p) {
      var n = parseInt(String(p.id).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > seq) seq = n;
    });
  }

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      state = raw ? normaliza(JSON.parse(raw)) : vazio();
    } catch (e) {
      state = vazio();
    }
    proximoSeq();
    return state;
  }

  function save() {
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* modo privado / cota — segue sem persistir */ }
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
  function pessoaDaMesa(id) { return pessoa(state.lotacao[String(id)]); }
  function mesaDaPessoa(pid) {
    for (var k in state.lotacao) if (state.lotacao[k] === pid) return k;
    return null;
  }
  function naoAlocadas() {
    return state.pessoas.filter(function (p) { return !mesaDaPessoa(p.id); });
  }

  /* ----------------------------- setores --------------------------------- */
  function setores() { return state.setores; }

  function setorInfo(id) {
    if (!id) return SEM_SETOR;
    for (var i = 0; i < state.setores.length; i++) {
      if (state.setores[i].id === id) return state.setores[i];
    }
    return SEM_SETOR;
  }

  /**
   * Cor que representa a pessoa.
   * O setor é do LUGAR, não de quem senta nele: quem está numa mesa assume a
   * cor daquela mesa. O setor próprio da pessoa só vale enquanto ela está na
   * fila, sem mesa — serve para marcar de onde ela vem.
   */
  function corDaPessoa(p) {
    if (!p) return SEM_SETOR.cor;
    var m = mesaDaPessoa(p.id);
    if (m) return setorInfo(mesa(m).setor).cor;
    return p.setor ? setorInfo(p.setor).cor : SEM_SETOR.cor;
  }

  /** Setor efetivo da pessoa: o da mesa onde ela está; se estiver na fila, o dela. */
  function setorDaPessoa(p) {
    if (!p) return SEM_SETOR;
    var m = mesaDaPessoa(p.id);
    return m ? setorInfo(mesa(m).setor) : setorInfo(p.setor);
  }

  function slug(nome) {
    var s = String(nome || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return s || 'setor';
  }

  function idLivre(base) {
    var id = base, n = 2;
    while (state.setores.some(function (s) { return s.id === id; })) { id = base + '-' + n; n++; }
    return id;
  }

  function addSetor(dados) {
    var nome = String((dados && dados.nome) || '').trim();
    if (!nome) return null;
    var s = { id: idLivre(slug(nome)), nome: nome, cor: corValida(dados && dados.cor) };
    state.setores.push(s);
    emit('setor');
    return s;
  }

  function setSetor(id, patch) {
    var s = setorInfo(id);
    if (!s.id) return;
    if (patch.nome !== undefined) s.nome = String(patch.nome);
    if (patch.cor !== undefined) s.cor = corValida(patch.cor);
    emit('setor');
  }

  /** Quantas mesas e pessoas ainda apontam para este setor. */
  function usoSetor(id) {
    var m = 0, p = 0, k;
    for (k in state.mesas) if (state.mesas[k].setor === id) m++;
    state.pessoas.forEach(function (x) { if (x.setor === id) p++; });
    return { mesas: m, pessoas: p, total: m + p };
  }

  function removeSetor(id) {
    if (!id) return;
    state.setores = state.setores.filter(function (s) { return s.id !== id; });
    for (var k in state.mesas) if (state.mesas[k].setor === id) state.mesas[k].setor = '';
    state.pessoas.forEach(function (p) { if (p.setor === id) p.setor = ''; });
    emit('setor');
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
      id: 'p' + seq, nome: 'Pessoa ' + seq, cargo: '', setor: '', status: 'disponivel'
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
    for (var k in state.lotacao) if (state.lotacao[k] === pid) delete state.lotacao[k];
    emit('pessoa');
  }

  /** Aloca pessoa numa mesa. Se a mesa já estiver ocupada, troca os dois. */
  function alocar(pid, mesaId) {
    var destino = String(mesaId);
    var origem = mesaDaPessoa(pid);
    var ocupante = state.lotacao[destino];
    if (origem === destino) return;

    if (ocupante && origem) state.lotacao[origem] = ocupante;   // troca de lugar
    else if (origem) delete state.lotacao[origem];
    else if (ocupante) delete state.lotacao[destino];           // ocupante volta para a fila

    state.lotacao[destino] = pid;
    /* nada de herdar setor: o setor é da mesa e fica onde está */
    emit('lotacao');
  }

  function desalocar(pid) {
    var m = mesaDaPessoa(pid);
    if (m) { delete state.lotacao[m]; emit('lotacao'); }
  }

  function limparMesa(mesaId) {
    if (state.lotacao[String(mesaId)]) { delete state.lotacao[String(mesaId)]; emit('lotacao'); }
  }

  function resetTudo() {
    state = vazio();
    seq = 0;
    emit('reset');
  }

  /* ----------------------------- import / export -------------------------- */
  /* Compacto de propósito: o backup viaja por WhatsApp/e-mail e é colado à mão. */
  function exportar() { return JSON.stringify(state); }

  /**
   * O backup passa por bloco de notas, e-mail e WhatsApp antes de voltar.
   * Precisa aguentar: BOM (o Bloco de Notas do Windows põe U+FEFF no começo,
   * e isso sozinho já derruba o JSON.parse), espaços em volta, e texto extra
   * colado junto — assunto de e-mail, aspas de citação e afins.
   */
  function limpaJSON(texto) {
    var t = String(texto == null ? '' : texto).replace(/^\uFEFF/, '').trim();
    var i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i >= 0 && j > i) t = t.slice(i, j + 1);
    return t;
  }

  function importar(json) {
    var t = limpaJSON(json);
    if (!t) throw new Error('Não veio nenhum texto. Cole o backup no campo ou abra o arquivo.');

    var novo;
    try {
      novo = JSON.parse(t);
    } catch (e) {
      throw new Error('O texto parece incompleto. Ele precisa começar com { e terminar ' +
        'com } — copie do começo ao fim, sem cortar nada.');
    }
    if (!novo || typeof novo !== 'object') {
      throw new Error('Esse conteúdo não é um backup da planta.');
    }
    if (novo.v !== 1 && novo.v !== VERSAO) {
      throw new Error('Backup de uma versão que não reconheço (v' + novo.v + ').');
    }
    if (!novo.mesas && !novo.pessoas) {
      throw new Error('O backup veio sem mesas nem pessoas — deve ter sido cortado.');
    }
    state = normaliza(novo);          // v1 não tinha setores: entra com a lista padrão
    proximoSeq();
    emit('import');
  }

  global.PlantaStore = {
    STATUS: STATUS,
    SEM_SETOR: SEM_SETOR,
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
    setores: setores,
    setorInfo: setorInfo,
    corDaPessoa: corDaPessoa,
    setorDaPessoa: setorDaPessoa,
    addSetor: addSetor,
    setSetor: setSetor,
    removeSetor: removeSetor,
    usoSetor: usoSetor,
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
