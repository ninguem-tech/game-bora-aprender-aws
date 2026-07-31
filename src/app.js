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
 *  - PWA: status online/offline, prompt de instalação e backup/exportação.
 */

(function () {
  var store = PERSISTENCIA.carregar();
  var R = RENDERIZADOR;

  window.App = {
    store: store,
    modoJogo: "fases",
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

  // ---------- PWA: STATUS ONLINE/OFFLINE ----------
  var netBadge = document.getElementById("netBadge");

  function atualizarBadgeRede() {
    if (!netBadge) return;
    if (navigator.onLine) {
      netBadge.textContent = "● online";
      netBadge.classList.remove("offline");
    } else {
      netBadge.textContent = "● offline";
      netBadge.classList.add("offline");
    }
  }

  window.addEventListener("online", atualizarBadgeRede);
  window.addEventListener("offline", atualizarBadgeRede);
  atualizarBadgeRede();

  // ---------- PWA: PROMPT DE INSTALAÇÃO ----------
  var installBtn = document.getElementById("btnInstall");
  var deferredInstallPrompt = null;

  if (installBtn) {
    installBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function () {
        deferredInstallPrompt = null;
        installBtn.hidden = true;
      });
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  // ---------- PWA: BACKUP E RESTAURAÇÃO ----------
  function criarBackupDialog() {
    var overlay = document.createElement("div");
    overlay.className = "backupDialog";
    overlay.id = "backupDialog";
    overlay.innerHTML =
      "" +
      '<div class="card" role="dialog" aria-modal="true" aria-labelledby="backupTitulo">' +
      '  <h1 id="backupTitulo">Backup e restauração</h1>' +
      '  <p class="lead">Todos os dados ficam no seu navegador. Exporte para guardar, ou cole um backup anterior para restaurar.</p>' +
      '  <div class="row2">' +
      '    <button class="cta" data-action="exportar-backup">📥 Exportar JSON</button>' +
      '    <button class="cta ghost" data-action="restaurar-backup">📤 Restaurar do JSON abaixo</button>' +
      "  </div>" +
      '  <label for="backupArea" style="display:block;margin-top:12px;font-size:.85rem;font-weight:700">Área de backup (cole um JSON exportado):</label>' +
      '  <textarea id="backupArea" aria-label="Área de backup JSON"></textarea>' +
      '  <button class="cta ghost" style="margin-top:12px" data-action="fechar-backup">Fechar</button>' +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  // ---------- EVENT DELEGATION (data-action) ----------
  document.body.addEventListener("click", function (e) {
    var target = e.target.closest("[data-action]");
    if (!target) return;

    var action = target.dataset.action;

    switch (action) {
      case "intro":
        R.intro();
        break;
      case "sobre":
        R.sobre();
        break;
      case "set-modo":
        R.setModo(target.dataset.modo);
        break;
      case "start-fase":
        R.startFase(parseInt(target.dataset.idx, 10));
        break;
      case "select-pet":
        R.selectPet(target.dataset.pet);
        break;
      case "start-pet":
        R.startPetMode();
        break;
      case "start-survival":
        R.startSurvivalMode();
        break;
      case "start-simulado":
        R.startSimuladoMode();
        break;
      case "revisar0":
        R.revisar0();
        break;
      case "revela-resp":
        R.revelaResp();
        break;
      case "set-category":
        R.setCategoryFilter(target.dataset.category);
        break;
      case "avalia":
        R.avalia(target.dataset.acertou === "true");
        break;
      case "theme":
        ACESSIBILIDADE.toggleTheme(store, PERSISTENCIA.salvar);
        break;
      case "font-minus":
        ACESSIBILIDADE.changeFontScale(store, -1, PERSISTENCIA.salvar);
        break;
      case "font-plus":
        ACESSIBILIDADE.changeFontScale(store, 1, PERSISTENCIA.salvar);
        break;
      case "audio":
        AUDIO.toggleAudio(store, PERSISTENCIA.salvar);
        break;
      case "backup": {
        var dialog = document.getElementById("backupDialog") || criarBackupDialog();
        dialog.hidden = false;
        var ta = dialog.querySelector("textarea");
        if (ta) ta.value = "";
        ACESSIBILIDADE.focarTitulo(dialog.querySelector(".card"));
        break;
      }
      case "fechar-backup": {
        var d = document.getElementById("backupDialog");
        if (d) d.hidden = true;
        break;
      }
      case "exportar-backup":
        PERSISTENCIA.exportarProgressoJSON(store);
        break;
      case "restaurar-backup": {
        var d2 = document.getElementById("backupDialog");
        var area = d2 ? d2.querySelector("textarea") : null;
        if (!area || !area.value.trim()) {
          ACESSIBILIDADE.announce("Cole um JSON válido na área de backup.");
          break;
        }
        var importado = PERSISTENCIA.importarProgressoJSON(area.value.trim());
        if (importado) {
          App.store = store = importado;
          ACESSIBILIDADE.applyTheme(store);
          ACESSIBILIDADE.applyFontScale(store);
          AUDIO.aplicarEstadoAudio(store);
          R.intro();
          if (d2) d2.hidden = true;
          ACESSIBILIDADE.announce("Backup restaurado com sucesso.");
        } else {
          ACESSIBILIDADE.announce("O conteúdo colado não é um backup válido.");
        }
        break;
      }
    }
  });

  // ---------- INJEÇÃO DE DEPENDÊNCIAS NO TECLADO ----------
  TECLADO.instalarAtalhosTeclado({
    intro: R.intro,
    avalia: R.avalia,
    revelarDica: R.revelarDica,
    getModoRevisao: function () {
      return App.modoRevisao;
    },
    getOpcoesDesabilitadas: function () {
      return document.querySelectorAll("#opts .opt");
    },
    getDicaBtn: function () {
      return document.getElementById("dicaBtn");
    },
    getMostrarBtn: function () {
      return document.getElementById("mostrarBtn");
    },
    getCtaBtn: function () {
      return document.querySelector("#fb .cta, #app .cta");
    }
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
