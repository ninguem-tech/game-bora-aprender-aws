/**
 * Service Worker do "E aí, Bora Aprender AWS?".
 *
 * Habilita funcionamento offline e instalacao como PWA.
 * Estrategia: cache-first para assets estaticos, com fallback para index.html
 * em requisicoes de navegacao quando offline.
 */

const CACHE_NAME = 'bora-aws-v3';
// Caminhos relativos ao escopo do Service Worker (diretorio de index.html),
// para funcionar tanto na raiz do dominio quanto em um subcaminho
// (ex.: GitHub Pages de projeto: usuario.github.io/repo/).
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/variaveis.css',
  './assets/css/base.css',
  './assets/css/componentes.css',
  './assets/css/telas.css',
  './assets/css/animacoes.css',
  './assets/nin-guem-favicon-32-light.png',
  './assets/nin-guem-favicon-32-dark.png',
  './assets/nin-guem-apple-touch-180.png',
  './assets/nin-guem-icon-192.png',
  './assets/nin-guem-icon-512.png',
  './src/jogo.js',
  './src/sha256.js',
  './src/persistencia.js',
  './src/audio.js',
  './src/acessibilidade.js',
  './src/renderizador.js',
  './src/teclado.js',
  './src/sw-register.js',
  './src/app.js',
  './data/bank.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('./index.html').then((resp) => resp || caches.match('./'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Atualiza em segundo plano se houver rede disponivel
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(event.request, networkResponse)
              );
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
