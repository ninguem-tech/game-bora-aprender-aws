/**
 * Módulo de renderização da interface do jogo.
 *
 * Contém todas as funções que manipulam o DOM para exibir telas, questões,
 * feedbacks, resumos e painéis. Utiliza JogoCore para regras de negócio
 * (cálculo de XP, modos Pet/Sobrevivência, Leitner, filtros) e os módulos
 * PERSISTENCIA, AUDIO e ACESSIBILIDADE para efeitos colaterais.
 *
 * Dependências globais (carregadas antes via <script>):
 *   window.JogoCore, window.PERSISTENCIA, window.AUDIO, window.ACESSIBILIDADE,
 *   window.AWS_BANK, window.App
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
const elXp = typeof document !== "undefined" ? document.getElementById("xp") : null;
const elBar = typeof document !== "undefined" ? document.getElementById("bar") : null;
const elHome = typeof document !== "undefined" ? document.getElementById("home") : null;

/**
 * Exibe ou oculta o botão "Voltar ao início".
 * @param {boolean} b - True para exibir, false para ocultar.
 */
function showHome(b) {
  elHome.hidden = !b;
}

/**
 * Atualiza a barra de progresso e o contador de XP total.
 * @param {number} done - Quantidade de itens concluídos.
 * @param {number} total - Quantidade total de itens.
 */
function setProgress(done, total) {
  elBar.style.width = Math.min(100, ((done || 0) / (total || 1)) * 100) + "%";
  elBar.parentElement.setAttribute("aria-valuenow", Math.round(((done || 0) / (total || 1)) * 100));
  elXp.textContent = (App.store.xpTotal || 0) + " XP";
}

/**
 * Retorna os cartões do baralho Leitner que estão devidos para revisão.
 * @returns {Array<Object>} Cartões devidos.
 */
