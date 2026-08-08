/**
 * Motor compartilhado de questões da camada de renderização.
 *
 * Contém o fluxo comum a todos os modos que apresentam questões (fases,
 * Salvar o Pet, Sobrevivência e Simulado): renderização de alternativas e
 * dicas, processamento da resposta, pontuação, feedback e navegação.
 *
 * As funções específicas de cada modo (mostraPetPergunta, resumoSimulado...)
 * vivem nos módulos de tela correspondentes e são resolvidas como globais
 * em tempo de chamada — mesmo contrato do navegador para scripts clássicos.
 */

/* global topicoQuestao, QINDEX, setProgress, salvarProgresso, resumoPet,
   mostraPetPergunta, resumoSurvival, mostraSurvivalPergunta, resumoSimulado,
   mostraSimuladoPergunta, resumo, mostra, atualizarModoPet,
   atualizarModoSurvival, atualizarModoSimulado */

/**
 * Renderiza as opções de resposta e o botão de dica para uma questão.
 * @param {Object} d - Objeto da questão.
 */
function renderOptionsAndHints(d, permitirDica = true) {
  const dicaArea = document.getElementById("dicaArea");
  if (permitirDica && d.hints && d.hints.length) {
    const b = document.createElement("button");
    b.className = "dicaBtn";
    b.id = "dicaBtn";
    b.textContent = "💡 Ver dica do Rafael [Alt+H]";
    b.onclick = function () {
      revelarDica();
    };
    dicaArea.appendChild(b);
  }
  const opts = document.getElementById("opts");
  // A ordem das alternativas é sorteada a cada apresentação da questão: a letra
  // exibida segue a posição na tela, mas `o.key` continua sendo a chave original
  // do banco, usada por `responde`, `desabilitarOpcoes` e `whyNots`.
  JogoCore.embaralharOpcoes(d).forEach(function (o, idx) {
    const b = document.createElement("button");
    b.className = "opt";
    b.dataset.k = o.key;
    const linha = document.createElement("div");
    const keyGroup = document.createElement("span");
    keyGroup.className = "optKeyGroup";
    if (idx < 4) {
      const badge = document.createElement("span");
      badge.className = "keyBadge";
      badge.textContent = "[" + (idx + 1) + "]";
      keyGroup.appendChild(badge);
    }
    const key = document.createElement("span");
    key.className = "k";
    key.textContent = o.rotulo;
    keyGroup.appendChild(key);
    linha.appendChild(keyGroup);
    linha.appendChild(document.createTextNode(o.text));
    b.appendChild(linha);
    b.onclick = function () {
      responde(o.key, b);
    };
    opts.appendChild(b);
  });
}

/**
 * Revela a próxima dica disponível para a questão atual.
 */
function revelarDica() {
  const d = App.q[App.i];
  if (!Array.isArray(d.hints) || App.hintsShown >= d.hints.length) return;
  const area = document.getElementById("dicaArea");
  const btn = document.getElementById("dicaBtn");
  const div = document.createElement("div");
  div.className = "dica";
  div.textContent = d.hints[App.hintsShown];
  area.insertBefore(div, btn);
  App.hintsShown++;
  if (App.hintsShown >= d.hints.length) {
    btn.disabled = true;
    btn.textContent = "✓ Sem mais dicas";
  } else {
    btn.textContent = `💡 Ver outra dica (${App.hintsShown + 1}/${d.hints.length}) [Alt+H]`;
  }
  ACESSIBILIDADE.announce("Dica revelada: " + d.hints[App.hintsShown - 1]);
}

/**
 * Desabilita todas as opções e marca visualmente a correta e a incorreta.
 * @param {Object} d - Objeto da questão.
 * @param {string} key - Chave selecionada pelo jogador.
 * @param {boolean} certo - Se a resposta está correta.
 */
