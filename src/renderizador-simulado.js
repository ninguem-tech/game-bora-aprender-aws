/**
 * Telas do modo Simulado da camada de renderização.
 *
 * Contém a introdução com gráfico de evolução, o cronômetro, a tela de
 * questão, o resumo com score na escala AWS e o compartilhamento do
 * resultado.
 */

/* global BANK, app, escaparHtml, setProgress, showHome, renderOptionsAndHints,
   pararTimerSimulado, dispararConfete, comemorarConquista, mostrarToast,
   salvarProgresso */

/**
 * Formata segundos restantes como mm:ss.
 * @param {number} segundos
 * @returns {string}
 */
function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return m.toString().padStart(2, "0") + ":" + s.toString().padStart(2, "0");
}

/**
 * Renderiza a tela introdutória do modo Simulado.
 * @param {HTMLElement} container
 */
function renderSimuladoIntro(container) {
  container.innerHTML = `
    <h2 class="sr-only">Modo simulado</h2>
    <div class="situacao"><span aria-hidden="true">📌</span> <b>Simulado SAA-C03</b>: 65 questões aleatórias com o cronômetro de <b>130 minutos</b>. Objetivo: aprovação no exame da AWS. Sem dicas, sem vidas — só você e o conhecimento.</div>
    ${renderGraficoSimulados(App.store.examHistory)}
    <button class="cta" data-action="start-simulado">Iniciar Simulado <span aria-hidden="true">📝</span> →</button>`;
}

/**
 * Monta um gráfico de linha (SVG) com a evolução dos scores dos simulados,
 * incluindo a linha de corte de aprovação (720). Sem dependências externas.
 *
 * @param {Array<Object>} examHistory Histórico de simulados (mais recente primeiro).
 * @returns {string} HTML do gráfico, ou vazio se houver menos de 2 tentativas.
 */
function renderGraficoSimulados(examHistory) {
  const scores = JogoCore.serieScoresSimulados(examHistory);
  if (scores.length < 2) return "";

  const largura = 300;
  const altura = 120;
  const margem = 14;
  const minimo = 100;
  const maximo = 1000;
  const paraY = (score) => {
    const limitado = Math.max(minimo, Math.min(maximo, score));
    return altura - margem - ((limitado - minimo) / (maximo - minimo)) * (altura - margem * 2);
  };
  const passoX = (largura - margem * 2) / (scores.length - 1);
  const pontos = scores.map((score, indice) => ({
    x: Math.round((margem + indice * passoX) * 10) / 10,
    y: Math.round(paraY(score) * 10) / 10,
    score
  }));
  const linha = pontos.map((p) => p.x + "," + p.y).join(" ");
  const corteY = Math.round(paraY(720) * 10) / 10;
  const melhor = Math.max(...scores);
  const ultimo = scores[scores.length - 1];

  const circulos = pontos
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.score >= 720 ? "var(--verde)" : "var(--vermelho)"}"></circle>`
    )
    .join("");

  return `
    <div class="graficoSimulados">
      <h3>Evolução nos simulados</h3>
      <svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Gráfico de evolução dos simulados: ${scores.length} tentativas, último score ${ultimo}, melhor ${melhor}. Linha de corte de aprovação: 720.">
        <line x1="${margem}" y1="${corteY}" x2="${largura - margem}" y2="${corteY}" class="linhaCorte"></line>
        <text x="${largura - margem}" y="${corteY - 5}" text-anchor="end" class="rotuloCorte">corte 720</text>
        <polyline points="${linha}" class="linhaScores"></polyline>
        ${circulos}
      </svg>
    </div>`;
}

/**
 * Inicia o modo Simulado, embaralhando questões do banco todo.
 */
function startSimuladoMode() {
  App.modoJogo = "simulado";
  App.focoOrigem = '[data-action="start-simulado"]';
  App.simuladoEstado = JogoCore.criarEstadoSimulado(65, 130);
  let allQs = [];
  BANK.fases.forEach((f) => (allQs = allQs.concat(f.questions)));
  App.q = JogoCore.embaralharArray(allQs.slice()).slice(0, App.simuladoEstado.total);
  App.i = 0;
  App.xp = 0;
  App.streak = 0;
  App.acertos = 0;
  App.respondida = false;
  pararTimerSimulado();
  App.simuladoTimer = setInterval(atualizarTimerSimulado, 1000);
  mostraSimuladoPergunta();
}

