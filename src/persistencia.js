/**
 * Módulo de persistência local (localStorage) do jogo.
 *
 * Gerencia o carregamento e salvamento do estado persistente do jogador,
 * incluindo baralho Leitner, XP total, preferências de tema/áudio/fonte,
 * estatísticas por fase, estatísticas globais, streak de estudo e logs diários.
 */

const LS_KEY = "bora_aws_v2";
const SHA =
  (typeof module !== "undefined" && module.exports && typeof require === "function"
    ? require("./sha256.js")
    : null) || (typeof window !== "undefined" ? window.SHA256 : null);

const ESTADO_PADRAO = {
  deck: {},
  xpTotal: 0,
  theme: "auto",
  muted: false,
  fontScale: 1.0,
  phaseStats: {},
  stats: { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 },
  lastActiveDate: null,
  streakDays: 0,
  studyLogs: {},
  examHistory: [],
  hasSeenWelcome: false,
  petsSalvos: 0
};

function numeroOuPadrao(valor, padrao) {
  return Number.isFinite(valor) ? valor : padrao;
}

function booleanoOuPadrao(valor, padrao) {
  return typeof valor === "boolean" ? valor : padrao;
}

function stringOuPadrao(valor, padrao) {
  return typeof valor === "string" ? valor : padrao;
}

function objetoOuPadrao(valor, padrao) {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : padrao;
}

function normalizarInteiroPositivo(valor, padrao, maximo = Number.MAX_SAFE_INTEGER) {
  const numero = Math.trunc(Number(valor));
  if (!Number.isFinite(numero) || numero < 0) return padrao;
  return Math.min(numero, maximo);
}

function normalizarString(valor, padrao) {
  return typeof valor === "string" ? valor : padrao;
}

function normalizarCartao(id, cartao) {
  if (typeof id !== "string" || !id) return null;
  if (!cartao || typeof cartao !== "object" || Array.isArray(cartao)) return null;
  const caixa = normalizarInteiroPositivo(cartao.box, 1, 5);
  return {
    id: id,
    faseId: normalizarString(cartao.faseId, null),
    box: caixa === 0 ? 1 : caixa,
    due: Number.isFinite(cartao.due) ? Math.max(0, cartao.due) : 0,
    situacao: normalizarString(cartao.situacao, ""),
    stem: normalizarString(cartao.stem, ""),
    correta: normalizarString(cartao.correta, ""),
    porque: normalizarString(cartao.porque, ""),
    lapsos: normalizarInteiroPositivo(cartao.lapsos, 0)
  };
}

function normalizarDeck(deck) {
  const limpo = objetoOuPadrao(deck, {});
  const normalizado = {};
  for (const chave of Object.keys(limpo)) {
    if (chave === "__proto__" || chave === "constructor" || chave === "prototype") continue;
    const cartaoNormalizado = normalizarCartao(chave, limpo[chave]);
    if (cartaoNormalizado) normalizado[chave] = cartaoNormalizado;
  }
  return normalizado;
}

function normalizarStats(stats) {
  const s = objetoOuPadrao(stats, ESTADO_PADRAO.stats);
  const totalAnswered = Math.max(0, numeroOuPadrao(s.totalAnswered, 0));
  const totalCorrect = Math.max(0, numeroOuPadrao(s.totalCorrect, 0));
  return {
    totalAnswered,
    totalCorrect: Math.min(totalCorrect, totalAnswered),
    maxStreak: Math.max(0, numeroOuPadrao(s.maxStreak, 0))
  };
}

function normalizarPhaseStats(phaseStats) {
  const limpo = objetoOuPadrao(phaseStats, {});
  const normalizado = {};
  for (const chave of Object.keys(limpo)) {
    if (chave === "__proto__" || chave === "constructor" || chave === "prototype") continue;
    const valor = limpo[chave];
    if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      const bestPercent = Math.max(0, Math.min(100, numeroOuPadrao(valor.bestPercent, 0)));
      normalizado[chave] = {
        completed: booleanoOuPadrao(valor.completed, false),
        bestPercent
      };
    }
  }
  return normalizado;
}

