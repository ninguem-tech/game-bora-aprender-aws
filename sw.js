/**
 * Service Worker do "E aí, Bora Aprender AWS?".
 *
 * Habilita funcionamento offline e instalacao como PWA.
 * Estrategia: cache-first para assets estaticos, com fallback para index.html
 * em requisicoes de navegacao quando offline.
 *
 * data/bank.js (~1MB, o banco de questoes) fica FORA do precache de
 * instalacao de proposito: instalar o Service Worker nao deve ficar
 * bloqueado baixando 1MB antes de o app poder abrir. Ele e buscado
 * normalmente via <script> no primeiro carregamento e so entra no cache
 * (para uso offline depois) atraves do cache-em-runtime abaixo, na
 * primeira vez que for de fato requisitado.
 */

const CACHE_NAME = 'bora-aws-v8';
// Caminhos relativos ao escopo do Service Worker (diretorio de index.html),
// para funcionar tanto na raiz do dominio quanto em um subcaminho
// (ex.: GitHub Pages de projeto: usuario.github.io/repo/).
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/fontes.css',
  './assets/css/variaveis.css',
  './assets/css/base.css',
  './assets/css/componentes.css',
  './assets/css/telas.css',
  './assets/css/animacoes.css',
  './assets/fonts/inter-latin-400-normal.woff2',
  './assets/fonts/inter-latin-ext-400-normal.woff2',
  './assets/fonts/inter-latin-500-normal.woff2',
  './assets/fonts/inter-latin-ext-500-normal.woff2',
  './assets/fonts/inter-latin-600-normal.woff2',
  './assets/fonts/inter-latin-ext-600-normal.woff2',
  './assets/fonts/inter-latin-700-normal.woff2',
  './assets/fonts/inter-latin-ext-700-normal.woff2',
  './assets/fonts/inter-latin-800-normal.woff2',
  './assets/fonts/inter-latin-ext-800-normal.woff2',
  './assets/fonts/outfit-latin-600-normal.woff2',
  './assets/fonts/outfit-latin-ext-600-normal.woff2',
  './assets/fonts/outfit-latin-700-normal.woff2',
  './assets/fonts/outfit-latin-ext-700-normal.woff2',
  './assets/fonts/outfit-latin-800-normal.woff2',
  './assets/fonts/outfit-latin-ext-800-normal.woff2',
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
  './src/renderizador-nucleo.js',
  './src/renderizador-quiz.js',
  './src/renderizador-home.js',
  './src/renderizador-fases.js',
  './src/renderizador-pet.js',
  './src/renderizador-sobrevivencia.js',
  './src/renderizador-simulado.js',
  './src/renderizador-leitner.js',
  './src/renderizador.js',
  './src/teclado.js',
  './src/sw-register.js',
  './src/pwa.js',
  './src/app.js'
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
        // Atualiza em segundo plano se houver rede disponivel. waitUntil
        // mantem o Service Worker vivo ate o cache.put terminar — sem isso,
        // o navegador pode encerrar o worker assim que a resposta em cache
        // e entregue (respondWith ja resolveu), derrubando a atualizacao no
        // meio do caminho de forma silenciosa e intermitente.
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                return caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {})
        );
        return cached;
      }

      // Nao estava pre-cacheado (ex.: data/bank.js na primeira visita).
      // Busca na rede e, se der certo, guarda em cache pra proxima vez —
      // sem isso, qualquer asset fora do precache nunca ficava disponivel
      // offline, mesmo depois de carregado com sucesso uma vez.
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const paraCache = networkResponse.clone();
            // Mesmo motivo do ramo "cached" acima: manter o worker vivo ate
            // o cache.put terminar, em vez de so dispara-lo sem aguardar.
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, paraCache))
            );
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback de index.html so vale para navegacao/documentos.
          // Devolver HTML para um .js/.css/imagem que falhou offline vira
          // erro de sintaxe silencioso (ex.: data/bank.js nunca cacheado).
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    })
  );
});
