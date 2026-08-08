/**
 * Telas do modo Sobrevivência da camada de renderização.
 *
 * Contém a introdução do modo, a tela de questão com o contador de vidas,
 * a atualização do estado após cada resposta e o resumo de fim de rodada.
 */

/* global BANK, app, escaparHtml, setProgress, showHome, renderOptionsAndHints */

/**
 * Renderiza a tela introdutória do modo Sobrevivência.
 * @param {HTMLElement} container - Container DOM.
 */
function renderSurvivalIntro(container) {
  container.innerHTML = `
    <h2 class="sr-only">Modo sobrevivência</h2>
    <div class="situacao"><span aria-hidden="true">📌</span> <b>Modo Sobrevivência</b>: O teste definitivo! Responda o máximo de questões que conseguir. Você tem <b>3 vidas (<span aria-hidden="true">❤️❤️❤️</span><span class="sr-only">três vidas</span>)</b>. A rodada termina quando perder todas as vidas.</div>
    <button class="cta" data-action="start-survival">Iniciar Sobrevivência <span aria-hidden="true">⚡</span> →</button>`;
}

/**
 * Inicia o modo Sobrevivência, criando o estado via domínio e embaralhando questões.
 */
function startSurvivalMode() {
  App.modoJogo = "survival";
  App.focoOrigem = '[data-action="start-survival"]';
  App.survivalEstado = JogoCore.criarEstadoSobrevivencia(3);
  let allQs = [];
  BANK.fases.forEach((f) => (allQs = allQs.concat(f.questions)));
  App.q = JogoCore.embaralharArray(allQs.slice());
  App.i = 0;
  App.xp = 0;
  App.streak = 0;
  App.acertos = 0;
  App.respondida = false;
  mostraSurvivalPergunta();
}

/**
 * Renderiza a tela de pergunta no modo Sobrevivência.
 * Move o foco para a pergunta e anuncia a posição da questão.
 */
function mostraSurvivalPergunta() {
  if (App.i >= App.q.length) {
    App.survivalEstado = { ...App.survivalEstado, status: "completo" };
    resumoSurvival();
    return;
  }
  App.respondida = false;
  App.hintsShown = 0;
  showHome(true);
  const d = App.q[App.i];
  app.className = "card pop";
  const vidasRestantes = App.survivalEstado.maxErros - App.survivalEstado.erros;
  const vidas = "❤️".repeat(vidasRestantes) + "🖤".repeat(App.survivalEstado.erros);

  app.innerHTML = `
    <span class="badge desafio"><span aria-hidden="true">${vidas}</span><span class="sr-only">${vidasRestantes} de ${App.survivalEstado.maxErros} vidas restantes</span></span>
    <span class="who"><span aria-hidden="true">⚡</span> Sobrevivência · Questão ${App.i + 1}</span>
    ${d.situacao ? `<div class="situacao"><span aria-hidden="true">📌</span> ${escaparHtml(d.situacao)}</div>` : ""}
    <h1 class="perg">${escaparHtml(d.stem)}</h1>
    <div id="dicaArea"></div>
    <div class="opts" id="opts" role="group" aria-label="Alternativas de resposta"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.i, App.q.length);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce("Questão " + (App.i + 1) + ". Vidas restantes: " + vidasRestantes + ".");
}

/**
 * Atualiza o estado específico do modo Sobrevivência.
 * @param {boolean} certo - Se a resposta está correta.
 * @returns {string} Sufixo da mensagem para o leitor de tela.
 */
function atualizarModoSurvival(certo) {
  App.survivalEstado = JogoCore.processarRespostaSobrevivencia(App.survivalEstado, certo);
  if (!certo) {
    const vidasRestantes = App.survivalEstado.maxErros - App.survivalEstado.erros;
    return " Vidas restantes: " + vidasRestantes + ".";
  }
  return "";
}

/**
 * Renderiza o resumo do modo Sobrevivência (fim de rodada).
 */
function resumoSurvival() {
  const completo = App.survivalEstado.status === "completo";
  if (completo) AUDIO.playSound("fanfare", App.store);
  else AUDIO.playSound("no", App.store);
  app.className = "card pop";
  app.innerHTML = `
    <span class="who"><span aria-hidden="true">⚡</span> Fim da Sobrevivência</span>
    <h1>${completo ? "Você zerou o banco! 🎉" : "Rodada Finalizada!"}</h1>
    <div class="stat">
      <div><b>${App.survivalEstado.totalAcertos}</b><span>acertos</span></div>
      <div><b>${App.survivalEstado.melhorSequencia}</b><span>melhor sequência</span></div>
      <div><b>${App.survivalEstado.erros}/${App.survivalEstado.maxErros}</b><span>erros (vidas)</span></div>
    </div>
    <p class="lead">${completo ? "Respondeu todas as questões disponíveis sem perder todas as vidas. Excelente resiliência!" : "Você perdeu suas 3 vidas. Cada erro é uma excelente oportunidade para aprender e fixar!"}</p>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Rodada finalizada: " +
      App.survivalEstado.totalAcertos +
      " acertos, melhor sequência de " +
      App.survivalEstado.melhorSequencia +
      "."
  );
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorSobrevivencia = {
  renderSurvivalIntro,
  startSurvivalMode,
  mostraSurvivalPergunta,
  atualizarModoSurvival,
  resumoSurvival
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorSobrevivencia;
} else if (typeof window !== "undefined") {
  window.RenderizadorSobrevivencia = RenderizadorSobrevivencia;
}