function desabilitarOpcoes(d, key, certo) {
  document.querySelectorAll("#opts .opt").forEach(function (b) {
    b.disabled = true;
    if (d.answers.includes(b.dataset.k)) b.classList.add("ok");
    if (b.dataset.k === key && !certo) b.classList.add("no");
  });
  const db = document.getElementById("dicaBtn");
  if (db) db.disabled = true;
}

/**
 * Atualiza estatísticas persistentes, XP, streak e baralho Leitner.
 * @param {Object} d - Objeto da questão.
 * @param {boolean} certo - Se a resposta está correta.
 * @param {boolean} usouDica - Se o jogador revelou alguma dica.
 * @returns {string} Mensagem descritiva do resultado.
 */
function processarPontuacao(d, certo, usouDica) {
  App.store.stats.totalAnswered = (App.store.stats.totalAnswered || 0) + 1;

  if (certo) {
    App.store.stats.totalCorrect = (App.store.stats.totalCorrect || 0) + 1;
    AUDIO.playSound("ok", App.store);
    App.acertos++;
    App.streak++;
    if (App.streak > (App.store.stats.maxStreak || 0)) App.store.stats.maxStreak = App.streak;
    const g = JogoCore.calcularGanhoXP(true, App.streak, usouDica);
    App.xp += g;
    App.store.xpTotal = (App.store.xpTotal || 0) + g;
    PERSISTENCIA.registrarEstudo(App.store, { questionsAnswered: 1, studyTimeMinutes: 1 });
    salvarProgresso();
    return "Resposta correta! +" + g + " XP.";
  }

  AUDIO.playSound("no", App.store);
  App.streak = 0;
  App.revisar.push(topicoQuestao(d));
  App.store.deck = JogoCore.adicionarAoLeitner(App.store.deck, d, QINDEX);
  PERSISTENCIA.registrarEstudo(App.store, { questionsAnswered: 1, studyTimeMinutes: 1 });
  salvarProgresso();
  return "Resposta incorreta. Questão adicionada ao Leitner.";
}

/**
 * Renderiza o bloco de feedback (tag, explicação, whyNots, conceito).
 * @param {Object} d - Objeto da questão.
 * @param {boolean} certo - Se a resposta está correta.
 * @param {string} key - Chave selecionada.
 * @param {boolean} usouDica - Se o jogador revelou alguma dica.
 * @param {number} [xpGanho] - Total de XP ganho nesta resposta (só relevante se certo).
 */
function renderizarFeedback(d, certo, key, usouDica, xpGanho) {
  const fb = document.getElementById("fb");
  fb.className = "fb " + (certo ? "ok" : "no");
  fb.innerHTML = "";

  // Mostra o XP TOTAL ganho (base + bônus), não só o bônus "sem dica" —
  // do contrário o card sugere que o jogador ganhou só +2 XP quando na
  // verdade ganhou o valor cheio de calcularGanhoXP.
  const tag = certo
    ? "✓ Mandou bem!" +
      (App.streak >= 3 ? " 🔥 sequência de " + App.streak : "") +
      (Number.isFinite(xpGanho) ? ` (+${xpGanho} XP${usouDica ? "" : ", sem dica"})` : "")
    : "✕ Quase — bora entender, sem estresse";

  const tagEl = document.createElement("span");
  tagEl.className = "tag";
  tagEl.textContent = tag;
  fb.appendChild(tagEl);

  if (d.explanation) {
    const explEl = document.createElement("div");
    explEl.textContent = d.explanation;
    fb.appendChild(explEl);
  }

  if (!certo && d.whyNots && d.whyNots[key]) {
    const pqEl = document.createElement("div");
    pqEl.className = "pq";
    const strong = document.createElement("strong");
    strong.textContent = "Por que essa não:";
    pqEl.appendChild(strong);
    pqEl.appendChild(document.createTextNode(" " + d.whyNots[key]));
    fb.appendChild(pqEl);
  }

  const conceitoEl = document.createElement("div");
  conceitoEl.className = "conceito";
  conceitoEl.textContent = certo
    ? ""
    : "📒 Adicionado ao Leitner — volta pra você revisar e fixar.";
  fb.appendChild(conceitoEl);
}

