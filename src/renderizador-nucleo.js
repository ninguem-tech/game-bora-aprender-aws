/**
 * Núcleo compartilhado da camada de renderização.
 *
 * Contém as constantes de referência (banco, pets, índice de questões),
 * as referências de elementos fixos do layout e as funções utilitárias
 * usadas por todas as telas (escape de HTML, progresso, confete, toast,
 * conquistas e timer do simulado).
 *
 * Carregado antes dos demais módulos de tela (index.html); no navegador,
 * suas declarações de topo viram globais, visíveis pelos outros módulos.
 */

const BANK = (typeof window !== "undefined" && window.AWS_BANK) || { fases: [] };
const DIFF = {
  intro: ["base", "badge base"],
  exam: ["prova", "badge prova"],
  challenge: ["desafio", "badge desafio"]
};

/**
 * Escapa entidades HTML em uma string para prevenção de XSS.
 * @param {string} texto - Texto bruto.
 * @returns {string} Texto seguro para inserção via innerHTML.
 */
function escaparHtml(texto) {
  if (typeof texto !== "string") return "";
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Salva o progresso atual (App.store) e avisa a pessoa jogadora, via região
 * ARIA live, se o salvamento falhar (ex.: quota do localStorage excedida).
 * Usada nos pontos que persistem progresso de jogo de verdade (XP, deck do
 * Leitner, fases concluídas) — sem isso, uma falha de salvamento passava em
 * silêncio e o app seguia como se tivesse dado certo.
 * @returns {boolean} O mesmo retorno de PERSISTENCIA.salvar.
 */
function salvarProgresso() {
  const salvou = PERSISTENCIA.salvar(App.store);
  if (!salvou) {
    ACESSIBILIDADE.announce(
      "Não foi possível salvar seu progresso neste dispositivo. O armazenamento local pode estar cheio — exporte um backup em “Backup e restauração” para não perder o que já fez."
    );
  }
  return salvou;
}

/**
 * Dispara uma animação de confete leve via CSS, respeitando
 * prefers-reduced-motion. Retorna o contêiner para remoção posterior.
 *
 * @param {HTMLElement} [target] Elemento ancorador (padrão: body).
 * @returns {HTMLElement|null} Contêiner do confete.
 */
function dispararConfete(target) {
  if (typeof window === "undefined") return null;
  if (ACESSIBILIDADE.prefereMovimentoReduzido()) return null;

  const cores = ["#f87171", "#34d399", "#60a5fa", "#facc15", "#a78bfa", "#fb923c"];
  const container = document.createElement("div");
  container.className = "confete";
  container.setAttribute("aria-hidden", "true");
  const ancora = target || document.body;
  const rect = ancora.getBoundingClientRect();
  const origemX = rect.left + rect.width / 2;
  const origemY = rect.top + rect.height / 2;

  for (let i = 0; i < 40; i++) {
    const p = document.createElement("span");
    p.className = "confete-piece";
    p.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
    p.style.left = origemX + "px";
    p.style.top = origemY + "px";
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 80 + Math.random() * 120;
    const tx = Math.cos(angulo) * distancia;
    const ty = Math.sin(angulo) * distancia - 120;
    p.style.setProperty("--tx", tx + "px");
    p.style.setProperty("--ty", ty + "px");
    p.style.setProperty("--rot", Math.floor(Math.random() * 360) + "deg");
    p.style.animationDelay = Math.random() * 0.4 + "s";
    container.appendChild(p);
  }

  document.body.appendChild(container);
  setTimeout(function () {
    if (container.parentNode) container.parentNode.removeChild(container);
  }, 1800);
  return container;
}

const PETS = [
  { id: "cat", name: "Gatinho", emoji: "🐱", word: "Mimi" },
  { id: "dog", name: "Cãozinho", emoji: "🐶", word: "Bidu" },
  { id: "capy", name: "Capivara", emoji: "🦫", word: "Capi" },
  { id: "parrot", name: "Papagaio", emoji: "🦜", word: "Loro" },
  { id: "fish", name: "Peixinho", emoji: "🐟", word: "Nemo" }
];

const QINDEX = {};
BANK.fases.forEach((f) => f.questions.forEach((q) => (QINDEX[q.id] = { q, faseId: f.id })));

const app = typeof document !== "undefined" ? document.getElementById("app") : null;
if (typeof document !== "undefined" && !app) {
  throw new Error(
    "renderizador-nucleo.js: elemento #app não encontrado no DOM. Verifique se este script " +
      'é carregado a partir de index.html (depois de <main id="app">), não isoladamente.'
  );
}
const elXp = typeof document !== "undefined" ? document.getElementById("xp") : null;
const elStreak = typeof document !== "undefined" ? document.getElementById("streak") : null;
const elBar = typeof document !== "undefined" ? document.getElementById("bar") : null;
const elHome = typeof document !== "undefined" ? document.getElementById("home") : null;

/**
 * Exibe ou oculta o botão "Voltar ao início".
 * @param {boolean} b - True para exibir, false para ocultar.
 */
function showHome(b) {
  if (elHome) elHome.hidden = !b;
}

/**
 * Atualiza a barra de progresso, a sequência diária e o contador de XP total.
 * @param {number} done - Quantidade de itens concluídos.
 * @param {number} total - Quantidade total de itens.
 */
function setProgress(done, total) {
  if (elBar) {
    // Mesmo percentual clampado (0-100) usado tanto na largura visual quanto
    // no aria-valuenow — sem o clamp aqui, done > total gera um valor fora
    // do intervalo declarado em aria-valuemax="100" (index.html).
    const pct = Math.min(100, ((done || 0) / (total || 1)) * 100);
    elBar.style.width = pct + "%";
    elBar.parentElement.setAttribute("aria-valuenow", Math.round(pct));
  }
  if (elXp) {
    elXp.textContent = (App && App.store ? App.store.xpTotal || 0 : 0) + " XP";
  }
  if (elStreak) {
    const d =
      App && App.store && typeof App.store.streakDays === "number" ? App.store.streakDays : 0;
    elStreak.textContent = "🔥 " + d + "d";
  }
}

/**
 * Retorna os cartões do baralho Leitner que estão devidos para revisão.
 * @returns {Array<Object>} Cartões devidos.
 */
function devidos() {
  return JogoCore.obterCartoesDevidos(App.store.deck);
}

/**
 * Interrompe o cronômetro do modo Simulado, se estiver ativo.
 * Deve ser chamado ao sair do modo (ex.: Esc voltando à home) para que o
 * timer não continue rodando fora da tela e dispare o resumo sozinho.
 */
function pararTimerSimulado() {
  if (App.simuladoTimer) {
    clearInterval(App.simuladoTimer);
    App.simuladoTimer = null;
  }
}

/**
 * Monta o rótulo de tópico de uma questão (domínio + serviço ou capítulo).
 * @param {Object} d - Objeto da questão.
 * @returns {string} Rótulo do tópico.
 */
function topicoQuestao(d) {
  const x = QINDEX[d.id] ? QINDEX[d.id].q : d;
  return (
    (x.domainLabel ? x.domainLabel + " · " : "") +
    (x.services && x.services.length
      ? x.services[0]
      : x.sourceChapter
        ? "cap " + x.sourceChapter
        : "tópico")
  );
}

/**
 * Verifica se uma conquista recém-desbloqueada deve ser anunciada/celebrada.
 * @param {string} conquistaId Identificador da conquista.
 */
function comemorarConquista(conquistaId) {
  const conquistas = JogoCore.calcularConquistas(App.store).desbloqueadas;
  const conquista = conquistas.find((c) => c.id === conquistaId);
  if (!conquista) return;
  mostrarToast("Conquista desbloqueada: " + conquista.label + " " + conquista.emoji);
}

/**
 * Exibe um toast de informação temporário na tela.
 * @param {string} mensagem Texto do toast.
 */
function mostrarToast(mensagem) {
  if (typeof document === "undefined") return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("sair");
  }, 2600);
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorNucleo = {
  BANK,
  DIFF,
  PETS,
  QINDEX,
  app,
  elXp,
  elStreak,
  elBar,
  elHome,
  escaparHtml,
  salvarProgresso,
  dispararConfete,
  showHome,
  setProgress,
  devidos,
  pararTimerSimulado,
  topicoQuestao,
  comemorarConquista,
  mostrarToast
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorNucleo;
} else if (typeof window !== "undefined") {
  window.RenderizadorNucleo = RenderizadorNucleo;
}
