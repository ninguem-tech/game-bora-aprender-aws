/**
 * Tela inicial e orquestração de modos da camada de renderização.
 *
 * Contém o dashboard de abertura (prontidão, estatísticas e abas de modo),
 * a troca de abas, o despacho do conteúdo de cada modo e as telas
 * "Conquistas", "Serviços" e "Sobre o autor".
 */

/* global pararTimerSimulado, app, devidos, escaparHtml, setProgress, showHome,
   BANK, renderFasesList, renderPetSelector, renderSurvivalIntro,
   renderSimuladoIntro, renderLeitnerOverview */

/**
 * Renderiza a tela inicial do jogo com dashboard, abas de modo e estatísticas.
 * @param {boolean} [silencioso] - Quando true, não anuncia a tela ao leitor
 *   de tela (usado por setModo, onde a troca de aba já dá o contexto).
 */
function intro(silencioso) {
  pararTimerSimulado();
  app.className = "card pop";
  App.modoRevisao = null;
  showHome(false);
  const due = devidos().length;
  const totalResponded = App.store.stats.totalAnswered || 0;
  const accuracy =
    totalResponded > 0
      ? Math.round(((App.store.stats.totalCorrect || 0) / totalResponded) * 100)
      : 0;
  const streak = App.store.streakDays || 0;
  const hoje = PERSISTENCIA.dataHojeIso();
  const logHoje = App.store.studyLogs && App.store.studyLogs[hoje];
  const hojeQuestoes = logHoje ? logHoje.questionsAnswered || 0 : 0;
  const readiness = JogoCore.calcularReadiness(App.store, BANK.fases.length);
  const rLabel = JogoCore.classificarReadiness(readiness);
  const prontidaoConfiavel = JogoCore.prontidaoEhConfiavel(totalResponded);
  const readinessAriaLabel = prontidaoConfiavel
    ? `Prontidão para o exame: ${readiness}% — ${escaparHtml(rLabel.label)}`
    : "Prontidão para o exame: continue respondendo pra desbloquear";

  app.innerHTML = `
    <span class="who rafael">Rafael · mentor</span>
    <h1>Bora começar do zero?</h1>
    <p class="lead">Você é a <b>Júlia</b>. Aqui aprendemos a AWS resolvendo problemas reais, sem empáfia e com muito acolhimento. <span aria-hidden="true">☕</span></p>

    <div class="readiness" role="img" aria-label="${readinessAriaLabel}">
      <div class="readinessLabel">Prontidão para o exame</div>
      <div class="readinessTrack" aria-hidden="true">
        <div class="readinessFill" id="readinessFill"></div>
      </div>
      <div class="readinessValue" aria-hidden="true">${
        prontidaoConfiavel
          ? `<b>${readiness}%</b> — ${rLabel.label}`
          : "Continue respondendo pra desbloquear sua prontidão"
      }</div>
    </div>

    <div class="dashGrid">
      <div class="dashItem"><b>${totalResponded}</b><span>questões salvas</span></div>
      <div class="dashItem"><b>${accuracy}%</b><span>taxa de acerto</span></div>
      <div class="dashItem"><b>${due}</b><span>no Leitner <span aria-hidden="true">📒</span></span></div>
      <div class="dashItem"><b>${streak}</b><span>dias seguidos <span aria-hidden="true">🔥</span></span></div>
      <div class="dashItem"><b>${hojeQuestoes}</b><span>hoje</span></div>
    </div>

    <div class="modeTabs" role="group" aria-label="Modos de jogo">
      <button class="tabBtn ${App.modoJogo === "fases" ? "active" : ""}" ${App.modoJogo === "fases" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="fases"><span aria-hidden="true">📚</span> Fases (${BANK.fases.length})</button>
      <button class="tabBtn ${App.modoJogo === "pet" ? "active" : ""}" ${App.modoJogo === "pet" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="pet"><span aria-hidden="true">🐱</span> Salvar o Pet</button>
      <button class="tabBtn ${App.modoJogo === "survival" ? "active" : ""}" ${App.modoJogo === "survival" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="survival"><span aria-hidden="true">⚡</span> Sobrevivência</button>
      <button class="tabBtn ${App.modoJogo === "simulado" ? "active" : ""}" ${App.modoJogo === "simulado" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="simulado"><span aria-hidden="true">📝</span> Simulado</button>
      <button class="tabBtn ${App.modoJogo === "leitner" ? "active" : ""}" ${App.modoJogo === "leitner" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="leitner"><span aria-hidden="true">📒</span> Leitner (${due})</button>
      <button class="tabBtn ${App.modoJogo === "servicos" ? "active" : ""}" ${App.modoJogo === "servicos" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="servicos"><span aria-hidden="true">☁️</span> Serviços</button>
      <button class="tabBtn ${App.modoJogo === "conquistas" ? "active" : ""}" ${App.modoJogo === "conquistas" ? 'aria-current="true"' : ""} data-action="set-modo" data-modo="conquistas"><span aria-hidden="true">🏅</span> Conquistas</button>
    </div>

    <div id="modoContent"></div>

    <button class="cta ghost introSobreBtn" data-action="sobre">Quem é 人間/人间 (nin-guem)?</button>`;

  // Preenchimento da prontidão via CSSOM (element.style): a CSP proíbe
  // style="" inline em HTML, mas a manipulação de estilo por JS é permitida.
  const preenchimentoProntidao = document.getElementById("readinessFill");
  if (preenchimentoProntidao) {
    preenchimentoProntidao.style.width = (prontidaoConfiavel ? readiness : 8) + "%";
    preenchimentoProntidao.style.background = prontidaoConfiavel ? rLabel.cor : "var(--dourado)";
  }

  renderModoContent();
  setProgress(0, 1);

  if (App.iniciado) {
    const origem = App.focoOrigem;
    App.focoOrigem = null;
    const alvoOrigem = origem ? document.querySelector(origem) : null;
    if (alvoOrigem && !alvoOrigem.disabled) ACESSIBILIDADE.focarElemento(alvoOrigem);
    else ACESSIBILIDADE.focarTitulo(app);
    if (!silencioso) ACESSIBILIDADE.announce("Tela inicial.");
  }
}