/**
 * Determina se a questão atual é a última da rodada.
 * @returns {boolean}
 */
function ehUltimaQuestao() {
  return (
    (App.modoJogo === "fases" && App.i === App.q.length - 1) ||
    (App.modoJogo === "pet" && App.petEstado.status !== "em_andamento") ||
    (App.modoJogo === "survival" &&
      (App.survivalEstado.status !== "em_andamento" || App.i >= App.q.length - 1)) ||
    (App.modoJogo === "simulado" &&
      (App.simuladoEstado.status !== "em_andamento" || App.i >= App.q.length - 1))
  );
}

/**
 * Cria e anexa o botão de avanço (CTA) com a navegação adequada ao modo.
 * @param {boolean} last - Se é a última questão da rodada.
 */
function criarBotaoProximo(last) {
  const fb = document.getElementById("fb");
  const cta = document.createElement("button");
  cta.className = "cta";
  cta.textContent = last ? "Ver resultado [Enter] →" : "Próximo desafio [Enter] →";
  cta.onclick = function () {
    App.i++;
    if (App.modoJogo === "pet") {
      if (App.petEstado.status !== "em_andamento") resumoPet();
      else mostraPetPergunta();
    } else if (App.modoJogo === "survival") {
      if (App.survivalEstado.status !== "em_andamento") resumoSurvival();
      else mostraSurvivalPergunta();
    } else if (App.modoJogo === "simulado") {
      if (App.simuladoEstado.status !== "em_andamento") resumoSimulado();
      else mostraSimuladoPergunta();
    } else {
      if (last) resumo();
      else mostra();
    }
  };
  fb.appendChild(cta);
  ACESSIBILIDADE.focarElemento(cta);
}

/**
 * Processa a resposta do jogador para a questão atual.
 * Orquestra pontuação, modos de jogo, feedback visual e navegação.
 * @param {string} key - Chave da opção selecionada (A, B, C, D).
 * @param {HTMLElement} btn - Botão da opção clicada.
 */
function responde(key, btn) {
  if (App.respondida) return;
  App.respondida = true;

  const d = App.q[App.i];
  const certo = d.answers.includes(key);
  const usouDica = App.hintsShown > 0;

  desabilitarOpcoes(d, key, certo);

  let msg = processarPontuacao(d, certo, usouDica);
  // App.streak já reflete o pós-incremento aplicado dentro de processarPontuacao,
  // então recalcular aqui com os mesmos parâmetros reproduz o XP realmente
  // creditado (função pura, sem efeitos colaterais adicionais).
  const xpGanho = certo ? JogoCore.calcularGanhoXP(true, App.streak, usouDica) : 0;

  if (App.modoJogo === "pet") {
    msg += atualizarModoPet(certo);
  } else if (App.modoJogo === "survival") {
    msg += atualizarModoSurvival(certo);
  } else if (App.modoJogo === "simulado") {
    msg += atualizarModoSimulado(certo);
  }

  ACESSIBILIDADE.announce(msg);
  renderizarFeedback(d, certo, key, usouDica, xpGanho);

  const last = ehUltimaQuestao();
  criarBotaoProximo(last);

  if (App.modoJogo === "fases" || App.modoJogo === "simulado") setProgress(App.i + 1, App.q.length);
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorQuiz = {
  renderOptionsAndHints,
  revelarDica,
  desabilitarOpcoes,
  processarPontuacao,
  renderizarFeedback,
  ehUltimaQuestao,
  criarBotaoProximo,
  responde
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorQuiz;
} else if (typeof window !== "undefined") {
  window.RenderizadorQuiz = RenderizadorQuiz;
}