/**
 * Atualiza o display do timer do simulado.
 */
function atualizarTimerSimulado() {
  if (App.modoJogo !== "simulado") {
    pararTimerSimulado();
    return;
  }
  const segundos = JogoCore.calcularTempoRestanteSimulado(App.simuladoEstado.tempoFimMs);
  const timerEl = document.getElementById("timerSimulado");
  if (timerEl) {
    timerEl.textContent = formatarTempo(segundos);
    const badgeTimer = timerEl.closest ? timerEl.closest(".badge") : null;
    if (badgeTimer) {
      if (segundos > 0 && segundos < 600) {
        badgeTimer.classList.add("warning-timer");
      } else {
        badgeTimer.classList.remove("warning-timer");
      }
    }
  }
  if (segundos <= 0) {
    App.simuladoEstado.status = "timeout";
    resumoSimulado();
  }
}

/**
 * Renderiza a tela de pergunta no modo Simulado.
 */
function mostraSimuladoPergunta() {
  if (App.simuladoEstado.status !== "em_andamento" || App.i >= App.q.length) {
    resumoSimulado();
    return;
  }
  App.respondida = false;
  App.hintsShown = 0;
  showHome(true);
  const d = App.q[App.i];
  app.className = "card pop";
  const segundos = JogoCore.calcularTempoRestanteSimulado(App.simuladoEstado.tempoFimMs);

  app.innerHTML = `
    <span class="badge prova"><span aria-hidden="true">📝</span> <span id="timerSimulado">${formatarTempo(segundos)}</span></span>
    <span class="who"><span aria-hidden="true">📝</span> Simulado · Questão ${App.i + 1} de ${App.q.length}</span>
    ${d.situacao ? `<div class="situacao"><span aria-hidden="true">📌</span> ${escaparHtml(d.situacao)}</div>` : ""}
    <h1 class="perg">${escaparHtml(d.stem)}</h1>
    <div id="dicaArea"></div>
    <div class="opts" id="opts" role="group" aria-label="Alternativas de resposta"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d, false);
  setProgress(App.i, App.q.length);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Questão " +
      (App.i + 1) +
      " de " +
      App.q.length +
      ". Tempo restante: " +
      formatarTempo(segundos) +
      "."
  );
}

/**
 * Atualiza o estado específico do modo Simulado.
 * @param {boolean} certo - Se a resposta está correta.
 * @returns {string} Sufixo da mensagem para o leitor de tela.
 */
function atualizarModoSimulado(certo) {
  App.simuladoEstado = JogoCore.processarRespostaSimulado(App.simuladoEstado, certo);
  if (App.simuladoEstado.status !== "em_andamento") {
    return " Simulado finalizado.";
  }
  return " Questão " + (App.simuladoEstado.indice + 1) + " de " + App.simuladoEstado.total + ".";
}

/**
 * Renderiza o resumo do modo Simulado.
 */
function resumoSimulado() {
  pararTimerSimulado();
  const e = App.simuladoEstado;
  const score = JogoCore.calcularScoreAWS(e.acertos, e.total);
  const percent = e.total > 0 ? Math.round((e.acertos / e.total) * 100) : 0;
  const aprovado = score >= 720;
  const historicoAnterior = Array.isArray(App.store.examHistory) ? App.store.examHistory : [];
  const jaTinhaAprovado = historicoAnterior.some((ex) => ex && ex.score >= 720);
  const jaTinhaPerfeito = historicoAnterior.some((ex) => ex && ex.score >= 1000);
  if (aprovado) {
    AUDIO.playSound("fanfare", App.store);
    dispararConfete();
  } else {
    AUDIO.playSound("no", App.store);
  }

  const tempoUsadoMinutos = Math.ceil(
    (e.tempoMinutos * 60 - JogoCore.calcularTempoRestanteSimulado(e.tempoFimMs)) / 60
  );
  PERSISTENCIA.registrarExame(App.store, {
    acertos: e.acertos,
    total: e.total,
    score: score,
    tempoMinutos: tempoUsadoMinutos
  });
  // Cada resposta do simulado já foi registrada individualmente por
  // processarPontuacao (1 questão + 1 min). Recontar aqui dobrava o log
  // diário (um simulado de 65 questões aparecia como ~130 no "hoje").
  // Registra-se apenas o tempo de cronômetro que excede o já contabilizado.
  const tempoExtraMinutos = Math.max(0, tempoUsadoMinutos - e.indice);
  if (tempoExtraMinutos > 0) {
    PERSISTENCIA.registrarEstudo(App.store, { studyTimeMinutes: tempoExtraMinutos });
  }
  salvarProgresso();

  // O histórico exibido inclui o simulado recém-concluído (já registrado).
  const examHistory = Array.isArray(App.store.examHistory) ? App.store.examHistory : [];
  const ultimosExames = examHistory.slice(0, 5).map(
    (ex) => `
      <li class="examItem">
        <span class="examDate">${escaparHtml(ex.date)}</span>
        <span class="examScore">${ex.score}</span>
        <span class="examMeta">${ex.acertos}/${ex.total} · ${ex.tempoMinutos} min</span>
      </li>`
  );
  const historicoHtml = ultimosExames.length
    ? `<h2 class="sr-only">Histórico de simulados</h2><ul class="examList">${ultimosExames.join("")}</ul>`
    : "";

  app.className = "card pop";
  app.innerHTML = `
    <span class="who"><span aria-hidden="true">📝</span> Fim do Simulado</span>
    <h1>${aprovado ? "Aprovado na prova! 🎉" : "Não passou desta vez — e tudo bem."}</h1>
    <p class="lead">Score estimado na escala AWS: <b>${score} / 1000</b> (corte SAA-C03: 720).</p>
    <div class="stat">
      <div><b>${e.acertos}/${e.total}</b><span>acertos</span></div>
      <div><b>${percent}%</b><span>de aproveitamento</span></div>
    </div>
    <p class="lead">${aprovado ? "Você passou do corte da AWS. Bora manter o ritmo!" : "Cada simulado é um mapa do que ainda precisa de atenção. Revisa os erros e tenta de novo."}</p>
    ${historicoHtml}
    <button class="cta ghost" data-action="compartilhar-simulado">📤 Compartilhar resultado</button>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(e.total, e.total);
  // As conquistas dependem do examHistory já atualizado; por isso a
  // comemoração acontece depois de registrar o exame.
  if (aprovado) {
    if (!jaTinhaPerfeito && score >= 1000) {
      comemorarConquista("simulado_perfeito");
    } else if (!jaTinhaAprovado) {
      comemorarConquista("simulado_aprovado");
    }
  }
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Simulado finalizado. Score " + score + ". " + (aprovado ? "Aprovado." : "Não aprovado.")
  );
}

