/**
 * Telas do modo Fases da camada de renderização.
 *
 * Contém a lista de fases com busca e filtros (categoria e domínio AWS),
 * a tela de questão da fase padrão e o resumo de fim de fase.
 */

/* global BANK, DIFF, app, escaparHtml, setProgress, showHome, dispararConfete,
   comemorarConquista, devidos, renderOptionsAndHints, salvarProgresso */

/**
 * Renderiza a lista de fases com busca e filtros por categoria.
 * @param {HTMLElement} container - Container DOM onde a lista será inserida.
 */
function renderFasesList(container) {
  if (!container) return;
  const categories = [
    { id: "todas", label: "Todas" },
    { id: "fundamentos", label: "Fundamentos" },
    { id: "computacao", label: "Computação & Rede" },
    { id: "seguranca", label: "Segurança & IAM" },
    { id: "dados", label: "Dados & S3" },
    { id: "avancado", label: "Avançado" },
    { id: "simulados", label: "Simulados" }
  ];

  const dominios = JogoCore.DOMINIOS_AWS;

  const html = `
    <h2 class="sr-only">Lista de fases</h2>
    <div class="searchWrap">
      <input type="search" class="searchInput" id="faseSearch" aria-label="Buscar fase por assunto ou serviço" placeholder="🔍 Buscar por assunto ou serviço (ex: EC2, S3, IAM, VPC)..." />
    </div>
    <div class="filterChips" role="group" aria-label="Filtrar por categoria">
      ${categories.map((c) => `<button class="chip ${App.categoryFilter === c.id ? "active" : ""}" aria-pressed="${App.categoryFilter === c.id}" data-action="set-category" data-category="${c.id}">${c.label}</button>`).join("")}
    </div>
    <div class="filterChips" role="group" aria-label="Filtrar por domínio AWS">
      ${dominios.map((d) => `<button class="chip ${App.domainFilter === d.id ? "active" : ""}" aria-pressed="${App.domainFilter === d.id}" data-action="set-domain" data-domain="${d.id}">${d.label}</button>`).join("")}
    </div>
    <div class="faseGrid" id="faseGrid"></div>`;

  container.innerHTML = html;

  var searchInput = document.getElementById("faseSearch");
  if (searchInput) {
    // Valor atribuído via propriedade (não via atributo no template) para
    // impedir injeção de HTML pelo termo digitado pelo usuário.
    searchInput.value = App.searchFilter;
    searchInput.addEventListener("input", function () {
      onSearchInput(this.value);
    });
  }

  updateFaseGrid();
}

/**
 * Atualiza o filtro de busca e re-renderiza a grade de fases.
 * @param {string} val - Valor atual do campo de busca.
 */
function onSearchInput(val) {
  App.searchFilter = JogoCore.sanitizarTermoBusca(val);
  updateFaseGrid();
}

/**
 * Define o filtro de categoria e re-renderiza a lista de fases.
 * Restaura o foco ao chip ativado após a re-renderização.
 * @param {string} cat - Identificador da categoria.
 */
function setCategoryFilter(cat) {
  App.categoryFilter = cat;
  renderFasesList(document.getElementById("modoContent"));
  const chipAtivo = document.querySelector(".chip.active");
  if (chipAtivo) ACESSIBILIDADE.focarElemento(chipAtivo);
}

/**
 * Define o filtro de domínio AWS e re-renderiza a lista de fases.
 * @param {string} dom - Identificador do domínio.
 */
function setDomainFilter(dom) {
  App.domainFilter = dom;
  renderFasesList(document.getElementById("modoContent"));
  const chipAtivo = document.querySelector('[data-action="set-domain"].active');
  if (chipAtivo) ACESSIBILIDADE.focarElemento(chipAtivo);
}

/**
 * Atualiza a grade de fases conforme filtros de busca e categoria.
 */
function updateFaseGrid() {
  const grid = document.getElementById("faseGrid");
  if (!grid) return;

  const filtered = BANK.fases
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => {
      const cat = JogoCore.obterCategoriaFase(f.titulo);
      const dom = JogoCore.obterDominioFase(f.titulo);
      const matchesCat = App.categoryFilter === "todas" || App.categoryFilter === cat;
      const matchesDomain = App.domainFilter === "todos" || App.domainFilter === dom;
      const matchesSearch =
        !App.searchFilter ||
        f.titulo.toLowerCase().includes(App.searchFilter) ||
        f.questions.some(
          (q) =>
            q.stem.toLowerCase().includes(App.searchFilter) ||
            (q.services && q.services.some((s) => s.toLowerCase().includes(App.searchFilter)))
        );
      return matchesCat && matchesDomain && matchesSearch;
    });

  if (!filtered.length) {
    // Mensagem construída com textContent: o termo de busca é entrada do
    // usuário e jamais pode ser interpolado em innerHTML (prevenção de XSS).
    grid.innerHTML = "";
    const aviso = document.createElement("div");
    aviso.className = "dica";
    aviso.textContent =
      'Nenhuma fase encontrada para "' + App.searchFilter + '". Tente outro termo de busca.';
    grid.appendChild(aviso);
    return;
  }

  grid.innerHTML = filtered
    .map(({ f, idx }) => {
      const st = App.store.phaseStats[f.id];
      let badgeHtml = "";
      if (st) {
        if (st.bestPercent === 100) badgeHtml = `<span class="faseBadge star">★ 100%</span>`;
        else badgeHtml = `<span class="faseBadge done">✓ ${st.bestPercent}%</span>`;
      }
      return `
      <button class="faseBtn" data-action="start-fase" data-idx="${idx}">
        <div>
          ${escaparHtml(f.titulo)}
          <small>${f.questions.length} desafios • [Atalhos Alt+1 a Alt+4 no jogo]</small>
        </div>
        ${badgeHtml}
      </button>`;
    })
    .join("");
}

