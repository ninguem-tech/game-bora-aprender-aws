/**
 * Telas da revisão Leitner da camada de renderização.
 *
 * Contém a visão geral do baralho (contagem por caixa), o fluxo de cartões
 * (mostrar, revelar, autoavaliar) e o resumo final da revisão.
 */

/* global app, setProgress, showHome, devidos, intro, salvarProgresso */

/**
 * Renderiza a visão geral do baralho Leitner com contagem por caixa.
 * @param {HTMLElement} container - Container DOM.
 */
function renderLeitnerOverview(container) {
  const due = devidos().length;
  const boxes = [1, 2, 3, 4, 5].map(
    (b) => Object.values(App.store.deck).filter((c) => c.box === b).length
  );

  const intervalos = JogoCore.INTERVALOS_LEITNER_DIAS;
  const labels = intervalos.map((dias, i) => {
    if (i === 0) return "Caixa 1 (8s)";
    return `Caixa ${i + 1} (${dias} dia${dias === 1 ? "" : "s"})`;
  });
  labels[4] = "Caixa 5 (Dominado · sai do baralho)";

  container.innerHTML = `
    <h2 class="sr-only">Baralho Leitner</h2>
    <div class="ltBox">
      <div class="n">${due}</div>
      <div class="t">${due ? "cartão(ões) pronto(s) para revisar hoje 📒. A repetição espaçada ajuda na fixação de longo prazo." : "Nenhum cartão pendente agora. Erre questões nos treinos para adicioná-las ao Leitner."}</div>
    </div>

    <div class="stat ltStat">
      <div><b>${boxes[0]}</b><span>${labels[0]}</span></div>
      <div><b>${boxes[1]}</b><span>${labels[1]}</span></div>
      <div><b>${boxes[2]}</b><span>${labels[2]}</span></div>
      <div><b>${boxes[3]}</b><span>${labels[3]}</span></div>
      <div><b>${boxes[4]}</b><span>${labels[4]}</span></div>
    </div>

    <button class="cta lt" data-action="revisar0" ${due ? "" : "disabled"}>📒 Iniciar Revisão (${due})</button>`;
}

/**
 * Inicia a revisão Leitner com os cartões devidos, ordenados por caixa e data.
 */
function revisar0() {
  const cards = devidos();
  if (!cards.length) {
    intro();
    return;
  }
  cards.sort((a, b) => a.box - b.box || a.due - b.due);
  App.modoRevisao = { cards, idx: 0, acertosRev: 0, revelado: false };
  App.focoOrigem = '[data-action="revisar0"]';
  mostraCartao();
}

/**
 * Renderiza a tela de um cartão de revisão Leitner.
 * Move o foco para o título e anuncia a posição do cartão.
 */
function mostraCartao() {
  const m = App.modoRevisao;
  const c = m.cards[m.idx];
  m.revelado = false;
  showHome(true);
  app.className = "card pop";
  app.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.className = "sr-only";
  h1.textContent = "Revisão Leitner";

  const badge = document.createElement("span");
  badge.className = "badge box";
  badge.textContent = "caixa " + c.box + "/5";

  const who = document.createElement("span");
  who.className = "who leitner";
  who.innerHTML = '<span aria-hidden="true">📒</span> Revisão (Leitner)';

  app.appendChild(h1);
  app.appendChild(badge);
  app.appendChild(who);

  if (c.situacao) {
    const sit = document.createElement("div");
    sit.className = "situacao";
    sit.innerHTML = '<span aria-hidden="true">📌</span> ';
    sit.appendChild(document.createTextNode(c.situacao));
    app.appendChild(sit);
  }

  const perg = document.createElement("div");
  perg.className = "perg";
  perg.textContent = c.stem;
  app.appendChild(perg);

  const resparea = document.createElement("div");
  resparea.id = "resparea";
  app.appendChild(resparea);

  const btn = document.createElement("button");
  btn.className = "cta lt";
  btn.id = "mostrarBtn";
  btn.dataset.action = "revela-resp";
  btn.textContent = "Mostrar resposta [Espaço / Enter]";
  app.appendChild(btn);

  const conceito = document.createElement("p");
  conceito.className = "conceito";
  conceito.textContent =
    "Cartão " + (m.idx + 1) + " de " + m.cards.length + " · revise sozinho e seja honesto";
  app.appendChild(conceito);

  setProgress(m.idx, m.cards.length);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Cartão " + (m.idx + 1) + " de " + m.cards.length + ", caixa " + c.box + " de 5."
  );
}

/**
 * Revela a resposta do cartão Leitner atual e exibe botões de autoavaliação.
 * Move o foco para a autoavaliação e anuncia a revelação.
 */
