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

const BANK = (typeof window !== 'undefined' && window.AWS_BANK) || { fases: [] };
const DIFF = { intro: ["base", "badge base"], exam: ["prova", "badge prova"], challenge: ["desafio", "badge desafio"] };

const PETS = [
  { id: 'cat', name: 'Gatinho', emoji: '🐱', word: 'Mimi' },
  { id: 'dog', name: 'Cãozinho', emoji: '🐶', word: 'Bidu' },
  { id: 'capy', name: 'Capivara', emoji: '🦫', word: 'Capi' },
  { id: 'parrot', name: 'Papagaio', emoji: '🦜', word: 'Loro' },
  { id: 'fish', name: 'Peixinho', emoji: '🐟', word: 'Nemo' }
];

const QINDEX = {};
BANK.fases.forEach(f => f.questions.forEach(q => QINDEX[q.id] = { q, faseId: f.id }));

const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
const elXp = typeof document !== 'undefined' ? document.getElementById('xp') : null;
const elBar = typeof document !== 'undefined' ? document.getElementById('bar') : null;
const elHome = typeof document !== 'undefined' ? document.getElementById('home') : null;

/**
 * Exibe ou oculta o botão "Voltar ao início".
 * @param {boolean} b - True para exibir, false para ocultar.
 */
function showHome(b) { elHome.hidden = !b; }

/**
 * Atualiza a barra de progresso e o contador de XP total.
 * @param {number} done - Quantidade de itens concluídos.
 * @param {number} total - Quantidade total de itens.
 */
function setProgress(done, total) {
  elBar.style.width = Math.min(100, ((done || 0) / (total || 1)) * 100) + "%";
  elBar.parentElement.setAttribute('aria-valuenow', Math.round(((done || 0) / (total || 1)) * 100));
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
  return (x.domainLabel ? x.domainLabel + " · " : "") + (x.services && x.services.length ? x.services[0] : (x.sourceChapter ? "cap " + x.sourceChapter : "tópico"));
}

// ---------- HOME SCREEN ----------

/**
 * Renderiza a tela inicial do jogo com dashboard, abas de modo e estatísticas.
 */
function intro() {
  app.className = "card pop"; App.modoRevisao = null; showHome(false);
  const due = devidos().length;
  const totalResponded = App.store.stats.totalAnswered || 0;
  const accuracy = totalResponded > 0 ? Math.round(((App.store.stats.totalCorrect || 0) / totalResponded) * 100) : 0;

  app.innerHTML = `
    <span class="who rafael">Rafael · mentor</span>
    <h1>Bora começar do zero?</h1>
    <p class="lead">Você é a <b>Júlia</b>. Aqui aprendemos a AWS resolvendo problemas reais, sem empáfia e com muito acolhimento. ☕</p>

    <div class="dashGrid">
      <div class="dashItem"><b>${totalResponded}</b><span>questões salvas</span></div>
      <div class="dashItem"><b>${accuracy}%</b><span>taxa de acerto</span></div>
      <div class="dashItem"><b>${due}</b><span>no Leitner 📒</span></div>
    </div>

    <div class="modeTabs">
      <button class="tabBtn ${App.modoJogo==='fases'?'active':''}" data-action="set-modo" data-modo="fases">📚 Fases (${BANK.fases.length})</button>
      <button class="tabBtn ${App.modoJogo==='pet'?'active':''}" data-action="set-modo" data-modo="pet">🐱 Salvar o Pet</button>
      <button class="tabBtn ${App.modoJogo==='survival'?'active':''}" data-action="set-modo" data-modo="survival">⚡ Sobrevivência</button>
      <button class="tabBtn ${App.modoJogo==='leitner'?'active':''}" data-action="set-modo" data-modo="leitner">📒 Leitner (${due})</button>
    </div>

    <div id="modoContent"></div>

    <button class="cta ghost" style="margin-top:14px" data-action="sobre">Quem é 人間/人间 (nin-guem)?</button>`;

  renderModoContent();
  setProgress(0, 1);
}