/**
 * Compartilha o resultado do simulado recém-finalizado via Web Share API;
 * sem suporte, copia o texto para a área de transferência.
 */
function compartilharSimulado() {
  const e = App.simuladoEstado;
  if (!e) return;

  const score = JogoCore.calcularScoreAWS(e.acertos, e.total);
  const tempoMinutos = Math.ceil(
    (e.tempoMinutos * 60 - JogoCore.calcularTempoRestanteSimulado(e.tempoFimMs)) / 60
  );
  const texto = JogoCore.montarTextoCompartilhamentoSimulado({
    score: score,
    acertos: e.acertos,
    total: e.total,
    tempoMinutos: tempoMinutos
  });

  function copiar() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () {
          mostrarToast("Resultado copiado para a área de transferência.");
        },
        function () {
          mostrarToast("Não consegui copiar o resultado.");
        }
      );
    } else {
      mostrarToast("Compartilhamento indisponível neste navegador.");
    }
  }

  if (typeof navigator.share === "function") {
    navigator.share({ text: texto }).catch(function (erro) {
      if (erro && erro.name === "AbortError") return;
      copiar();
    });
  } else {
    copiar();
  }
  ACESSIBILIDADE.announce("Compartilhando resultado do simulado.");
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorSimulado = {
  formatarTempo,
  renderSimuladoIntro,
  renderGraficoSimulados,
  startSimuladoMode,
  atualizarTimerSimulado,
  mostraSimuladoPergunta,
  atualizarModoSimulado,
  resumoSimulado,
  compartilharSimulado
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorSimulado;
} else if (typeof window !== "undefined") {
  window.RenderizadorSimulado = RenderizadorSimulado;
}
