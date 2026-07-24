/**
 * Módulo de acessibilidade e preferências visuais.
 *
 * Gerencia tema claro/escuro, escala de fonte do documento, anúncios via
 * região ARIA live e utilitários de gerenciamento de foco para a SPA
 * (WCAG 2.4.3, 2.4.7, 2.4.11 e 4.1.3).
 */

/**
 * Aplica o tema atual (claro ou escuro) ao documento.
 * Atualiza o estado acessível (aria-pressed) do botão de tema.
 * @param {Object} store - Estado persistente.
 */
function applyTheme(store) {
  const escuro = store.theme === 'dark';
  document.body.classList.toggle('dark', escuro);
  const btn = document.getElementById('btnTheme');
  if (btn) {
    btn.textContent = escuro ? '🌙' : '☀️';
    btn.setAttribute('aria-pressed', String(escuro));
  }
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
  announce(store.theme === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.');
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
  announce('Escala do texto: ' + Math.round(store.fontScale * 100) + '%.');
}

/**
 * Publica uma mensagem na região ARIA live para leitores de tela.
 * Limpa o conteúdo antes de definir o novo para garantir que mensagens
 * repetidas sejam reanunciadas. Usa somente textContent (à prova de XSS).
 * @param {string} msg - Mensagem a ser anunciada.
 */
function announce(msg) {
  const el = document.getElementById('ariaAnnounce');
  if (!el) return;
  el.textContent = '';
  el.textContent = msg;
}

/**
 * Move o foco para um elemento, tornando-o focável se necessário.
 * Elementos nativamente focáveis (button, a, input, select, textarea)
 * NÃO recebem tabindex, para não saírem da ordem natural de tabulação.
 * @param {HTMLElement} elemento - Elemento que deve receber o foco.
 * @returns {HTMLElement|null} O elemento focado, ou null se inválido.
 */
function focarElemento(elemento) {
  if (!elemento || typeof elemento.focus !== 'function') return null;
  const tag = String(elemento.tagName || '').toUpperCase();
  const nativo = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(tag) !== -1;
  if (!nativo && typeof elemento.hasAttribute === 'function' &&
      typeof elemento.setAttribute === 'function' && !elemento.hasAttribute('tabindex')) {
    elemento.setAttribute('tabindex', '-1');
  }
  elemento.focus();
  return elemento;
}

/**
 * Move o foco para o título principal (h1/h2) de um contêiner renderizado,
 * ou para o próprio contêiner quando não houver título. Ponto de chegada
 * previsível após mudanças de tela (padrão recomendado pelo WAI-ARIA APG).
 * @param {HTMLElement} container - Contêiner da tela recém-renderizada.
 * @returns {HTMLElement|null} O elemento focado, ou null se inválido.
 */
function focarTitulo(container) {
  if (!container || typeof container.querySelector !== 'function') return null;
  const titulo = container.querySelector('h1') || container.querySelector('h2');
  return focarElemento(titulo || container);
}

/**
 * Detecta a preferência do sistema por movimento reduzido.
 * @param {Function} [matchMediaFn] - Implementação de matchMedia (injetável para testes).
 * @returns {boolean} True se o usuário prefere movimento reduzido.
 */
function prefereMovimentoReduzido(matchMediaFn) {
  const mm = matchMediaFn || (typeof window !== 'undefined' ? window.matchMedia : null);
  if (typeof mm !== 'function') return false;
  const consulta = mm('(prefers-reduced-motion: reduce)');
  return !!(consulta && consulta.matches);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyTheme, toggleTheme, applyFontScale, changeFontScale, announce,
    focarElemento, focarTitulo, prefereMovimentoReduzido
  };
} else if (typeof window !== 'undefined') {
  window.ACESSIBILIDADE = {
    applyTheme, toggleTheme, applyFontScale, changeFontScale, announce,
    focarElemento, focarTitulo, prefereMovimentoReduzido
  };
}
