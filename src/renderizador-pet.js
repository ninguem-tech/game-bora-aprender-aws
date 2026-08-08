/**
 * Telas do modo Salvar o Pet da camada de renderização.
 *
 * Contém o seletor de pet, a tela de questão com o medidor de acertos/erros,
 * a atualização do avatar durante a partida e o resumo de vitória/derrota.
 */

/* global BANK, PETS, app, escaparHtml, setProgress, showHome,
   comemorarConquista, renderOptionsAndHints, salvarProgresso */

/**
 * Renderiza o seletor de pet e o botão de início da missão.
 * @param {HTMLElement} container - Container DOM.
 */
function renderPetSelector(container) {
  container.innerHTML = `
    <h2 class="sr-only">Escolha do pet</h2>
    <div class="situacao"><span aria-hidden="true">📌</span> <b>Missão Salvar o Pet</b>: Escolha seu companheiro de estudo. Acerte <b>20 questões</b> do banco para resgatá-lo! Errar 3 vezes faz o pet fugir.</div>
    <p class="conceito">Escolha o seu companheiro:</p>
    <div class="petGrid" role="group" aria-label="Escolha do pet">
      ${PETS.map(
        (p) => `
        <button class="petCard ${App.petSelecionado.id === p.id ? "selected" : ""}" aria-pressed="${App.petSelecionado.id === p.id}" data-action="select-pet" data-pet="${p.id}">
          <span class="emoji" aria-hidden="true">${p.emoji}</span>
          <span class="pname">${p.name}</span>
        </button>
      `
      ).join("")}
    </div>
    <button class="cta" data-action="start-pet">Iniciar Missão (${App.petSelecionado.emoji} ${App.petSelecionado.word}) →</button>`;
}

/**
 * Seleciona um pet pelo ID e re-renderiza o seletor.
 * Restaura o foco ao card selecionado após a re-renderização.
 * @param {string} id - Identificador do pet.
 */
function selectPet(id) {
  App.petSelecionado = PETS.find((p) => p.id === id) || PETS[0];
  renderPetSelector(document.getElementById("modoContent"));
  const cardSelecionado = document.querySelector(".petCard.selected");
  if (cardSelecionado) ACESSIBILIDADE.focarElemento(cardSelecionado);
}

/**
 * Inicia o modo Salvar o Pet, criando o estado via domínio e embaralhando questões.
 */
function startPetMode() {
  App.modoJogo = "pet";
  App.focoOrigem = '[data-action="start-pet"]';
  App.petEstado = JogoCore.criarEstadoPet(App.petSelecionado, 20, 3);
  let allQs = [];
  BANK.fases.forEach((f) => (allQs = allQs.concat(f.questions)));
  App.q = JogoCore.embaralharArray(allQs.slice());
  App.i = 0;
  App.xp = 0;
  App.streak = 0;
  App.acertos = 0;
  App.respondida = false;
  mostraPetPergunta();
}

/**
 * Renderiza a tela de pergunta no modo Salvar o Pet.
 * Move o foco para a pergunta e anuncia a posição da questão.
 */
function mostraPetPergunta() {
  App.respondida = false;
  App.hintsShown = 0;
  showHome(true);
  const d = App.q[App.i];
  app.className = "card pop";

  const petIconClass = App.petEstado.status === "em_andamento" ? "petBounce" : "";

  app.innerHTML = `
    <span class="badge box">Acertos: ${App.petEstado.acertos}/${App.petEstado.metaAcertos} · Erros: ${App.petEstado.erros}/${App.petEstado.maxErros}</span>
    <span class="who pet">${App.petSelecionado.emoji} Salvar o ${App.petSelecionado.name} (${App.petSelecionado.word})</span>

    <div class="petDisplay">
      <span class="petIcon ${petIconClass}" id="petAvatar" aria-hidden="true">${App.petSelecionado.emoji}</span>
      <div id="petStatusText">
        "${App.petSelecionado.word} está torcendo por você! Faltam ${App.petEstado.metaAcertos - App.petEstado.acertos} acertos."
      </div>
    </div>

    ${d.situacao ? `<div class="situacao"><span aria-hidden="true">📌</span> ${escaparHtml(d.situacao)}</div>` : ""}
    <h1 class="perg">${escaparHtml(d.stem)}</h1>
    <div id="dicaArea"></div>
    <div class="opts" id="opts" role="group" aria-label="Alternativas de resposta"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.petEstado.acertos, App.petEstado.metaAcertos);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce("Questão " + (App.i + 1) + " de " + App.q.length + ".");
}

/**
 * Atualiza o estado e o DOM específicos do modo Salvar o Pet.
 * @param {boolean} certo - Se a resposta está correta.
 * @returns {string} Sufixo da mensagem para o leitor de tela.
 */
function atualizarModoPet(certo) {
  App.petEstado = JogoCore.processarRespostaPet(App.petEstado, certo);
  const avatar = document.getElementById("petAvatar");
  const stText = document.getElementById("petStatusText");
  if (certo) {
    if (avatar) avatar.className = "petIcon petHappy";
    if (stText) stText.textContent = App.petSelecionado.word + " adorou! Resposta certíssima!";
  } else {
    if (avatar) avatar.className = "petIcon petSad";
    if (stText)
      stText.textContent =
        "Ops! " +
        App.petSelecionado.word +
        " ficou apreensivo. Erros: " +
        App.petEstado.erros +
        "/" +
        App.petEstado.maxErros;
  }
  if (App.petEstado.status === "em_andamento") {
    return (
      " Faltam " +
      (App.petEstado.metaAcertos - App.petEstado.acertos) +
      " acertos para salvar o pet."
    );
  }
  return App.petEstado.status === "salvo" ? " Você salvou o pet!" : " O pet fugiu.";
}

/**
 * Renderiza o resumo do modo Salvar o Pet (vitória ou derrota).
 */
function resumoPet() {
  app.className = "card pop";
  const win = App.petEstado.status === "salvo";
  if (win) {
    AUDIO.playSound("fanfare", App.store);
    const primeiroPetSalvo = !(App.store.petsSalvos > 0);
    App.store.petsSalvos = (App.store.petsSalvos || 0) + 1;
    salvarProgresso();
    if (primeiroPetSalvo) comemorarConquista("pet_salvo");
  } else {
    AUDIO.playSound("no", App.store);
  }

  app.innerHTML = `
    <span class="who pet">${App.petSelecionado.emoji} Missão Salvar o Pet</span>
    <h1>${win ? `Você salvou ${App.petSelecionado.word}! <span aria-hidden="true">🎉</span>` : `${App.petSelecionado.word} precisou fugir... <span aria-hidden="true">😿</span>`}</h1>
    <div class="petDisplay">
      <span class="petIcon ${win ? "petHappy" : "petSad"}" aria-hidden="true">${App.petSelecionado.emoji}</span>
      <p class="lead petResumoLead">${win ? `Com ${App.petEstado.acertos} acertos, você provou que domina a AWS e garantiu a alegria do seu companheiro!` : `Você atingiu ${App.petEstado.maxErros} erros. Mas não desanime, revise as questões no Leitner e tente novamente!`}</p>
    </div>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    win
      ? "Missão concluída! Você salvou " + App.petSelecionado.word + "."
      : "Fim da missão. " + App.petSelecionado.word + " precisou fugir."
  );
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorPet = {
  renderPetSelector,
  selectPet,
  startPetMode,
  mostraPetPergunta,
  atualizarModoPet,
  resumoPet
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorPet;
} else if (typeof window !== "undefined") {
  window.RenderizadorPet = RenderizadorPet;
}
