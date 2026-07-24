/**
 * Módulo de atalhos de teclado do jogo.
 *
 * Registra o handler global de keydown que mapeia teclas numéricas (1-4),
 * letras (a-d), Escape, H (dica) e Enter/Espaço para as ações da interface.
 *
 * Garantias de acessibilidade (WCAG 2.1.1, 2.1.2):
 *  - Atalhos nunca disparam durante digitação em input, textarea, select
 *    ou elementos com contentEditable;
 *  - Atalhos nunca disparam com teclas modificadoras (Ctrl/Meta/Alt);
 *  - Cada tecla dispara uma única ação (a tecla D responde a opção D;
 *    a dica usa somente a tecla H);
 *  - Enter/Espaço sobre um controle focado seguem o comportamento nativo
 *    do HTML, sem dupla ativação pelo handler global.
 *
 * Usa injeção de dependências: todas as ações e consultas de estado são
 * recebidas como parâmetros, sem acesso direto a globais.
 */

/**
 * Verifica se o elemento é um campo de digitação/edição.
 * @param {HTMLElement} elemento - Elemento a verificar.
 * @returns {boolean} True se o elemento aceita digitação do usuário.
 */
function estaEmCampoEditavel(elemento) {
  if (!elemento || !elemento.tagName) return false;
  const tag = String(elemento.tagName).toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return elemento.isContentEditable === true;
}

/**
 * Verifica se o alvo do evento é um controle ativável nativamente
 * (botão ou link), cujo Enter/Espaço não deve ser interceptado.
 * @param {EventTarget} alvo - Alvo do evento de teclado.
 * @returns {boolean} True se o alvo já trata Enter/Espaço nativamente.
 */
function ehControleNativo(alvo) {
  if (!alvo || !alvo.tagName) return false;
  const tag = String(alvo.tagName).toUpperCase();
  return tag === 'BUTTON' || tag === 'A';
}

/**
 * Instala o listener de atalhos de teclado.
 *
 * @param {Object} deps - Dependências injetadas.
 * @param {Function} deps.intro - Ação de voltar à tela inicial.
 * @param {Function} deps.avalia - Ação de avaliar cartão Leitner (acertou: boolean).
 * @param {Function} deps.revelarDica - Ação de revelar dica.
 * @param {Function} deps.getModoRevisao - Retorna o estado de revisão atual.
 * @param {Function} deps.getOpcoesDesabilitadas - Query selector para opções desabilitadas.
 * @param {Function} deps.getDicaBtn - Retorna o botão de dica ou null.
 * @param {Function} deps.getMostrarBtn - Retorna o botão "Mostrar resposta" ou null.
 * @param {Function} deps.getCtaBtn - Retorna o botão CTA principal ou null.
 */
function instalarAtalhosTeclado(deps) {
  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (estaEmCampoEditavel(e.target) || estaEmCampoEditavel(document.activeElement)) return;

    var key = e.key.toLowerCase();

    if (e.key === 'Escape') {
      deps.intro();
      return;
    }

    if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(key)) {
      var optIdx = -1;
      if (['1', '2', '3', '4'].includes(key)) optIdx = parseInt(key) - 1;
      else if (key === 'a') optIdx = 0;
      else if (key === 'b') optIdx = 1;
      else if (key === 'c') optIdx = 2;
      else if (key === 'd' && deps.getOpcoesDesabilitadas().length > 3) optIdx = 3;

      var revisao = deps.getModoRevisao();
      if (revisao && revisao.revelado) {
        if (key === '1' || key === 'a') deps.avalia(false);
        else if (key === '2' || key === 'b') deps.avalia(true);
        return;
      }

      if (optIdx >= 0) {
        var btns = deps.getOpcoesDesabilitadas();
        if (btns && btns[optIdx] && !btns[optIdx].disabled) {
          btns[optIdx].click();
        }
      }
    }

    if (key === 'h') {
      var dicaBtn = deps.getDicaBtn();
      if (dicaBtn && !dicaBtn.disabled) {
        dicaBtn.click();
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      if (ehControleNativo(e.target)) return;
      var revisaoEnter = deps.getModoRevisao();
      if (revisaoEnter) {
        if (!revisaoEnter.revelado) {
          var mbtn = deps.getMostrarBtn();
          if (mbtn) {
            e.preventDefault();
            mbtn.click();
          }
        }
        return;
      }
      var ctaBtn = deps.getCtaBtn();
      if (ctaBtn && !ctaBtn.disabled && ctaBtn.id !== 'mostrarBtn') {
        e.preventDefault();
        ctaBtn.click();
      }
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { instalarAtalhosTeclado, estaEmCampoEditavel, ehControleNativo };
} else if (typeof window !== 'undefined') {
  window.TECLADO = { instalarAtalhosTeclado, estaEmCampoEditavel, ehControleNativo };
}
