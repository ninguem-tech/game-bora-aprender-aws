/**
 * Gera (e confere) o bloco de precache do Service Worker (sw.js).
 *
 * A lista ASSETS e o CACHE_NAME do sw.js sao derivados automaticamente de
 * index.html (scripts, folhas de estilo e icones), das folhas de estilo
 * (fontes via url(...)) e do manifest.json (icones). Isso elimina dois
 * riscos de regressao offline que existiam quando a lista era manual:
 *
 *  1. adicionar um modulo novo em index.html e esquecer de inclui-lo no
 *     ASSETS do sw.js (o asset ficaria indisponivel offline);
 *  2. esquecer de dar bump manual no CACHE_NAME apos mudar o conteudo de
 *     um asset (o cache antigo continuava sendo servido).
 *
 * O CACHE_NAME e um hash sha256 (prefixo + 12 hex) do conteudo de todos os
 * assets precacheados: qualquer mudanca de conteudo troca o nome do cache
 * automaticamente, e o handler de activate do sw.js purga os caches antigos.
 *
 * Uso:
 *   node scripts/sw-assets.js          # reescreve o bloco gerado em sw.js
 *   node scripts/sw-assets.js --check  # so confere; sai com erro se divergir
 *
 * data/bank.js (~1MB) fica FORA do precache de proposito — ver comentario
 * no topo de sw.js. Ele entra no cache via runtime caching no primeiro uso.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ_PROJETO = path.resolve(__dirname, "..");
const CAMINHO_INDEX = path.join(RAIZ_PROJETO, "index.html");
const CAMINHO_MANIFEST = path.join(RAIZ_PROJETO, "manifest.json");
const CAMINHO_SW = path.join(RAIZ_PROJETO, "sw.js");
const PREFIXO_CACHE = "bora-aws-";

// Nao precacheado de proposito: ver comentario no topo de sw.js (nao
// bloquear a instalacao do SW com o download de ~1MB).
const EXCECOES_PRECACHE = new Set(["data/bank.js"]);

// Assets referenciados dinamicamente via JS (nao aparecem no index.html e,
// por isso, o parser nao os ve). Sem eles no precache, o favicon do tema
// escuro ficaria indisponivel offline.
const ASSETS_EXTRAS = ["assets/nin-guem-favicon-32-dark.png"];

/**
 * Extrai todas as tags de um elemento do HTML (abertura simples, sem
 * parsing de conteudo interno).
 * @param {string} html - Conteudo do HTML.
 * @param {string} nomeTag - Nome da tag (ex.: "link", "script").
 * @returns {string[]} Texto completo de cada tag encontrada.
 */
function extrairTags(html, nomeTag) {
  const regex = new RegExp("<" + nomeTag + "\\b[^>]*>", "g");
  return html.match(regex) || [];
}

/**
 * Le o valor de um atributo dentro de uma tag HTML.
 * @param {string} tag - Texto da tag (ex.: '<link rel="icon" href="x.png">').
 * @param {string} nomeAtributo - Nome do atributo procurado.
 * @returns {string|null} Valor do atributo, ou null se ausente.
 */
function obterAtributo(tag, nomeAtributo) {
  const correspondencia = tag.match(new RegExp("\\b" + nomeAtributo + '="([^"]*)"'));
  return correspondencia ? correspondencia[1] : null;
}

/**
 * Interpreta os recursos declarados em index.html: scripts (src), folhas de
 * estilo (link rel="stylesheet") e icones (link rel="icon"/"apple-touch-icon").
 * @param {string} html - Conteudo do index.html.
 * @returns {{scripts: string[], folhasEstilo: string[], icones: string[]}}
 */
function extrairRecursosIndex(html) {
  const scripts = [];
  for (const tag of extrairTags(html, "script")) {
    const src = obterAtributo(tag, "src");
    if (src) scripts.push(src);
  }

  const folhasEstilo = [];
  const icones = [];
  for (const tag of extrairTags(html, "link")) {
    const rel = obterAtributo(tag, "rel") || "";
    const href = obterAtributo(tag, "href");
    if (!href) continue;
    if (rel === "stylesheet") folhasEstilo.push(href);
    if (rel === "icon" || rel === "apple-touch-icon") icones.push(href);
  }

  return { scripts, folhasEstilo, icones };
}

/**
 * Extrai as fontes referenciadas por uma folha de estilo via url(...),
 * resolvidas em relacao ao diretorio do proprio CSS.
 * @param {string} caminhoCss - Caminho absoluto da folha de estilo.
 * @returns {string[]} Caminhos das fontes relativos a raiz do projeto.
 */