function normalizarExamHistory(examHistory) {
  const limpo = Array.isArray(examHistory) ? examHistory : [];
  return limpo
    .filter((exame) => exame && typeof exame === "object" && !Array.isArray(exame))
    .map((exame) => ({
      date: stringOuPadrao(exame.date, null),
      acertos: normalizarInteiroPositivo(exame.acertos, 0),
      total: normalizarInteiroPositivo(exame.total, 65),
      score: normalizarInteiroPositivo(exame.score, 0),
      tempoMinutos: normalizarInteiroPositivo(exame.tempoMinutos, 0)
    }))
    .filter((exame) => exame.date && /^\d{4}-\d{2}-\d{2}$/.test(exame.date))
    .slice(0, 100);
}

function normalizarStudyLogs(studyLogs) {
  const limpo = objetoOuPadrao(studyLogs, {});
  const normalizado = {};
  for (const chave of Object.keys(limpo)) {
    if (chave === "__proto__" || chave === "constructor" || chave === "prototype") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(chave)) continue;
    const log = limpo[chave];
    if (!log || typeof log !== "object" || Array.isArray(log)) continue;
    normalizado[chave] = {
      questionsAnswered: normalizarInteiroPositivo(log.questionsAnswered, 0),
      studyTimeMinutes: normalizarInteiroPositivo(log.studyTimeMinutes, 0),
      leitnerReviews: normalizarInteiroPositivo(log.leitnerReviews, 0)
    };
  }
  return normalizado;
}

/**
 * Formata um objeto Date como string local YYYY-MM-DD.
 * @param {Date} d Data a formatar.
 * @returns {string} Data local no formato ISO.
 */
function formatarDataLocal(d) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

/**
 * Retorna a data local de hoje no formato ISO (YYYY-MM-DD).
 * @returns {string}
 */
function dataHojeIso() {
  return formatarDataLocal(new Date());
}

/**
 * Calcula a data de ontem no formato ISO (YYYY-MM-DD).
 * @returns {string}
 */
function dataOntemIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatarDataLocal(d);
}

/**
 * Atualiza o streak e a data da última atividade.
 * @param {Object} store Estado persistente.
 * @returns {Object} Store atualizado.
 */
function atualizarStreak(store) {
  const hoje = dataHojeIso();
  const ultimo = stringOuPadrao(store.lastActiveDate, null);

  if (ultimo === hoje) return store;

  let streak = normalizarInteiroPositivo(store.streakDays, 0);
  if (ultimo === dataOntemIso()) {
    streak += 1;
  } else {
    streak = 1;
  }

  store.lastActiveDate = hoje;
  store.streakDays = streak;
  return store;
}

/**
 * Registra atividade de estudo no log do dia.
 * @param {Object} store Estado persistente.
 * @param {Object} deltas Quantidades a adicionar: { questionsAnswered, studyTimeMinutes, leitnerReviews }.
 * @returns {Object} Store atualizado.
 */
function registrarEstudo(store, deltas = {}) {
  const hoje = dataHojeIso();
  const log = store.studyLogs[hoje] || {
    questionsAnswered: 0,
    studyTimeMinutes: 0,
    leitnerReviews: 0
  };
  store.studyLogs[hoje] = {
    questionsAnswered:
      log.questionsAnswered + normalizarInteiroPositivo(deltas.questionsAnswered || 0, 0),
    studyTimeMinutes:
      log.studyTimeMinutes + normalizarInteiroPositivo(deltas.studyTimeMinutes || 0, 0),
    leitnerReviews: log.leitnerReviews + normalizarInteiroPositivo(deltas.leitnerReviews || 0, 0)
  };
  return atualizarStreak(store);
}

/**
 * Carrega o estado persistente do localStorage.
 * Retorna o estado padrão se nenhum dado for encontrado ou se ocorrer erro.
 * Valida tipos e descarta chaves perigosas para evitar poluição de protótipos.
 * @returns {Object} Estado persistente do jogador.
 */
