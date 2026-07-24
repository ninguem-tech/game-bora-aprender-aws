/**
 * Módulo de persistência local (localStorage) do jogo.
 *
 * Gerencia o carregamento e salvamento do estado persistente do jogador,
 * incluindo baralho Leitner, XP total, preferências de tema/áudio/fonte,
 * estatísticas por fase e estatísticas globais.
 */

const LS_KEY = "bora_aws_v2";

const ESTADO_PADRAO = {
  deck: {},
  xpTotal: 0,
  theme: "light",
  muted: false,
  fontScale: 1.0,
  phaseStats: {},
  stats: { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 }
};

/**
 * Carrega o estado persistente do localStorage.
 * Retorna o estado padrão se nenhum dado for encontrado ou se ocorrer erro.
 * @returns {Object} Estado persistente do jogador.
 */
function carregar() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      deck: parsed.deck || {},
      xpTotal: parsed.xpTotal || 0,
      theme: parsed.theme || "light",
      muted: parsed.muted || false,
      fontScale: parsed.fontScale || 1.0,
      phaseStats: parsed.phaseStats || {},
      stats: parsed.stats || { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 }
    };
  } catch (e) {
    return {
      deck: {},
      xpTotal: 0,
      theme: "light",
      muted: false,
      fontScale: 1.0,
      phaseStats: {},
      stats: { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 }
    };
  }
}

/**
 * Salva o estado atual no localStorage.
 * @param {Object} store Referência ao objeto de estado persistente.
 */
function salvar(store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { carregar, salvar, LS_KEY, ESTADO_PADRAO };
} else if (typeof window !== 'undefined') {
  window.PERSISTENCIA = { carregar, salvar, LS_KEY, ESTADO_PADRAO };
}