/**
 * Define o modo de jogo ativo e re-renderiza a tela inicial.
 * Mantém o foco na aba ativada (padrão WAI-ARIA APG para abas).
 * @param {string} m - Identificador do modo ('fases', 'pet', 'survival', 'leitner').
 */
function setModo(m) {
  App.modoJogo = m;
  App.focoOrigem = null;
  intro(true);
  const abaAtiva = document.querySelector(".tabBtn.active");
  if (abaAtiva) ACESSIBILIDADE.focarElemento(abaAtiva);
}

/**
 * Renderiza o conteúdo da aba de modo ativa (fases, pet, survival ou leitner).
 */
function renderModoContent() {
  const container = document.getElementById("modoContent");
  if (!container) return;

  if (App.modoJogo === "fases") {
    renderFasesList(container);
  } else if (App.modoJogo === "pet") {
    renderPetSelector(container);
  } else if (App.modoJogo === "survival") {
    renderSurvivalIntro(container);
  } else if (App.modoJogo === "simulado") {
    renderSimuladoIntro(container);
  } else if (App.modoJogo === "servicos") {
    renderServicos(container);
  } else if (App.modoJogo === "leitner") {
    renderLeitnerOverview(container);
  } else if (App.modoJogo === "conquistas") {
    renderConquistas(container);
  }
}

/**
 * Renderiza a aba de conquistas/desbloqueios do jogador.
 * @param {HTMLElement} container - Container DOM.
 */
