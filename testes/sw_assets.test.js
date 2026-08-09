const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  PREFIXO_CACHE,
  ASSETS_EXTRAS,
  REGIAO_BLOCO_SW,
  extrairRecursosIndex,
  coletarAssetsPrecache,
  calcularVersaoCache,
  montarBlocoSw,
  lerBlocoSwAtual
} = require("../scripts/sw-assets.js");

const RAIZ_PROJETO = path.join(__dirname, "..");
const htmlIndex = fs.readFileSync(path.join(RAIZ_PROJETO, "index.html"), "utf8");
const recursosIndex = extrairRecursosIndex(htmlIndex);
const assetsDerivados = coletarAssetsPrecache();
const swAtual = lerBlocoSwAtual();

describe("Service Worker: precache derivado do index.html", () => {
  it("ASSETS do sw.js deve ser idêntico à lista derivada (sem divergência manual)", () => {
    assert.deepStrictEqual(
      swAtual.assets,
      assetsDerivados,
      "sw.js defasado do index.html/CSS/manifest — rode: npm run build:sw"
    );
  });

  it("todo asset precacheado deve existir no disco", () => {
    for (const asset of assetsDerivados) {
      const relativo = asset === "./" ? "index.html" : asset.replace(/^\.\//, "");
      assert.ok(
        fs.existsSync(path.join(RAIZ_PROJETO, relativo)),
        "asset listado no sw.js não existe no disco: " + asset
      );
    }
  });

  it("todo script do index.html (exceto data/bank.js) deve estar precacheado", () => {
    for (const script of recursosIndex.scripts) {
      if (script === "data/bank.js") continue;
      assert.ok(
        assetsDerivados.includes("./" + script),
        "script fora do precache do sw.js: " + script
      );
    }
  });

  it("toda folha de estilo do index.html deve estar precacheada", () => {
    for (const folha of recursosIndex.folhasEstilo) {
      assert.ok(assetsDerivados.includes("./" + folha), "CSS fora do precache do sw.js: " + folha);
    }
  });

  it("data/bank.js deve ficar fora do precache (cache em runtime, de propósito)", () => {
    assert.ok(!assetsDerivados.includes("./data/bank.js"));
    assert.ok(!swAtual.assets.includes("./data/bank.js"));
  });

  it("assets referenciados só via JS (extras) devem existir e estar precacheados", () => {
    for (const extra of ASSETS_EXTRAS) {
      assert.ok(fs.existsSync(path.join(RAIZ_PROJETO, extra)), "extra não existe: " + extra);
      assert.ok(assetsDerivados.includes("./" + extra), "extra fora do precache: " + extra);
    }
  });

  it("CACHE_NAME deve refletir o hash do conteúdo precacheado (sem bump manual)", () => {
    assert.ok(
      swAtual.cacheName.startsWith(PREFIXO_CACHE),
      "CACHE_NAME deve usar o prefixo " + PREFIXO_CACHE
    );
    assert.equal(
      swAtual.cacheName,
      calcularVersaoCache(assetsDerivados),
      "CACHE_NAME defasado do conteúdo dos assets — rode: npm run build:sw"
    );
  });

  it("aplicar o bloco gerado é idempotente (build:sw repetido não deve acumular cabeçalho)", () => {
    // Regressão: REGIAO_BLOCO_SW já começou depois do comentário "BLOCO
    // GERADO AUTOMATICAMENTE", então o comentário nunca era substituído —
    // cada rodada de build:sw inseria mais uma cópia dele antes do
    // CACHE_NAME. Simula duas rodadas em memória, sem tocar o sw.js real.
    const conteudoOriginal = fs.readFileSync(path.join(RAIZ_PROJETO, "sw.js"), "utf8");
    const bloco = montarBlocoSw(assetsDerivados, calcularVersaoCache(assetsDerivados));

    const primeiraPassada = conteudoOriginal.replace(REGIAO_BLOCO_SW, bloco);
    const segundaPassada = primeiraPassada.replace(REGIAO_BLOCO_SW, bloco);

    assert.equal(
      segundaPassada,
      primeiraPassada,
      "rodar a substituição de novo sobre o resultado não deveria mudar nada (build:sw deve ser idempotente)"
    );
    assert.equal(
      (primeiraPassada.match(/BLOCO GERADO AUTOMATICAMENTE/g) || []).length,
      1,
      "o cabeçalho do bloco gerado não pode se duplicar a cada rodada de build:sw"
    );
  });
});