function extrairFontesCss(caminhoCss) {
  const conteudo = fs.readFileSync(caminhoCss, "utf8");
  const fontes = [];
  const regexUrl = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  let correspondencia;
  while ((correspondencia = regexUrl.exec(conteudo)) !== null) {
    const destino = path.resolve(path.dirname(caminhoCss), correspondencia[1]);
    fontes.push(path.relative(RAIZ_PROJETO, destino).split(path.sep).join("/"));
  }
  return fontes;
}

/**
 * Normaliza um caminho de asset para o formato relativo ao escopo do
 * Service Worker (prefixo "./", separadores "/").
 * @param {string} caminhoRelativo - Caminho relativo a raiz do projeto.
 * @returns {string} Caminho no formato usado pelo ASSETS do sw.js.
 */
function normalizarAsset(caminhoRelativo) {
  return "./" + caminhoRelativo.split(path.sep).join("/");
}

/**
 * Resolve o caminho absoluto no disco de um asset listado no ASSETS.
 * "./" e "./index.html" apontam ambos para o index.html.
 * @param {string} asset - Entrada do ASSETS (ex.: "./src/jogo.js").
 * @returns {string} Caminho absoluto do arquivo correspondente.
 */
function caminhoDoAsset(asset) {
  const relativo = asset === "./" ? "index.html" : asset.replace(/^\.\//, "");
  return path.join(RAIZ_PROJETO, relativo);
}

/**
 * Monta a lista ordenada e sem duplicatas de assets a precachear, derivada
 * de index.html, das folhas de estilo e do manifest.json. Falha com erro
 * claro se algum recurso referenciado nao existir no disco.
 * @returns {string[]} Lista de assets no formato "./caminho".
 */
function coletarAssetsPrecache() {
  const html = fs.readFileSync(CAMINHO_INDEX, "utf8");
  const recursos = extrairRecursosIndex(html);
  const manifest = JSON.parse(fs.readFileSync(CAMINHO_MANIFEST, "utf8"));

  const fontes = new Set();
  for (const folha of recursos.folhasEstilo) {
    for (const fonte of extrairFontesCss(path.join(RAIZ_PROJETO, folha))) {
      fontes.add(fonte);
    }
  }

  const ordem = [
    "index.html",
    "manifest.json",
    ...recursos.folhasEstilo,
    ...[...fontes].sort(),
    ...recursos.icones,
    ...(manifest.icons || []).map((icone) => icone.src),
    ...ASSETS_EXTRAS,
    ...recursos.scripts.filter((src) => !EXCECOES_PRECACHE.has(src))
  ];

  const assets = [];
  const vistos = new Set();
  for (const relativo of ordem) {
    if (relativo === "index.html") {
      // "./" cobre a navegacao para o escopo; "./index.html" cobre o
      // fallback offline do fetch de navegacao (ver sw.js).
      for (const entrada of ["./", "./index.html"]) {
        if (!vistos.has(entrada)) {
          vistos.add(entrada);
          assets.push(entrada);
        }
      }
      continue;
    }
    const asset = normalizarAsset(relativo);
    if (vistos.has(asset)) continue;
    vistos.add(asset);
    if (!fs.existsSync(caminhoDoAsset(asset))) {
      throw new Error(
        "sw-assets: recurso referenciado nao existe no disco: " +
          relativo +
          " (verifique index.html, manifest.json e as folhas de estilo)"
      );
    }
    assets.push(asset);
  }
  return assets;
}

/**
 * Calcula o CACHE_NAME a partir do conteudo de todos os assets precacheados.
 * Qualquer mudanca de conteudo gera um nome novo, dispensando bump manual.
 * @param {string[]} assets - Lista de assets no formato "./caminho".
 * @returns {string} Nome do cache (prefixo + 12 hex do sha256).
 */
function calcularVersaoCache(assets) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(assets));
  const arquivosUnicos = [];
  for (const asset of assets) {
    const caminho = caminhoDoAsset(asset);
    if (!arquivosUnicos.includes(caminho)) arquivosUnicos.push(caminho);
  }
  for (const caminho of arquivosUnicos) {
    hash.update(fs.readFileSync(caminho));
  }
  return PREFIXO_CACHE + hash.digest("hex").slice(0, 12);
}

/**
 * Monta o bloco (CACHE_NAME + ASSETS) a ser inserido em sw.js. Sem acentos
 * de proposito, para manter o padrao do restante do sw.js.
 * @param {string[]} assets - Lista de assets precacheados.
 * @param {string} versaoCache - Nome do cache derivado do conteudo.
 * @returns {string} Bloco de codigo pronto para o sw.js.
 */
