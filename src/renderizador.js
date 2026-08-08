/**
 * Módulo agregador da camada de renderização do jogo.
 *
 * A renderização é dividida em módulos de tela, carregados antes deste
 * arquivo no index.html:
 *   - renderizador-nucleo.js: constantes, referências de elementos e
 *     utilitários compartilhados (escape de HTML, progresso, confete, toast);
 *   - renderizador-quiz.js: motor comum de questões (alternativas, dicas,
 *     resposta, feedback e navegação);
 *   - renderizador-home.js: tela inicial, abas de modo, conquistas,
 *     serviços e "sobre o autor";
 *   - renderizador-fases.js: lista/filtros de fases e partida de fase;
 *   - renderizador-pet.js: modo Salvar o Pet;
 *   - renderizador-sobrevivencia.js: modo Sobrevivência;
 *   - renderizador-simulado.js: modo Simulado cronometrado;
 *   - renderizador-leitner.js: visão geral e revisão Leitner.
 *
 * No navegador, as declarações de topo dos módulos de tela viram globais
 * (scripts clássicos), resolvidas aqui pelo nome. No Node (testes), os
 * módulos são carregados via require e registrados no globalThis,
 * reproduzindo o mesmo contrato. Este arquivo só agrega e exporta a API
 * pública (RENDERIZADOR) usada por app.js e teclado.js.
 *
 * Dependências globais (carregadas antes via <script>):
 *   window.JogoCore, window.PERSISTENCIA, window.AUDIO, window.ACESSIBILIDADE,
 *   window.AWS_BANK, window.App
 */

/* global escaparHtml, salvarProgresso, intro, setModo, renderModoContent,
   renderFasesList,
   onSearchInput, setCategoryFilter, setDomainFilter, updateFaseGrid,
   renderPetSelector, selectPet, startPetMode, mostraPetPergunta,
   renderSurvivalIntro, startSurvivalMode, mostraSurvivalPergunta,
   renderSimuladoIntro, startSimuladoMode, mostraSimuladoPergunta,
   resumoSimulado, renderGraficoSimulados, compartilharSimulado,
   atualizarModoSimulado, renderLeitnerOverview, renderServicos,
   renderConquistas, renderOptionsAndHints, startFase, mostra, revelarDica,
   responde, desabilitarOpcoes, processarPontuacao, atualizarModoPet,
   atualizarModoSurvival, renderizarFeedback, ehUltimaQuestao,
   criarBotaoProximo, resumo, resumoPet, resumoSurvival, revisar0,
   mostraCartao, revelaResp, avalia, resumoRevisao, sobre, showHome,
   setProgress, BANK, PETS, QINDEX */

if (typeof module !== "undefined" && module.exports && typeof require === "function") {
  // Espelha no globalThis o contrato do navegador (funções e constantes de
  // topo dos módulos de tela acessíveis pelo nome), para que as referências
  // cruzadas entre módulos funcionem também nos testes.
  Object.assign(
    globalThis,
    require("./renderizador-nucleo.js"),
    require("./renderizador-quiz.js"),
    require("./renderizador-home.js"),
    require("./renderizador-fases.js"),
    require("./renderizador-pet.js"),
    require("./renderizador-sobrevivencia.js"),
    require("./renderizador-simulado.js"),
    require("./renderizador-leitner.js")
  );
}

// ---------- EXPORTAÇÃO UMD ----------
// Objeto único compartilhado por Node.js e navegador; os dois blocos abaixo
// são independentes de propósito (testes podem definir window e module juntos).
const RENDERIZADOR = {
  escaparHtml,
  salvarProgresso,
  intro,
  setModo,
  renderModoContent,
  renderFasesList,
  onSearchInput,
  setCategoryFilter,
  setDomainFilter,
  updateFaseGrid,
  renderPetSelector,
  selectPet,
  startPetMode,
  mostraPetPergunta,
  renderSurvivalIntro,
  startSurvivalMode,
  mostraSurvivalPergunta,
  renderSimuladoIntro,
  startSimuladoMode,
  mostraSimuladoPergunta,
  resumoSimulado,
  renderGraficoSimulados,
  compartilharSimulado,
  atualizarModoSimulado,
  renderLeitnerOverview,
  renderServicos,
  renderConquistas,
  renderOptionsAndHints,
  startFase,
  mostra,
  revelarDica,
  responde,
  desabilitarOpcoes,
  processarPontuacao,
  atualizarModoPet,
  atualizarModoSurvival,
  renderizarFeedback,
  ehUltimaQuestao,
  criarBotaoProximo,
  resumo,
  resumoPet,
  resumoSurvival,
  revisar0,
  mostraCartao,
  revelaResp,
  avalia,
  resumoRevisao,
  sobre,
  showHome,
  setProgress,
  BANK,
  PETS,
  QINDEX
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RENDERIZADOR;
}
if (typeof window !== "undefined") {
  window.RENDERIZADOR = RENDERIZADOR;
}