function devidos() {
  return JogoCore.obterCartoesDevidos(App.store.deck);
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

// ---------- HOME SCREEN ----------

/**
 * Renderiza a tela inicial do jogo com dashboard, abas de modo e estatísticas.
 * @param {boolean} [silencioso] - Quando true, não anuncia a tela ao leitor
 *   de tela (usado por setModo, onde a troca de aba já dá o contexto).
 */
function intro(silencioso) {
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
  const hoje = new Date().toISOString().split("T")[0];
  const logHoje = App.store.studyLogs && App.store.studyLogs[hoje];
  const hojeQuestoes = logHoje ? logHoje.questionsAnswered || 0 : 0;
  const readiness = JogoCore.calcularReadiness(App.store, BANK.fases.length);
  const rLabel = JogoCore.classificarReadiness(readiness);

  app.innerHTML = `
    <span class="who rafael">Rafael · mentor</span>
    <h1>Bora começar do zero?</h1>
    <p class="lead">Você é a <b>Júlia</b>. Aqui aprendemos a AWS resolvendo problemas reais, sem empáfia e com muito acolhimento. <span aria-hidden="true">☕</span></p>

    <div class="readiness" role="img" aria-label="Prontidão para o exame: ${readiness}% — ${rLabel.label}">
      <div class="readinessLabel">Prontidão para o exame</div>
      <div class="readinessTrack" aria-hidden="true">
        <div class="readinessFill" style="width:${readiness}%;background:${rLabel.cor}"></div>
      </div>
      <div class="readinessValue" aria-hidden="true"><b>${readiness}%</b> — ${rLabel.label}</div>
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

    <button class="cta ghost" style="margin-top:14px" data-action="sobre">Quem é 人間/人间 (nin-guem)?</button>`;

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

// ---------- MODO: CONQUISTAS ----------

/**
 * Renderiza a aba de conquistas/desbloqueios do jogador.
 * @param {HTMLElement} container - Container DOM.
 */
function renderConquistas(container) {
  const { desbloqueadas, pendentes } = JogoCore.calcularConquistas(App.store);
  const total = desbloqueadas.length + pendentes.length;

  const badgeHtml = (c, ativo) => `
    <li class="badgeItem ${ativo ? "" : "locked"}" aria-label="${ativo ? "Conquista desbloqueada" : "Conquista bloqueada"}: ${c.label}">
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
    <h3 style="margin-top:14px">Pendentes</h3>
    <ul class="badgeGrid">
      ${pendentes.map((c) => badgeHtml(c, false)).join("")}
    </ul>`;
}

// ---------- LISTA E BUSCA DE FASES ----------

/**
 * Renderiza a lista de fases com busca e filtros por categoria.
 * @param {HTMLElement} container - Container DOM onde a lista será inserida.
 */
function renderFasesList(container) {
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
      <input type="search" class="searchInput" id="faseSearch" aria-label="Buscar fase por assunto ou serviço" placeholder="🔍 Buscar por assunto ou serviço (ex: EC2, S3, IAM, VPC)..." data-action-input="search" />
    </div>
    <div class="filterChips" role="group" aria-label="Filtrar por categoria">
      ${categories.map((c) => `<button class="chip ${App.categoryFilter === c.id ? "active" : ""}" aria-pressed="${App.categoryFilter === c.id}" data-action="set-category" data-category="${c.id}">${c.label}</button>`).join("")}
    </div>
    <div class="filterChips" role="group" aria-label="Filtrar por domínio AWS" style="margin-top:6px">
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
  App.searchFilter = val.toLowerCase();
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

// ---------- MODO: SALVAR O PET ----------

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
      <div style="margin-top:6px; font-weight:700; font-size:.9rem; color:var(--cafe2)" id="petStatusText">
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

// ---------- MODO: SOBREVIVÊNCIA ----------

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
  setProgress(App.survivalEstado.acertosConsecutivos, App.survivalEstado.acertosConsecutivos + 5);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce("Questão " + (App.i + 1) + ". Vidas restantes: " + vidasRestantes + ".");
}

// ---------- MODO: SIMULADO CRONOMETRADO ----------

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
    <button class="cta" data-action="start-simulado">Iniciar Simulado <span aria-hidden="true">📝</span> →</button>`;
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
  if (App.simuladoTimer) clearInterval(App.simuladoTimer);
  App.simuladoTimer = setInterval(atualizarTimerSimulado, 1000);
  mostraSimuladoPergunta();
}

/**
 * Atualiza o display do timer do simulado.
 */
function atualizarTimerSimulado() {
  if (App.modoJogo !== "simulado") {
    clearInterval(App.simuladoTimer);
    App.simuladoTimer = null;
    return;
  }
  const segundos = JogoCore.calcularTempoRestanteSimulado(App.simuladoEstado.tempoFimMs);
  const timerEl = document.getElementById("timerSimulado");
  if (timerEl) timerEl.textContent = formatarTempo(segundos);
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

  renderOptionsAndHints(d);
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
 * Renderiza o resumo do modo Simulado.
 */
function resumoSimulado() {
  if (App.simuladoTimer) {
    clearInterval(App.simuladoTimer);
    App.simuladoTimer = null;
  }
  const e = App.simuladoEstado;
  const score = JogoCore.calcularScoreAWS(e.acertos, e.total);
  const percent = e.total > 0 ? Math.round((e.acertos / e.total) * 100) : 0;
  const aprovado = score >= 720;
  if (aprovado) {
    AUDIO.playSound("fanfare", App.store);
    dispararConfete();
    if (score >= 1000) comemorarConquista("simulado_perfeito");
  } else {
    AUDIO.playSound("no", App.store);
  }

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
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(e.total, e.total);
  const tempoUsadoMinutos = Math.ceil(
    (e.tempoMinutos * 60 - JogoCore.calcularTempoRestanteSimulado(e.tempoFimMs)) / 60
  );
  PERSISTENCIA.registrarExame(App.store, {
    acertos: e.acertos,
    total: e.total,
    score: score,
    tempoMinutos: tempoUsadoMinutos
  });
  PERSISTENCIA.registrarEstudo(App.store, {
    questionsAnswered: e.indice,
    studyTimeMinutes: tempoUsadoMinutos
  });
  PERSISTENCIA.salvar(App.store);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Simulado finalizado. Score " + score + ". " + (aprovado ? "Aprovado." : "Não aprovado.")
  );
}

// ---------- MODO: VISÃO GERAL LEITNER ----------

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

    <div class="stat" style="margin-top:14px">
      <div><b>${boxes[0]}</b><span>${labels[0]}</span></div>
      <div><b>${boxes[1]}</b><span>${labels[1]}</span></div>
      <div><b>${boxes[2]}</b><span>${labels[2]}</span></div>
      <div><b>${boxes[3]}</b><span>${labels[3]}</span></div>
      <div><b>${boxes[4]}</b><span>${labels[4]}</span></div>
    </div>

    <button class="cta lt" data-action="revisar0" ${due ? "" : "disabled"}>📒 Iniciar Revisão (${due})</button>`;
}

// ---------- MODO: GUIA DE SERVIÇOS AWS ----------

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

// ---------- AUXILIARES DE RENDERIZAÇÃO DE QUESTÕES ----------

/**
 * Renderiza as opções de resposta e o botão de dica para uma questão.
 * @param {Object} d - Objeto da questão.
 */
function renderOptionsAndHints(d) {
  const dicaArea = document.getElementById("dicaArea");
  if (d.hints && d.hints.length) {
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
  d.options.forEach(function (o, idx) {
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
    key.textContent = o.key;
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

// ---------- JOGAR FASE PADRÃO ----------

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
 * Revela a próxima dica disponível para a questão atual.
 */
function revelarDica() {
  const d = App.q[App.i];
  if (App.hintsShown >= d.hints.length) return;
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
    PERSISTENCIA.salvar(App.store);
    return "Resposta correta! +" + g + " XP.";
  }

  AUDIO.playSound("no", App.store);
  App.streak = 0;
  App.revisar.push(topicoQuestao(d));
  App.store.deck = JogoCore.adicionarAoLeitner(App.store.deck, d, QINDEX);
  PERSISTENCIA.registrarEstudo(App.store, { questionsAnswered: 1, studyTimeMinutes: 1 });
  PERSISTENCIA.salvar(App.store);
  return "Resposta incorreta. Questão adicionada ao Leitner.";
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
 * Renderiza o bloco de feedback (tag, explicação, whyNots, conceito).
 * @param {Object} d - Objeto da questão.
 * @param {boolean} certo - Se a resposta está correta.
 * @param {string} key - Chave selecionada.
 * @param {boolean} usouDica - Se o jogador revelou alguma dica.
 */
function renderizarFeedback(d, certo, key, usouDica) {
  const fb = document.getElementById("fb");
  fb.className = "fb " + (certo ? "ok" : "no");
  fb.innerHTML = "";

  const tag = certo
    ? "✓ Mandou bem!" +
      (App.streak >= 3 ? " 🔥 sequência de " + App.streak : "") +
      (usouDica ? "" : " (+2 sem dica)")
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

  if (App.modoJogo === "pet") {
    msg += atualizarModoPet(certo);
  } else if (App.modoJogo === "survival") {
    msg += atualizarModoSurvival(certo);
  } else if (App.modoJogo === "simulado") {
    msg += atualizarModoSimulado(certo);
  }

  ACESSIBILIDADE.announce(msg);
  renderizarFeedback(d, certo, key, usouDica);

  const last = ehUltimaQuestao();
  criarBotaoProximo(last);

  if (App.modoJogo === "fases" || App.modoJogo === "simulado") setProgress(App.i + 1, App.q.length);
}

// ---------- UTILITÁRIOS ----------

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

// ---------- RESUMOS DE FIM DE JOGO ----------

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
  App.store.phaseStats[App.fase.id] = {
    completed: true,
    bestPercent: Math.max(prev.bestPercent || 0, percent)
  };
  PERSISTENCIA.salvar(App.store);

  const gabaritou = App.acertos === total;
  if (gabaritou) {
    dispararConfete();
    const prev = App.store.phaseStats[App.fase.id] || {};
    if (prev.bestPercent !== 100) comemorarConquista("fase_perfeita");
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
    ${revUniq.length ? `<p style="font-weight:700;margin-bottom:2px">📒 Foi pro Leitner pra revisar:</p><ul class="rev">${revUniq.map((r) => `<li>${escaparHtml(r)}</li>`).join("")}</ul>` : `<div class="dica">Nada novo pra revisar nesta fase. Mandou bem demais. ☕</div>`}
    ${due ? `<button class="cta lt" data-action="revisar0">📒 Revisar agora (${due})</button>` : ""}
    <button class="cta ghost" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(total, total);
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Fase concluída: " + App.acertos + " de " + total + " acertos, " + App.xp + " XP."
  );
}

/**
 * Renderiza o resumo do modo Salvar o Pet (vitória ou derrota).
 */
function resumoPet() {
  app.className = "card pop";
  const win = App.petEstado.status === "salvo";
  if (win) AUDIO.playSound("fanfare", App.store);
  else AUDIO.playSound("no", App.store);

  app.innerHTML = `
    <span class="who pet">${App.petSelecionado.emoji} Missão Salvar o Pet</span>
    <h1>${win ? `Você salvou ${App.petSelecionado.word}! <span aria-hidden="true">🎉</span>` : `${App.petSelecionado.word} precisou fugir... <span aria-hidden="true">😿</span>`}</h1>
    <div class="petDisplay">
      <span class="petIcon ${win ? "petHappy" : "petSad"}" aria-hidden="true">${App.petSelecionado.emoji}</span>
      <p class="lead" style="margin-top:10px">${win ? `Com ${App.petEstado.acertos} acertos, você provou que domina a AWS e garantiu a alegria do seu companheiro!` : `Você atingiu ${App.petEstado.maxErros} erros. Mas não desanime, revise as questões no Leitner e tente novamente!`}</p>
    </div>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    win
      ? "Missão concluída! Você salvou " + App.petSelecionado.word + "."
      : "Fim da missão. " + App.petSelecionado.word + " precisou fugir."
  );
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
      <div><b>${App.survivalEstado.acertosConsecutivos}</b><span>acertos consecutivos</span></div>
      <div><b>${App.store.stats.maxStreak}</b><span>maior sequência</span></div>
    </div>
    <p class="lead">${completo ? "Respondeu todas as questões disponíveis sem perder todas as vidas. Excelente resiliência!" : "Você perdeu suas 3 vidas. Cada erro é uma excelente oportunidade para aprender e fixar!"}</p>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
  ACESSIBILIDADE.focarTitulo(app);
  ACESSIBILIDADE.announce(
    "Rodada finalizada: " + App.survivalEstado.acertosConsecutivos + " acertos consecutivos."
  );
}

// ---------- REVISÃO LEITNER ----------

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
  PERSISTENCIA.salvar(App.store);

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

// ---------- SOBRE O AUTOR ----------

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
      <div style="margin-top:6px">Porque o conhecimento agora é seu. Se você responder assim, minha missão está completa.</div>
    </div>
    <button class="cta" data-action="intro">Bora estudar → [Esc]</button>`;
  setProgress(0, 1);
  ACESSIBILIDADE.focarTitulo(app);
  if (App.iniciado) ACESSIBILIDADE.announce("Sobre o autor.");
}

// ---------- EXPORTAÇÃO UMD ----------
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    escaparHtml,
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
}
if (typeof window !== "undefined") {
  window.RENDERIZADOR = {
    escaparHtml,
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
}