function montarBlocoSw(assets, versaoCache) {
  const linhas = assets.map((asset) => "  '" + asset + "'").join(",\n");
  return (
    "// BLOCO GERADO AUTOMATICAMENTE por scripts/sw-assets.js — nao editar\n" +
    "// manualmente; para regenerar apos mudar index.html, CSS, manifest.json\n" +
    "// ou assets, rode: npm run build:sw (a suite de testes acusa divergencia).\n" +
    "const CACHE_NAME = '" +
    versaoCache +
    "';\n" +
    "// Caminhos relativos ao escopo do Service Worker (diretorio de index.html),\n" +
    "// para funcionar tanto na raiz do dominio quanto em um subcaminho\n" +
    "// (ex.: GitHub Pages de projeto: usuario.github.io/repo/).\n" +
    "const ASSETS = [\n" +
    linhas +
    "\n];"
  );
}

// Expressao que delimita a regiao substituivel de sw.js: do inicio do
// comentario "BLOCO GERADO AUTOMATICAMENTE" ate o fechamento do array
// ASSETS. Precisa comecar no comentario (e nao em "const CACHE_NAME", como
// antes) porque montarBlocoSw() inclui esse comentario no bloco gerado; se a
// regiao substituida comecasse depois dele, cada rodada de build:sw inseria
// uma copia nova do cabecalho sem nunca substituir as anteriores — o
// cabecalho crescia 3 linhas a cada rodada (bug corrigido aqui).
const REGIAO_BLOCO_SW = /\/\/ BLOCO GERADO AUTOMATICAMENTE[\s\S]*?const ASSETS = \[[\s\S]*?\];/;

/**
 * Le o CACHE_NAME e o ASSETS atualmente gravados em sw.js.
 * @returns {{cacheName: string, assets: string[]}} Valores atuais.
 */
function lerBlocoSwAtual() {
  const conteudo = fs.readFileSync(CAMINHO_SW, "utf8");
  const cacheName = (conteudo.match(/const CACHE_NAME = '([^']+)';/) || [])[1];
  const corpoAssets = (conteudo.match(/const ASSETS = \[([\s\S]*?)\];/) || [])[1] || "";
  const assets = [...corpoAssets.matchAll(/'([^']+)'/g)].map((item) => item[1]);
  return { cacheName, assets };
}

/**
 * Reescreve sw.js com o bloco derivado (CACHE_NAME + ASSETS).
 * @returns {{cacheName: string, totalAssets: number}} Resumo do gerado.
 */
function sincronizarSw() {
  const assets = coletarAssetsPrecache();
  const versaoCache = calcularVersaoCache(assets);
  const bloco = montarBlocoSw(assets, versaoCache);
  const conteudo = fs.readFileSync(CAMINHO_SW, "utf8");
  if (!REGIAO_BLOCO_SW.test(conteudo)) {
    throw new Error("sw-assets: nao encontrei o bloco CACHE_NAME/ASSETS em sw.js");
  }
  fs.writeFileSync(CAMINHO_SW, conteudo.replace(REGIAO_BLOCO_SW, bloco), "utf8");
  return { cacheName: versaoCache, totalAssets: assets.length };
}

/**
 * Confere se sw.js esta sincronizado com o que seria gerado agora.
 * @returns {{sincronizado: boolean, motivo: string|null}} Resultado.
 */
function conferirSw() {
  const assets = coletarAssetsPrecache();
  const versaoCache = calcularVersaoCache(assets);
  const atual = lerBlocoSwAtual();
  if (atual.cacheName !== versaoCache) {
    return {
      sincronizado: false,
      motivo:
        "CACHE_NAME defasado em sw.js (" +
        atual.cacheName +
        " != " +
        versaoCache +
        "); rode: npm run build:sw"
    };
  }
  if (JSON.stringify(atual.assets) !== JSON.stringify(assets)) {
    return {
      sincronizado: false,
      motivo: "lista ASSETS de sw.js diverge do index.html/CSS/manifest; rode: npm run build:sw"
    };
  }
  return { sincronizado: true, motivo: null };
}

if (require.main === module) {
  const modoConferencia = process.argv.includes("--check");
  try {
    if (modoConferencia) {
      const resultado = conferirSw();
      if (!resultado.sincronizado) {
        console.error("sw-assets: " + resultado.motivo);
        process.exit(1);
      }
      console.log("sw-assets: sw.js sincronizado com index.html/CSS/manifest.");
    } else {
      const resumo = sincronizarSw();
      console.log(
        "sw-assets: sw.js atualizado (" +
          resumo.totalAssets +
          " assets, cache " +
          resumo.cacheName +
          ")."
      );
    }
  } catch (erro) {
    console.error("sw-assets: " + erro.message);
    process.exit(1);
  }
}

module.exports = {
  PREFIXO_CACHE,
  ASSETS_EXTRAS,
  REGIAO_BLOCO_SW,
  extrairTags,
  obterAtributo,
  extrairRecursosIndex,
  extrairFontesCss,
  coletarAssetsPrecache,
  calcularVersaoCache,
  montarBlocoSw,
  lerBlocoSwAtual,
  sincronizarSw,
  conferirSw
};