function carregar() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const tema = stringOuPadrao(parsed.theme, ESTADO_PADRAO.theme);
    const temaValido = ["light", "dark", "auto"].includes(tema) ? tema : ESTADO_PADRAO.theme;
    const escalasPermitidas = [0.85, 1.0, 1.15, 1.3];
    const fonteBruta = numeroOuPadrao(parsed.fontScale, ESTADO_PADRAO.fontScale);
    const fonteValida = escalasPermitidas.includes(fonteBruta)
      ? fonteBruta
      : ESTADO_PADRAO.fontScale;
    const hoje = dataHojeIso();
    const ultimo = stringOuPadrao(parsed.lastActiveDate, null);
    const base = {
      deck: normalizarDeck(parsed.deck),
      xpTotal: Math.max(0, numeroOuPadrao(parsed.xpTotal, 0)),
      theme: temaValido,
      muted: booleanoOuPadrao(parsed.muted, ESTADO_PADRAO.muted),
      fontScale: fonteValida,
      phaseStats: normalizarPhaseStats(parsed.phaseStats),
      stats: normalizarStats(parsed.stats),
      lastActiveDate: ultimo,
      streakDays: normalizarInteiroPositivo(parsed.streakDays, 0),
      studyLogs: normalizarStudyLogs(parsed.studyLogs),
      examHistory: normalizarExamHistory(parsed.examHistory),
      hasSeenWelcome: booleanoOuPadrao(parsed.hasSeenWelcome, ESTADO_PADRAO.hasSeenWelcome),
      petsSalvos: normalizarInteiroPositivo(parsed.petsSalvos, 0)
    };
    // Abrir o app não conta como dia de estudo: o streak só avança via
    // registrarEstudo/registrarExame. No carregamento apenas corrige a
    // exibição — se a última atividade não foi ontem nem hoje, a sequência
    // já foi quebrada e deve aparecer zerada.
    if (ultimo !== null && ultimo !== hoje && ultimo !== dataOntemIso()) {
      base.streakDays = 0;
    }
    return base;
  } catch {
    return JSON.parse(JSON.stringify(ESTADO_PADRAO));
  }
}

/**
 * Salva o estado atual no localStorage.
 * @param {Object} store Referência ao objeto de estado persistente.
 */
function salvar(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    /* quota excedida */
  }
}

/**
 * Serializa um valor com chaves ordenadas, para que o checksum não dependa
 * da ordem em que as chaves foram inseridas no objeto.
 * @param {*} valor Valor a serializar.
 * @returns {string} JSON canônico.
 */
function stringifyCanonico(valor) {
  if (typeof valor === "undefined") return "null";
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor);
  if (Array.isArray(valor)) return "[" + valor.map(stringifyCanonico).join(",") + "]";
  const chaves = Object.keys(valor).sort();
  return (
    "{" +
    chaves.map((chave) => JSON.stringify(chave) + ":" + stringifyCanonico(valor[chave])).join(",") +
    "}"
  );
}

/**
 * Calcula o checksum SHA-256 do estado do jogo.
 * @param {Object} store Estado persistente.
 * @returns {string} Checksum no formato "sha256-<hex>".
 */
function calcularChecksumBackup(store) {
  return "sha256-" + SHA.sha256(stringifyCanonico(store));
}

/**
 * Gera um download JSON do progresso do usuário.
 * @param {Object} store Estado persistente.
 */