/**
 * Define o modo de jogo ativo e re-renderiza a tela inicial.
 * @param {string} m - Identificador do modo ('fases', 'pet', 'survival', 'leitner').
 */
function setModo(m) {
  App.modoJogo = m;
  intro();
}

/**
 * Renderiza o conteúdo da aba de modo ativa (fases, pet, survival ou leitner).
 */
function renderModoContent() {
  const container = document.getElementById('modoContent');
  if (!container) return;

  if (App.modoJogo === 'fases') {
    renderFasesList(container);
  } else if (App.modoJogo === 'pet') {
    renderPetSelector(container);
  } else if (App.modoJogo === 'survival') {
    renderSurvivalIntro(container);
  } else if (App.modoJogo === 'leitner') {
    renderLeitnerOverview(container);
  }
}

// ---------- LISTA E BUSCA DE FASES ----------

/**
 * Renderiza a lista de fases com busca e filtros por categoria.
 * @param {HTMLElement} container - Container DOM onde a lista será inserida.
 */
function renderFasesList(container) {
  const categories = [
    { id: 'todas', label: 'Todas' },
    { id: 'fundamentos', label: 'Fundamentos' },
    { id: 'computacao', label: 'Computação & Rede' },
    { id: 'seguranca', label: 'Segurança & IAM' },
    { id: 'dados', label: 'Dados & S3' },
    { id: 'simulados', label: 'Simulados' }
  ];

  let html = `
    <div class="searchWrap">
      <input type="search" class="searchInput" id="faseSearch" placeholder="🔍 Buscar por assunto ou serviço (ex: EC2, S3, IAM, VPC)..." value="${App.searchFilter}" data-action-input="search" />
    </div>
    <div class="filterChips">
      ${categories.map(c => `<button class="chip ${App.categoryFilter===c.id?'active':''}" data-action="set-category" data-category="${c.id}">${c.label}</button>`).join('')}
    </div>
    <div class="faseGrid" id="faseGrid"></div>`;

  container.innerHTML = html;

  var searchInput = document.getElementById('faseSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
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
 * @param {string} cat - Identificador da categoria.
 */
function setCategoryFilter(cat) {
  App.categoryFilter = cat;
  renderFasesList(document.getElementById('modoContent'));
}

/**
 * Atualiza a grade de fases conforme filtros de busca e categoria.
 */
function updateFaseGrid() {
  const grid = document.getElementById('faseGrid');
  if (!grid) return;

  const filtered = BANK.fases.map((f, idx) => ({ f, idx })).filter(({ f }) => {
    const cat = JogoCore.obterCategoriaFase(f.titulo);
    const matchesCat = (App.categoryFilter === 'todas' || App.categoryFilter === cat);
    const matchesSearch = !App.searchFilter || f.titulo.toLowerCase().includes(App.searchFilter) || f.questions.some(q => q.stem.toLowerCase().includes(App.searchFilter) || (q.services && q.services.some(s => s.toLowerCase().includes(App.searchFilter))));
    return matchesCat && matchesSearch;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="dica">Nenhuma fase encontrada para "${App.searchFilter}". Tente outro termo de busca.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(({ f, idx }) => {
    const st = App.store.phaseStats[f.id];
    let badgeHtml = "";
    if (st) {
      if (st.bestPercent === 100) badgeHtml = `<span class="faseBadge star">★ 100%</span>`;
      else badgeHtml = `<span class="faseBadge done">✓ ${st.bestPercent}%</span>`;
    }
    return `
      <button class="faseBtn" data-action="start-fase" data-idx="${idx}">
        <div>
          ${f.titulo}
          <small>${f.questions.length} desafios • [Atalhos 1-4 no jogo]</small>
        </div>
        ${badgeHtml}
      </button>`;
  }).join('');
}

// ---------- MODO: SALVAR O PET ----------

/**
 * Renderiza o seletor de pet e o botão de início da missão.
 * @param {HTMLElement} container - Container DOM.
 */
function renderPetSelector(container) {
  container.innerHTML = `
    <div class="situacao">📌 <b>Missão Salvar o Pet</b>: Escolha seu companheiro de estudo. Acerte <b>20 questões</b> do banco para resgatá-lo! Errar 3 vezes faz o pet fugir.</div>
    <p class="conceito">Escolha o seu companheiro:</p>
    <div class="petGrid">
      ${PETS.map(p => `
        <button class="petCard ${App.petSelecionado.id===p.id?'selected':''}" data-action="select-pet" data-pet="${p.id}">
          <span class="emoji">${p.emoji}</span>
          <span class="pname">${p.name}</span>
        </button>
      `).join('')}
    </div>
    <button class="cta" data-action="start-pet">Iniciar Missão (${App.petSelecionado.emoji} ${App.petSelecionado.word}) →</button>`;
}

/**
 * Seleciona um pet pelo ID e re-renderiza o seletor.
 * @param {string} id - Identificador do pet.
 */
function selectPet(id) {
  App.petSelecionado = PETS.find(p => p.id === id) || PETS[0];
  renderPetSelector(document.getElementById('modoContent'));
}

/**
 * Inicia o modo Salvar o Pet, criando o estado via domínio e embaralhando questões.
 */
function startPetMode() {
  App.modoJogo = 'pet';
  App.petEstado = JogoCore.criarEstadoPet(App.petSelecionado, 20, 3);
  let allQs = [];
  BANK.fases.forEach(f => allQs = allQs.concat(f.questions));
  App.q = JogoCore.embaralharArray(allQs.slice());
  App.i = 0; App.xp = 0; App.streak = 0; App.acertos = 0; App.respondida = false;
  mostraPetPergunta();
}

/**
 * Renderiza a tela de pergunta no modo Salvar o Pet.
 */
function mostraPetPergunta() {
  App.respondida = false; App.hintsShown = 0; showHome(true);
  const d = App.q[App.i];
  app.className = "card pop";

  const petIconClass = App.petEstado.status === 'em_andamento' ? 'petBounce' : '';

  app.innerHTML = `
    <span class="badge box">Acertos: ${App.petEstado.acertos}/${App.petEstado.metaAcertos} · Erros: ${App.petEstado.erros}/${App.petEstado.maxErros}</span>
    <span class="who pet">${App.petSelecionado.emoji} Salvar o ${App.petSelecionado.name} (${App.petSelecionado.word})</span>

    <div class="petDisplay">
      <span class="petIcon ${petIconClass}" id="petAvatar">${App.petSelecionado.emoji}</span>
      <div style="margin-top:6px; font-weight:700; font-size:.9rem; color:var(--cafe2)" id="petStatusText">
        "${App.petSelecionado.word} está torcendo por você! Faltam ${App.petEstado.metaAcertos - App.petEstado.acertos} acertos."
      </div>
    </div>

    ${d.situacao ? `<div class="situacao">📌 ${d.situacao}</div>` : ""}
    <div class="perg">${d.stem}</div>
    <div id="dicaArea"></div>
    <div class="opts" id="opts"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.petEstado.acertos, App.petEstado.metaAcertos);
}

// ---------- MODO: SOBREVIVÊNCIA ----------

/**
 * Renderiza a tela introdutória do modo Sobrevivência.
 * @param {HTMLElement} container - Container DOM.
 */
function renderSurvivalIntro(container) {
  container.innerHTML = `
    <div class="situacao">📌 <b>Modo Sobrevivência</b>: O teste definitivo! Responda o máximo de questões que conseguir. Você tem <b>3 vidas (❤️❤️❤️)</b>. A rodada termina quando perder todas as vidas.</div>
    <button class="cta" data-action="start-survival">Iniciar Sobrevivência ⚡ →</button>`;
}

/**
 * Inicia o modo Sobrevivência, criando o estado via domínio e embaralhando questões.
 */
function startSurvivalMode() {
  App.modoJogo = 'survival';
  App.survivalEstado = JogoCore.criarEstadoSobrevivencia(3);
  let allQs = [];
  BANK.fases.forEach(f => allQs = allQs.concat(f.questions));
  App.q = JogoCore.embaralharArray(allQs.slice());
  App.i = 0; App.xp = 0; App.streak = 0; App.acertos = 0; App.respondida = false;
  mostraSurvivalPergunta();
}

/**
 * Renderiza a tela de pergunta no modo Sobrevivência.
 */
function mostraSurvivalPergunta() {
  App.respondida = false; App.hintsShown = 0; showHome(true);
  const d = App.q[App.i];
  app.className = "card pop";
  const vidas = "❤️".repeat(App.survivalEstado.maxErros - App.survivalEstado.erros) + "🖤".repeat(App.survivalEstado.erros);

  app.innerHTML = `
    <span class="badge desafio">${vidas}</span>
    <span class="who">⚡ Sobrevivência · Questão ${App.i + 1}</span>
    ${d.situacao ? `<div class="situacao">📌 ${d.situacao}</div>` : ""}
    <div class="perg">${d.stem}</div>
    <div id="dicaArea"></div>
    <div class="opts" id="opts"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.survivalEstado.acertosConsecutivos, App.survivalEstado.acertosConsecutivos + 5);
}

// ---------- MODO: VISÃO GERAL LEITNER ----------

/**
 * Renderiza a visão geral do baralho Leitner com contagem por caixa.
 * @param {HTMLElement} container - Container DOM.
 */
function renderLeitnerOverview(container) {
  const due = devidos().length;
  const boxes = [1,2,3,4,5].map(b => Object.values(App.store.deck).filter(c => c.box === b).length);

  container.innerHTML = `
    <div class="ltBox">
      <div class="n">${due}</div>
      <div class="t">${due ? "cartão(ões) pronto(s) para revisar hoje 📒. A repetição espaçada ajuda na fixação de longo prazo." : "Nenhum cartão pendente agora. Erre questões nos treinos para adicioná-las ao Leitner."}</div>
    </div>

    <div class="stat" style="margin-top:14px">
      <div><b>${boxes[0]}</b><span>Caixa 1 (1 dia)</span></div>
      <div><b>${boxes[1]}</b><span>Caixa 2 (3 dias)</span></div>
      <div><b>${boxes[2]}</b><span>Caixa 3 (7 dias)</span></div>
      <div><b>${boxes[3]}</b><span>Caixa 4 (14 dias)</span></div>
      <div><b>${boxes[4]}</b><span>Caixa 5 (Dominado)</span></div>
    </div>

    <button class="cta lt" data-action="revisar0" ${due?"":"disabled"}>📒 Iniciar Revisão (${due})</button>`;
}

// ---------- AUXILIARES DE RENDERIZAÇÃO DE QUESTÕES ----------

/**
 * Renderiza as opções de resposta e o botão de dica para uma questão.
 * @param {Object} d - Objeto da questão.
 */
function renderOptionsAndHints(d) {
  const dicaArea = document.getElementById('dicaArea');
  if (d.hints && d.hints.length) {
    const b = document.createElement('button');
    b.className = "dicaBtn"; b.id = "dicaBtn"; b.textContent = "💡 Ver dica do Rafael [Tecla D]";
    b.onclick = function () { revelarDica(); }; dicaArea.appendChild(b);
  }
  const opts = document.getElementById('opts');
  d.options.forEach(function (o, idx) {
    const b = document.createElement('button');
    b.className = "opt"; b.dataset.k = o.key;
    const numBadge = idx < 4 ? `<span class="keyBadge">[${idx+1}]</span>` : '';
    b.innerHTML = `<div><span class="optKeyGroup">${numBadge}<span class="k">${o.key}</span></span>${o.text}</div>`;
    b.onclick = function () { responde(o.key, b); }; opts.appendChild(b);
  });
}

// ---------- JOGAR FASE PADRÃO ----------

/**
 * Inicia uma fase padrão pelo índice do banco.
 * @param {number} idx - Índice da fase no banco.
 */
function startFase(idx) {
  App.modoJogo = 'fases';
  App.fase = BANK.fases[idx]; App.q = App.fase.questions.slice();
  App.i = 0; App.xp = 0; App.streak = 0; App.acertos = 0; App.revisar = []; App.respondida = false; mostra();
}

/**
 * Renderiza a tela de pergunta da fase padrão.
 */
function mostra() {
  App.respondida = false; App.hintsShown = 0; showHome(true);
  const d = App.q[App.i]; const [dlabel, dcls] = DIFF[d.difficulty] || ["", ""];
  app.className = "card pop";
  app.innerHTML = `
    ${dcls ? `<span class="${dcls}">${dlabel}</span>` : ""}
    <span class="who camila">Camila · situação real</span>
    ${d.situacao ? `<div class="situacao">📌 ${d.situacao}</div>` : ""}
    <div class="perg">${d.stem}</div>
    <div id="dicaArea"></div>
    <div class="opts" id="opts"></div>
    <div id="fb"></div>`;

  renderOptionsAndHints(d);
  setProgress(App.i, App.q.length);
}

/**
 * Revela a próxima dica disponível para a questão atual.
 */
function revelarDica() {
  const d = App.q[App.i]; if (App.hintsShown >= d.hints.length) return;
  const area = document.getElementById('dicaArea'); const btn = document.getElementById('dicaBtn');
  const div = document.createElement('div'); div.className = "dica"; div.innerHTML = d.hints[App.hintsShown];
  area.insertBefore(div, btn); App.hintsShown++;
  if (App.hintsShown >= d.hints.length) { btn.disabled = true; btn.textContent = "✓ Sem mais dicas"; }
  else { btn.textContent = `💡 Ver outra dica (${App.hintsShown + 1}/${d.hints.length}) [D]`; }
  ACESSIBILIDADE.announce("Dica revelada: " + d.hints[App.hintsShown - 1]);
}

/**
 * Processa a resposta do jogador para a questão atual.
 * Delega cálculo de XP ao JogoCore e atualiza estados dos modos Pet/Sobrevivência via domínio.
 * @param {string} key - Chave da opção selecionada (A, B, C, D).
 * @param {HTMLElement} btn - Botão da opção clicada.
 */
function responde(key, btn) {
  if (App.respondida) return; App.respondida = true;
  const d = App.q[App.i]; const certo = d.answers.includes(key);

  App.store.stats.totalAnswered = (App.store.stats.totalAnswered || 0) + 1;
  if (certo) App.store.stats.totalCorrect = (App.store.stats.totalCorrect || 0) + 1;

  document.querySelectorAll('#opts .opt').forEach(function (b) {
    b.disabled = true;
    if (d.answers.includes(b.dataset.k)) b.classList.add('ok');
    if (b.dataset.k === key && !certo) b.classList.add('no');
  });

  const usouDica = App.hintsShown > 0;
  const db = document.getElementById('dicaBtn'); if (db) db.disabled = true;

  if (certo) {
    AUDIO.playSound('ok', App.store);
    App.acertos++; App.streak++;
    if (App.streak > (App.store.stats.maxStreak || 0)) App.store.stats.maxStreak = App.streak;
    const g = JogoCore.calcularGanhoXP(true, App.streak, usouDica);
    App.xp += g; App.store.xpTotal = (App.store.xpTotal || 0) + g; PERSISTENCIA.salvar(App.store);
    ACESSIBILIDADE.announce("Resposta correta!");
  } else {
    AUDIO.playSound('no', App.store);
    App.streak = 0; App.revisar.push(topicoQuestao(d));
    App.store.deck = JogoCore.adicionarAoLeitner(App.store.deck, d, QINDEX);
    PERSISTENCIA.salvar(App.store);
    ACESSIBILIDADE.announce("Resposta incorreta.");
  }

  if (App.modoJogo === 'pet') {
    App.petEstado = JogoCore.processarRespostaPet(App.petEstado, certo);
    const avatar = document.getElementById('petAvatar');
    const stText = document.getElementById('petStatusText');
    if (certo) {
      if (avatar) avatar.className = "petIcon petHappy";
      if (stText) stText.innerHTML = `<b>${App.petSelecionado.word} adorou!</b> 🎉 Resposta certíssima!`;
    } else {
      if (avatar) avatar.className = "petIcon petSad";
      if (stText) stText.innerHTML = `<b>Ops!</b> ${App.petSelecionado.word} ficou apreensivo. Erros: ${App.petEstado.erros}/${App.petEstado.maxErros}`;
    }
  } else if (App.modoJogo === 'survival') {
    App.survivalEstado = JogoCore.processarRespostaSobrevivencia(App.survivalEstado, certo);
  }

  const fb = document.getElementById('fb');
  fb.className = "fb " + (certo ? "ok" : "no");
  const tag = certo ? ("✓ Mandou bem!" + (App.streak >= 3 ? " 🔥 sequência de " + App.streak : "") + (usouDica ? "" : " (+2 sem dica)"))
    : "✕ Quase — bora entender, sem estresse";
  const pqNao = (!certo && d.whyNots && d.whyNots[key]) ? `<div class="pq"><b>Por que essa não:</b> ${d.whyNots[key]}</div>` : "";

  fb.innerHTML = `<span class="tag">${tag}</span>${d.explanation || ""}${pqNao}
    <div class="conceito">${certo ? "" : "📒 Adicionado ao Leitner — volta pra você revisar e fixar."}</div>`;

  const last = (App.modoJogo === 'fases' && App.i === App.q.length - 1) || (App.modoJogo === 'pet' && App.petEstado.status !== 'em_andamento') || (App.modoJogo === 'survival' && App.survivalEstado.status === 'derrota');

  const cta = document.createElement('button'); cta.className = "cta";
  cta.textContent = last ? "Ver resultado [Enter] →" : "Próximo desafio [Enter] →";
  cta.onclick = function () {
    App.i++;
    if (App.modoJogo === 'pet') {
      if (App.petEstado.status !== 'em_andamento') resumoPet();
      else mostraPetPergunta();
    } else if (App.modoJogo === 'survival') {
      if (App.survivalEstado.status === 'derrota') resumoSurvival();
      else mostraSurvivalPergunta();
    } else {
      if (last) resumo();
      else mostra();
    }
  };
  fb.appendChild(cta);

  if (App.modoJogo === 'fases') setProgress(App.i + 1, App.q.length);
}

// ---------- RESUMOS DE FIM DE JOGO ----------

/**
 * Renderiza o resumo de fim de fase padrão com estatísticas e lista de revisão.
 */
function resumo() {
  AUDIO.playSound('fanfare', App.store);
  app.className = "card pop";
  const total = App.q.length; const revUniq = [...new Set(App.revisar)]; const due = devidos().length;

  const percent = Math.round((App.acertos / total) * 100);
  const prev = App.store.phaseStats[App.fase.id] || { bestPercent: 0 };
  App.store.phaseStats[App.fase.id] = {
    completed: true,
    bestPercent: Math.max(prev.bestPercent || 0, percent)
  };
  PERSISTENCIA.salvar(App.store);

  app.innerHTML = `
    <span class="who rafael">Rafael · mentor</span>
    <h1>${App.fase.titulo} — fechada! 🎉</h1>
    <p class="lead">${App.acertos === total ? "Gabaritou — e mais importante: entendeu o porquê." : "O que importa não é acertar tudo de primeira, é fechar os buracos. Você já está mais perto."}</p>
    <div class="stat">
      <div><b>${App.acertos}/${total}</b><span>acertos</span></div>
      <div><b>${App.xp}</b><span>XP na fase</span></div>
      <div><b>${due}</b><span>no Leitner 📒</span></div>
    </div>
    ${revUniq.length ? `<p style="font-weight:700;margin-bottom:2px">📒 Foi pro Leitner pra revisar:</p><ul class="rev">${revUniq.map(r => `<li>${r}</li>`).join("")}</ul>` : `<div class="dica">Nada novo pra revisar nesta fase. Mandou bem demais. ☕</div>`}
    ${due ? `<button class="cta lt" data-action="revisar0">📒 Revisar agora (${due})</button>` : ""}
    <button class="cta ghost" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(total, total);
}

/**
 * Renderiza o resumo do modo Salvar o Pet (vitória ou derrota).
 */
function resumoPet() {
  app.className = "card pop";
  const win = App.petEstado.status === 'salvo';
  if (win) AUDIO.playSound('fanfare', App.store); else AUDIO.playSound('no', App.store);

  app.innerHTML = `
    <span class="who pet">${App.petSelecionado.emoji} Missão Salvar o Pet</span>
    <h1>${win ? `Você salvou ${App.petSelecionado.word}! 🎉` : `${App.petSelecionado.word} precisou fugir... 😿`}</h1>
    <div class="petDisplay">
      <span class="petIcon ${win?'petHappy':'petSad'}">${App.petSelecionado.emoji}</span>
      <p class="lead" style="margin-top:10px">${win ? `Com ${App.petEstado.acertos} acertos, você provou que domina a AWS e garantiu a alegria do seu companheiro!` : `Você atingiu ${App.petEstado.maxErros} erros. Mas não desanime, revise as questões no Leitner e tente novamente!`}</p>
    </div>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
}

/**
 * Renderiza o resumo do modo Sobrevivência (fim de rodada).
 */
function resumoSurvival() {
  AUDIO.playSound('no', App.store);
  app.className = "card pop";
  app.innerHTML = `
    <span class="who">⚡ Fim da Sobrevivência</span>
    <h1>Rodada Finalizada!</h1>
    <div class="stat">
      <div><b>${App.survivalEstado.acertosConsecutivos}</b><span>acertos consecutivos</span></div>
      <div><b>${App.store.stats.maxStreak}</b><span>maior sequência</span></div>
    </div>
    <p class="lead">Você perdeu suas 3 vidas. Cada erro é uma excelente oportunidade para aprender e fixar!</p>
    <button class="cta" data-action="intro">Voltar ao início [Esc]</button>`;
}

// ---------- REVISÃO LEITNER ----------

/**
 * Inicia a revisão Leitner com os cartões devidos, ordenados por caixa e data.
 */
function revisar0() {
  const cards = devidos();
  if (!cards.length) { intro(); return; }
  cards.sort((a, b) => (a.box - b.box) || (a.due - b.due));
  App.modoRevisao = { cards, idx: 0, acertosRev: 0, revelado: false };
  mostraCartao();
}

/**
 * Renderiza a tela de um cartão de revisão Leitner.
 */
function mostraCartao() {
  const m = App.modoRevisao; const c = m.cards[m.idx]; m.revelado = false; showHome(true);
  app.className = "card pop";
  app.innerHTML = `
    <span class="badge box">caixa ${c.box}/5</span>
    <span class="who leitner">📒 Revisão (Leitner)</span>
    ${c.situacao ? `<div class="situacao">📌 ${c.situacao}</div>` : ""}
    <div class="perg">${c.stem}</div>
    <div id="resparea"></div>
    <button class="cta lt" id="mostrarBtn" data-action="revela-resp">Mostrar resposta [Espaço / Enter]</button>
    <p class="conceito">Cartão ${m.idx + 1} de ${m.cards.length} · revise sozinho e seja honesto</p>`;
  setProgress(m.idx, m.cards.length);
}

/**
 * Revela a resposta do cartão Leitner atual e exibe botões de autoavaliação.
 */
function revelaResp() {
  const m = App.modoRevisao; const c = m.cards[m.idx]; m.revelado = true;
  document.getElementById('resparea').innerHTML =
    `<div class="resp"><span class="ok">✓ ${c.correta}</span><div style="margin-top:6px">${c.porque}</div></div>`;
  document.getElementById('mostrarBtn').outerHTML =
    `<div class="row2">
       <button class="cta" style="background:var(--vermelho)" data-action="avalia" data-acertou="false">Ainda erro [Tecla 1]</button>
       <button class="cta" style="background:var(--verde)" data-action="avalia" data-acertou="true">Acertei 👍 [Tecla 2]</button>
     </div>`;
}

/**
 * Avalia o cartão Leitner atual como acerto ou erro e avança para o próximo.
 * @param {boolean} acertou - Se o usuário acertou a questão.
 */
function avalia(acertou) {
  const m = App.modoRevisao; const c = m.cards[m.idx];
  if (acertou) { AUDIO.playSound('ok', App.store); m.acertosRev++; }
  else { AUDIO.playSound('no', App.store); }

  const atualizado = JogoCore.calcularAgendamentoLeitner(c, acertou);
  Object.assign(c, atualizado);
  if (c.box >= 5) { delete App.store.deck[c.id]; }
  PERSISTENCIA.salvar(App.store);

  m.idx++;
  if (m.idx >= m.cards.length) resumoRevisao();
  else mostraCartao();
}

/**
 * Renderiza o resumo final da revisão Leitner.
 */
function resumoRevisao() {
  AUDIO.playSound('fanfare', App.store);
  const m = App.modoRevisao; const total = m.cards.length; const due = devidos().length;
  app.className = "card pop";
  app.innerHTML = `
    <span class="who leitner">📒 Revisão (Leitner)</span>
    <h1>Revisão feita! ✅</h1>
    <p class="lead">${m.acertosRev === total ? "Você dominou os cartões de hoje. Repetição espaçada funcionando." : "Os que você ainda errou voltam logo; os que acertou voltam mais para a frente. É assim que fixa."}</p>
    <div class="stat">
      <div><b>${m.acertosRev}/${total}</b><span>acertos na revisão</span></div>
      <div><b>${due}</b><span>ainda pendentes</span></div>
    </div>
    ${due ? `<button class="cta lt" data-action="revisar0">Continuar revisando (${due})</button>` : `<div class="dica">Tudo revisado por agora. Os cartões voltam no tempo certo. ☕</div>`}
    <button class="cta ghost" data-action="intro">Voltar ao início [Esc]</button>`;
  setProgress(total, total); App.modoRevisao = null;
}

// ---------- SOBRE O AUTOR ----------

/**
 * Renderiza a tela "Sobre o autor".
 */
function sobre() {
  app.className = "card pop"; showHome(true);
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
}

// ---------- EXPORTAÇÃO UMD ----------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    intro, setModo, renderModoContent, renderFasesList, onSearchInput, setCategoryFilter,
    updateFaseGrid, renderPetSelector, selectPet, startPetMode, mostraPetPergunta,
    renderSurvivalIntro, startSurvivalMode, mostraSurvivalPergunta, renderLeitnerOverview,
    renderOptionsAndHints, startFase, mostra, revelarDica, responde,
    resumo, resumoPet, resumoSurvival, revisar0, mostraCartao, revelaResp, avalia,
    resumoRevisao, sobre, showHome, setProgress,
    BANK, PETS, QINDEX
  };
}
if (typeof window !== 'undefined') {
  window.RENDERIZADOR = {
    intro, setModo, renderModoContent, renderFasesList, onSearchInput, setCategoryFilter,
    updateFaseGrid, renderPetSelector, selectPet, startPetMode, mostraPetPergunta,
    renderSurvivalIntro, startSurvivalMode, mostraSurvivalPergunta, renderLeitnerOverview,
    renderOptionsAndHints, startFase, mostra, revelarDica, responde,
    resumo, resumoPet, resumoSurvival, revisar0, mostraCartao, revelaResp, avalia,
    resumoRevisao, sobre, showHome, setProgress,
    BANK, PETS, QINDEX
  };
}