function revelaResp() {
  const m = App.modoRevisao;
  const c = m.cards[m.idx];
  m.revelado = true;

  const respArea = document.getElementById("resparea");
  respArea.innerHTML = "";
  const respDiv = document.createElement("div");
  respDiv.className = "resp";
  const okSpan = document.createElement("span");
  okSpan.className = "ok";
  okSpan.textContent = "✓ " + c.correta;
  const porqueDiv = document.createElement("div");
  porqueDiv.style.marginTop = "6px";
  porqueDiv.textContent = c.porque;
  respDiv.appendChild(okSpan);
  respDiv.appendChild(porqueDiv);
  respArea.appendChild(respDiv);

  const mostrarBtn = document.getElementById("mostrarBtn");
  if (mostrarBtn) {
    const wrapper = document.createElement("div");
    wrapper.className = "row2";
    const btnErro = document.createElement("button");
    btnErro.className = "cta";
    btnErro.style.background = "var(--vermelho)";
    btnErro.dataset.action = "avalia";
    btnErro.dataset.acertou = "false";
    btnErro.textContent = "Ainda erro [Alt+1]";
    const btnAcerto = document.createElement("button");
    btnAcerto.className = "cta";
    btnAcerto.style.background = "var(--verde)";
    btnAcerto.dataset.action = "avalia";
    btnAcerto.dataset.acertou = "true";
    btnAcerto.textContent = "Acertei 👍 [Alt+2]";
    wrapper.appendChild(btnErro);
    wrapper.appendChild(btnAcerto);
    mostrarBtn.replaceWith(wrapper);
  }

  const primeiraAvaliacao = document.querySelector(".row2 .cta");
  if (primeiraAvaliacao) ACESSIBILIDADE.focarElemento(primeiraAvaliacao);
  ACESSIBILIDADE.announce("Resposta revelada. Avalie: Alt+1 para erro, Alt+2 para acerto.");
}

/**
 * Avalia o cartão Leitner atual como acerto ou erro e avança para o próximo.
 * Anuncia o reagendamento do cartão no baralho.
 * @param {boolean} acertou - Se o usuário acertou a questão.
 */
function avalia(acertou) {
  const m = App.modoRevisao;
  const c = m.cards[m.idx];
  if (acertou) {
    AUDIO.playSound("ok", App.store);
    m.acertosRev++;
  } else {
    AUDIO.playSound("no", App.store);
  }

  const atualizado = JogoCore.calcularAgendamentoLeitner(c, acertou);
  Object.assign(c, atualizado);
  if (c.box >= 5) {
    delete App.store.deck[c.id];
    ACESSIBILIDADE.announce("Cartão dominado! Removido do baralho.");
  } else if (acertou) {
    ACESSIBILIDADE.announce("Cartão avançou para a caixa " + c.box + ".");
  } else {
    ACESSIBILIDADE.announce("Cartão voltou para a caixa " + c.box + ".");
  }
  PERSISTENCIA.registrarEstudo(App.store, { leitnerReviews: 1, studyTimeMinutes: 1 });
  salvarProgresso();

  m.idx++;
  if (m.idx >= m.cards.length) resumoRevisao();
  else mostraCartao();
}

/**
 * Renderiza o resumo final da revisão Leitner.
 */
function resumoRevisao() {
  AUDIO.playSound("fanfare", App.store);
  const m = App.modoRevisao;
  const total = m.cards.length;
  const due = devidos().length;
  app.className = "card pop";
  app.innerHTML = `
    <span class="who leitner"><span aria-hidden="true">📒</span> Revisão (Leitner)</span>
    <h1>Revisão feita! <span aria-hidden="true">✅</span></h1>
    <p class="lead">${m.acertosRev === total ? "Você dominou os cartões de hoje. Repetição espaçada funcionando." : "Os que você ainda errou voltam logo; os que acertou voltam mais para a frente. É assim que fixa."}</p>
    <div class="stat">
      <div><b>${m.acertosRev}/${total}</b><span>acertos na revisão</span></div>
      <div><b>${due}</b><span>ainda pendentes</span></div>
    </div>
    ${due ? `<button class="cta lt" data-action="revisar0">Continuar revisando (${due})</button>` : `<div class="dica">Tudo revisado por agora. Os cartões voltam no tempo certo. ☕</div>`}
    <button class="cta ghost" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(total, total);
  App.modoRevisao = null;
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce("Revisão concluída: " + m.acertosRev + " de " + total + " acertos.");
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorLeitner = {
  renderLeitnerOverview,
  revisar0,
  mostraCartao,
  revelaResp,
  avalia,
  resumoRevisao
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorLeitner;
} else if (typeof window !== "undefined") {
  window.RenderizadorLeitner = RenderizadorLeitner;
}