/**
 * Inicia uma fase padrão pelo índice do banco.
 * @param {number} idx - Índice da fase no banco.
 */
function startFase(idx) {
  App.modoJogo = "fases";
  App.focoOrigem = '[data-action="start-fase"][data-idx="' + idx + '"]';
  App.fase = BANK.fases[idx];
  App.q = App.fase.questions.slice();
  App.i = 0;
  App.xp = 0;
  App.streak = 0;
  App.acertos = 0;
  App.revisar = [];
  App.respondida = false;
  mostra();
}

/**
 * Renderiza a tela de pergunta da fase padrão.
 * Move o foco para a pergunta e anuncia a posição da questão.
 */
function mostra() {
  App.respondida = false;
  App.hintsShown = 0;
  showHome(true);
  const d = App.q[App.i];
  const [dlabel, dcls] = DIFF[d.difficulty] || ["", ""];
  app.className = "card pop";
  app.innerHTML = `
    ${dcls ? `<span class="${dcls}">${dlabel}</span>` : ""}
    <span class="who camila">Camila · situação real</span>
    ${d.situacao ? `<div class="situacao"><span aria-hidden="true">📌</span> ${escaparHtml(d.situacao)}</div>` : ""}
    <h1 class="perg">${escaparHtml(d.stem)}</h1>
    <div id="dicaArea"></div>
    <div class="opts" id="opts" role="group" aria-label="Alternativas de resposta"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.i, App.q.length);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce("Questão " + (App.i + 1) + " de " + App.q.length + ".");
}

/**
 * Renderiza o resumo de fim de fase padrão com estatísticas e lista de revisão.
 */
function resumo() {
  AUDIO.playSound("fanfare", App.store);
  app.className = "card pop";
  const total = App.q.length;
  const revUniq = [...new Set(App.revisar)];
  const due = devidos().length;

  const percent = Math.round((App.acertos / total) * 100);
  const prev = App.store.phaseStats[App.fase.id] || { bestPercent: 0 };
  const eraPerfeita = prev.bestPercent === 100;
  App.store.phaseStats[App.fase.id] = {
    completed: true,
    bestPercent: Math.max(prev.bestPercent || 0, percent)
  };
  salvarProgresso();

  const gabaritou = App.acertos === total;
  if (gabaritou) {
    dispararConfete();
    if (!eraPerfeita) comemorarConquista("fase_perfeita");
  }

  app.innerHTML = `
    <span class="who rafael">Rafael · mentor</span>
    <h1>${escaparHtml(App.fase.titulo)} — fechada! 🎉</h1>
    <p class="lead">${App.acertos === total ? "Gabaritou — e mais importante: entendeu o porquê." : "O que importa não é acertar tudo de primeira, é fechar os buracos. Você já está mais perto."}</p>
    <div class="stat">
      <div><b>${App.acertos}/${total}</b><span>acertos</span></div>
      <div><b>${App.xp}</b><span>XP na fase</span></div>
      <div><b>${due}</b><span>no Leitner 📒</span></div>
    </div>
    ${revUniq.length ? `<p class="revTitulo">📒 Foi pro Leitner pra revisar:</p><ul class="rev">${revUniq.map((r) => `<li>${escaparHtml(r)}</li>`).join("")}</ul>` : `<div class="dica">Nada novo pra revisar nesta fase. Mandou bem demais. ☕</div>`}
    ${due ? `<button class="cta lt" data-action="revisar0">📒 Revisar agora (${due})</button>` : ""}
    <button class="cta ghost" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(total, total);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Fase concluída: " + App.acertos + " de " + total + " acertos, " + App.xp + " XP."
  );
}

// Objeto único compartilhado pelos dois ambientes de exportação (Node.js e
// navegador), evitando listas duplicadas que podem divergir.
const RenderizadorFases = {
  renderFasesList,
  onSearchInput,
  setCategoryFilter,
  setDomainFilter,
  updateFaseGrid,
  startFase,
  mostra,
  resumo
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RenderizadorFases;
} else if (typeof window !== "undefined") {
  window.RenderizadorFases = RenderizadorFases;
}