function renderConquistas(container) {
  const { desbloqueadas, pendentes } = JogoCore.calcularConquistas(App.store);
  const total = desbloqueadas.length + pendentes.length;

  const badgeHtml = (c, ativo) => `
    <li class="badgeItem ${ativo ? "" : "locked"}" aria-label="${ativo ? "Conquista desbloqueada" : "Conquista bloqueada"}: ${escaparHtml(c.label)}">
      <span class="badgeEmoji" aria-hidden="true">${c.emoji}</span>
      <span class="badgeLabel">${escaparHtml(c.label)}</span>
    </li>`;

  container.innerHTML = `
    <h2 class="sr-only">Conquistas</h2>
    <p class="lead">Você desbloqueou <b>${desbloqueadas.length}</b> de <b>${total}</b> conquistas. Mantenha o ritmo!</p>
    <h3>Desbloqueadas</h3>
    <ul class="badgeGrid" aria-live="polite">
      ${desbloqueadas.map((c) => badgeHtml(c, true)).join("") || '<li class="dica">Nenhuma conquista ainda. Responda uma questão para começar!</li>'}
    </ul>
    <h3 class="conquistasPendentes">Pendentes</h3>
    <ul class="badgeGrid">
      ${pendentes.map((c) => badgeHtml(c, false)).join("")}
    </ul>`;
}

/**
 * Renderiza a lista de serviços AWS citados no banco, com contagem de ocorrências.
 * @param {HTMLElement} container - Container DOM.
 */
function renderServicos(container) {
  const servicos = JogoCore.obterEstatisticasServicos(BANK.fases);

  container.innerHTML = `
    <h2 class="sr-only">Guia de serviços AWS</h2>
    <div class="situacao"><span aria-hidden="true">☁️</span> <b>Serviços citados</b> no banco de questões. Aparecem em ordem de frequência, então os mais cobrados no SAA-C03 vêm primeiro.</div>
    <div class="searchWrap"><input class="searchInput" id="searchServicos" type="search" placeholder="Filtrar serviço..." aria-label="Filtrar serviços"></div>
    <ul class="servList" id="servList">
      ${servicos
        .map(
          (s) => `
        <li class="servItem" data-nome="${escaparHtml(s.nome)}">
          <span class="servName">${escaparHtml(s.nome)}</span>
          <span class="servCount">${s.total}</span>
          <span class="servFases">${escaparHtml(s.fases.slice(0, 2).join(" · "))}</span>
        </li>`
        )
        .join("")}
    </ul>`;

  const input = document.getElementById("searchServicos");
  if (input) {
    input.addEventListener("input", function () {
      const termo = input.value.trim().toLowerCase();
      document.querySelectorAll(".servItem").forEach(function (li) {
        const nome = li.dataset.nome.toLowerCase();
        li.style.display = nome.includes(termo) ? "" : "none";
      });
    });
  }
}

/**
 * Renderiza a tela "Sobre o autor".
 */
function sobre() {
  app.className = "card pop";
  showHome(true);
  App.focoOrigem = '[data-action="sobre"]';
  app.innerHTML = `
    <span class="who">人間 / 人间 · nin-guem</span>
    <h1>Sobre o nin-guem</h1>
    <p class="lead">Este é o pseudônimo que uso para escrever os meus livros e aplicativos. É um jogo de palavras.</p>
    <p><b>人間</b> (japonês / chinês tradicional) e <b>人间</b> (chinês simplificado) significam <b>"ser humano"</b> ou <b>"humanidade"</b>.</p>
    <p>Escolhi esse nome porque o foco aqui não sou eu — é o conhecimento compartilhado.</p>
    <p>A pronúncia lembra <b>"ninguém"</b> em português. E é exatamente essa a ideia.</p>
    <p>Se um dia perguntarem com quem você aprendeu AWS, espero que possa responder:</p>
    <div class="resp">
      <span class="ok">"Aprendi com nin-guem."</span>
      <div class="sobreComentario">Porque o conhecimento agora é seu. Se você responder assim, minha missão está completa.</div>
    </div>
    <button class="cta" data-action="intro">Bora estudar → [Esc]</button>`;
  setProgress(0, 1);
  ACESSIBILIDADE.focarTitulo(app);
  if (App.iniciado) ACESSIBILIDADE.announce("Sobre o autor.");
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorHome = {
  intro,
  setModo,
  renderModoContent,
  renderConquistas,
  renderServicos,
  sobre
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorHome;
} else if (typeof window !== "undefined") {
  window.RenderizadorHome = RenderizadorHome;
}
