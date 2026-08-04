/**
 * Registro do Service Worker para PWA/offline.
 *
 * Arquivo separado (e não script inline) para respeitar a CSP
 * `script-src 'self'` do index.html.
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then(function (reg) {
      console.log("SW registrado:", reg.scope);
    })
    .catch(function (err) {
      console.warn("SW falhou:", err);
    });
}
