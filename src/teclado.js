/**
 * Módulo de atalhos de teclado do jogo.
 *
 * Registra o handler global de keydown que mapeia teclas numéricas (1-4),
 * letras (a-d), Escape, D/H (dica) e Enter/Espaço para as ações da interface.
 *
 * Usa injeção de dependências: todas as ações e consultas de estado são
 * recebidas como parâmetros, sem acesso direto a globais.
 */

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
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }

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

    if (key === 'd' || key === 'h') {
      var dicaBtn = deps.getDicaBtn();
      if (dicaBtn && !dicaBtn.disabled) {
        dicaBtn.click();
      }
    }

    if (e.key === 'Enter' || e.key === ' ') {
      var revisaoEnter = deps.getModoRevisao();
      if (revisaoEnter) {
        if (!revisaoEnter.revelado) {
          var mbtn = deps.getMostrarBtn();
          if (mbtn) mbtn.click();
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
  module.exports = { instalarAtalhosTeclado };
} else if (typeof window !== 'undefined') {
  window.TECLADO = { instalarAtalhosTeclado };
}
