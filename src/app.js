/**
 * Módulo orquestrador do jogo.
 *
 * Inicializa o estado da sessão, conecta os módulos (Persistência, Áudio,
 * Acessibilidade, Renderizador e Teclado) via event delegation e injeção
 * de dependências, e dispara a tela inicial.
 *
 * Contém toda a lógica de "cola" entre camadas:
 *  - Event delegation para atributos data-action (zero onclick inline).
 *  - Injeção de dependências no módulo de teclado.
 *  - wiring dos handlers de preferências (tema, fonte, áudio).
 */

(function () {
  var store = PERSISTENCIA.carregar();
  var R = RENDERIZADOR;

  window.App = {
    store: store,
    modoJogo: 'fases',
    modoRevisao: null,
    fase: null,
    q: [],
    i: 0,
    xp: 0,
    streak: 0,
    acertos: 0,
    revisar: [],
    respondida: false,
    hintsShown: 0,
    petSelecionado: R.PETS[0],
    petEstado: JogoCore.criarEstadoPet(R.PETS[0], 20, 3),
    survivalEstado: JogoCore.criarEstadoSobrevivencia(3),
    searchFilter: "",
    categoryFilter: "todas",
    iniciado: false,
    focoOrigem: null
  };

  // ---------- EVENT DELEGATION (data-action) ----------
  document.body.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;

    var action = target.dataset.action;

    switch (action) {
      case 'intro':        R.intro(); break;
      case 'sobre':        R.sobre(); break;
      case 'set-modo':     R.setModo(target.dataset.modo); break;
      case 'start-fase':   R.startFase(parseInt(target.dataset.idx, 10)); break;
      case 'select-pet':   R.selectPet(target.dataset.pet); break;
      case 'start-pet':    R.startPetMode(); break;
      case 'start-survival': R.startSurvivalMode(); break;
      case 'revisar0':     R.revisar0(); break;
      case 'revela-resp':  R.revelaResp(); break;
      case 'set-category': R.setCategoryFilter(target.dataset.category); break;
      case 'avalia':       R.avalia(target.dataset.acertou === 'true'); break;
      case 'theme':        ACESSIBILIDADE.toggleTheme(store, PERSISTENCIA.salvar); break;
      case 'font-minus':   ACESSIBILIDADE.changeFontScale(store, -1, PERSISTENCIA.salvar); break;
      case 'font-plus':    ACESSIBILIDADE.changeFontScale(store, 1, PERSISTENCIA.salvar); break;
      case 'audio':        AUDIO.toggleAudio(store, PERSISTENCIA.salvar); break;
    }
  });

  // ---------- INJEÇÃO DE DEPENDÊNCIAS NO TECLADO ----------
  TECLADO.instalarAtalhosTeclado({
    intro: R.intro,
    avalia: R.avalia,
    revelarDica: R.revelarDica,
    getModoRevisao: function () { return App.modoRevisao; },
    getOpcoesDesabilitadas: function () { return document.querySelectorAll('#opts .opt'); },
    getDicaBtn: function () { return document.getElementById('dicaBtn'); },
    getMostrarBtn: function () { return document.getElementById('mostrarBtn'); },
    getCtaBtn: function () { return document.querySelector('#fb .cta, #app .cta'); }
  });

  // ---------- INICIALIZAÇÃO ----------
  ACESSIBILIDADE.applyTheme(store);
  ACESSIBILIDADE.applyFontScale(store);
  AUDIO.aplicarEstadoAudio(store);

  R.intro();
  // A partir do primeiro render, toda mudança de tela gerencia o foco e
  // os anúncios (no carregamento inicial o foco permanece no documento).
  App.iniciado = true;
})();
