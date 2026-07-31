/**
 * Módulo de áudio do jogo.
 *
 * Utiliza a Web Audio API para sintetizar sons de feedback (acerto, erro, fanfarra)
 * sem necessidade de arquivos de áudio externos. Também gerencia o toggle de mudo.
 */

let audioCtx = null;

/**
 * Obtém ou cria o AudioContext, retomando-o se estiver suspenso.
 * @returns {AudioContext|null}
 */
function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Reproduz um som sintetizado baseado no tipo fornecido.
 *
 * @param {string} tipo - Tipo de som: 'ok' (acerto), 'no' (erro), 'fanfare' (fanfarra).
 * @param {Object} store - Referência ao estado persistente (para verificar store.muted).
 */
function playSound(tipo, store) {
  if (store.muted) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tipo === "ok") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (tipo === "no") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(164.81, now + 0.18);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (tipo === "fanfare") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch {
    /* Web Audio API indisponível */
  }
}

/**
 * Aplica o estado de áudio atual ao botão: ícone e aria-pressed.
 * @param {Object} store - Estado persistente.
 */
function aplicarEstadoAudio(store) {
  const btn = document.getElementById("btnAudio");
  if (!btn) return;
  btn.textContent = store.muted ? "🔇" : "🔊";
  btn.setAttribute("aria-pressed", String(store.muted));
}

/**
 * Alterna o estado de mudo do áudio, atualizando o estado acessível do
 * botão, salvando a preferência e anunciando a mudança.
 * @param {Object} store - Estado persistente.
 * @param {Function} salvar - Função de salvamento (PERSISTENCIA.salvar).
 */
function toggleAudio(store, salvar) {
  store.muted = !store.muted;
  salvar(store);
  aplicarEstadoAudio(store);
  if (typeof ACESSIBILIDADE !== "undefined") {
    ACESSIBILIDADE.announce(store.muted ? "Som desligado." : "Som ligado.");
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { playSound, toggleAudio, aplicarEstadoAudio };
} else if (typeof window !== "undefined") {
  window.AUDIO = { playSound, toggleAudio, aplicarEstadoAudio };
}
