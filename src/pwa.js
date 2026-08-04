/**
 * Injeta o link do manifest apenas quando o jogo roda via HTTP/HTTPS.
 *
 * Em file:// o navegador bloqueia o fetch do manifest por CORS e o registro
 * de Service Worker não é suportado; por isso o PWA só faz sentido quando o
 * jogo está publicado em um servidor.
 */
(function () {
  var protocolo = window.location ? window.location.protocol : "";
  if (protocolo !== "http:" && protocolo !== "https:") return;

  var link = document.createElement("link");
  link.rel = "manifest";
  link.href = "manifest.json";
  document.head.appendChild(link);
})();