function exportarProgressoJSON(store) {
  const conteudo = JSON.stringify(
    { checksum: calcularChecksumBackup(store), data: store },
    null,
    2
  );
  const link = document.createElement("a");
  link.download = "bora-aprender-aws-backup-" + dataHojeIso() + ".json";
  if (typeof URL !== "undefined" && URL.createObjectURL) {
    const blob = new Blob([conteudo], { type: "application/json" });
    link.href = URL.createObjectURL(blob);
  } else {
    // Fallback para navegadores sem Blob URLs.
    link.href = "data:application/json;charset=utf-8," + encodeURIComponent(conteudo);
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (link.href && link.href.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
}

/**
 * Valida e importa um backup JSON. Retorna null se for inválido.
 * @param {string} jsonString Conteúdo do arquivo JSON.
 * @returns {Object|null} Estado importado ou null.
 */
function possuiChavePerigosa(obj) {
  if (!obj || typeof obj !== "object") return false;
  const perigosas = ["__proto__", "constructor", "prototype"];
  return Object.getOwnPropertyNames(obj).some((k) => perigosas.includes(k));
}

function validarEstruturaBackup(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  if (possuiChavePerigosa(parsed)) return false;

  const chavesPermitidas = new Set([
    "deck",
    "xpTotal",
    "theme",
    "muted",
    "fontScale",
    "phaseStats",
    "stats",
    "lastActiveDate",
    "streakDays",
    "studyLogs",
    "examHistory",
    "hasSeenWelcome",
    "petsSalvos"
  ]);
  const chaves = Object.getOwnPropertyNames(parsed);
  if (chaves.length > 30 || chaves.some((k) => !chavesPermitidas.has(k))) return false;

  if (parsed.lastActiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.lastActiveDate)) return false;
  if (parsed.theme && !["light", "dark", "auto"].includes(parsed.theme)) return false;

  if (possuiChavePerigosa(parsed.deck)) return false;
  if (possuiChavePerigosa(parsed.phaseStats)) return false;
  if (possuiChavePerigosa(parsed.stats)) return false;
  if (possuiChavePerigosa(parsed.studyLogs)) return false;

  return true;
}

function importarProgressoJSON(jsonString) {
  try {
    if (typeof jsonString !== "string" || jsonString.length > 2 * 1024 * 1024) return null;
    if (jsonString.includes("__proto__") || jsonString.includes("constructor")) return null;
    const parsed = JSON.parse(jsonString);
    const possuiEnvelope = parsed && typeof parsed === "object" && "data" in parsed;
    const dados = possuiEnvelope ? parsed.data : parsed;
    if (possuiEnvelope) {
      if (parsed.checksum !== calcularChecksumBackup(dados)) return null;
    }
    if (!validarEstruturaBackup(dados)) return null;
    const importado = carregar();
    if (dados.deck) importado.deck = normalizarDeck(dados.deck);
    if (typeof dados.xpTotal === "number") importado.xpTotal = Math.max(0, dados.xpTotal);
    if (dados.theme === "light" || dados.theme === "dark" || dados.theme === "auto")
      importado.theme = dados.theme;
    if (typeof dados.muted === "boolean") importado.muted = dados.muted;
    if ([0.85, 1.0, 1.15, 1.3].includes(dados.fontScale)) importado.fontScale = dados.fontScale;
    if (dados.phaseStats) importado.phaseStats = normalizarPhaseStats(dados.phaseStats);
    if (dados.stats) importado.stats = normalizarStats(dados.stats);
    if (dados.studyLogs) importado.studyLogs = normalizarStudyLogs(dados.studyLogs);
    if (dados.examHistory) importado.examHistory = normalizarExamHistory(dados.examHistory);
    if (typeof dados.hasSeenWelcome === "boolean") importado.hasSeenWelcome = dados.hasSeenWelcome;
    if (typeof dados.petsSalvos === "number")
      importado.petsSalvos = normalizarInteiroPositivo(dados.petsSalvos, 0);
    if (typeof dados.streakDays === "number")
      importado.streakDays = normalizarInteiroPositivo(dados.streakDays, 0);
    if (typeof dados.lastActiveDate === "string") importado.lastActiveDate = dados.lastActiveDate;
    salvar(importado);
    return importado;
  } catch {
    return null;
  }
}

/**
 * Adiciona o resultado de um simulado ao histórico.
 * @param {Object} store Estado persistente.
 * @param {Object} resultado Resultado do simulado: { acertos, total, score, tempoMinutos }.
 * @returns {Object} Store atualizado.
 */
function registrarExame(store, resultado) {
  const registro = {
    date: dataHojeIso(),
    acertos: normalizarInteiroPositivo(resultado.acertos, 0),
    total: normalizarInteiroPositivo(resultado.total, 65),
    score: normalizarInteiroPositivo(resultado.score, 0),
    tempoMinutos: normalizarInteiroPositivo(resultado.tempoMinutos, 0)
  };
  store.examHistory = store.examHistory || [];
  store.examHistory.unshift(registro);
  store.examHistory = normalizarExamHistory(store.examHistory);
  return atualizarStreak(store);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    carregar,
    salvar,
    LS_KEY,
    ESTADO_PADRAO,
    exportarProgressoJSON,
    importarProgressoJSON,
    calcularChecksumBackup,
    registrarEstudo,
    registrarExame,
    atualizarStreak,
    normalizarStudyLogs,
    normalizarExamHistory,
    formatarDataLocal,
    dataHojeIso,
    dataOntemIso
  };
} else if (typeof window !== "undefined") {
  window.PERSISTENCIA = {
    carregar,
    salvar,
    LS_KEY,
    ESTADO_PADRAO,
    exportarProgressoJSON,
    importarProgressoJSON,
    calcularChecksumBackup,
    registrarEstudo,
    registrarExame,
    atualizarStreak,
    formatarDataLocal,
    dataHojeIso,
    dataOntemIso
  };
}
