/**
 * Módulo de acessibilidade e preferências visuais.
 *
 * Gerencia tema claro/escuro, escala de fonte do documento
 * e anúncios via região ARIA live.
 */

/**
 * Aplica o tema atual (claro ou escuro) ao documento.
 * @param {Object} store - Estado persistente.
 */
function applyTheme(store) {
  document.body.classList.toggle('dark', store.theme === 'dark');
  document.getElementById('btnTheme').textContent = store.theme === 'dark' ? '🌙' : '☀️';
}

/**
 * Alterna entre tema claro e escuro, salvando a preferência.
 * @param {Object} store - Estado persistente.
 * @param {Function} salvar - Função de salvamento (PERSISTENCIA.salvar).
 */
function toggleTheme(store, salvar) {
  store.theme = store.theme === 'dark' ? 'light' : 'dark';
  salvar(store);
  applyTheme(store);
}

/**
 * Aplica a escala de fonte atual ao atributo data-text-scale do documento.
 * @param {Object} store - Estado persistente.
 */
function applyFontScale(store) {
  document.documentElement.setAttribute('data-text-scale', store.fontScale);
}

/**
 * Altera a escala de fonte em um passo (cima ou baixo), salvando a preferência.
 * @param {Object} store - Estado persistente.
 * @param {number} delta - Direção da mudança (-1 para diminuir, +1 para aumentar).
 * @param {Function} salvar - Função de salvamento (PERSISTENCIA.salvar).
 */
function changeFontScale(store, delta, salvar) {
  const scales = [0.85, 1.0, 1.15, 1.3];
  let idx = scales.indexOf(store.fontScale);
  if (idx === -1) idx = 1;
  idx = Math.max(0, Math.min(scales.length - 1, idx + delta));
  store.fontScale = scales[idx];
  salvar(store);
  applyFontScale(store);
}

/**
 * Publica uma mensagem na região ARIA live para leitores de tela.
 * @param {string} msg - Mensagem a ser anunciada.
 */
function announce(msg) {
  const el = document.getElementById('ariaAnnounce');
  if (el) { el.textContent = msg; }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyTheme, toggleTheme, applyFontScale, changeFontScale, announce };
} else if (typeof window !== 'undefined') {
  window.ACESSIBILIDADE = { applyTheme, toggleTheme, applyFontScale, changeFontScale, announce };
}
