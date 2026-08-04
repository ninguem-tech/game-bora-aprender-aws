const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sha256 } = require("../src/sha256.js");

describe("SHA-256 (implementação pura)", () => {
  it("deve gerar o hash conhecido da string vazia", () => {
    assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("deve gerar o hash conhecido de 'abc'", () => {
    assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("deve tratar texto UTF-8 com acentuação e emoji", () => {
    assert.equal(
      sha256("Olá, mundo! ☕"),
      "0bcf2860945a4096e6222fe5cb47cfa7239950ac9298d8e776393165a771f83c"
    );
  });

  // Vetores de borda: os 3 testes acima usam entradas de 0-17 bytes, todas
  // dentro de um único bloco de 64 bytes — o laço de encadeamento multi-bloco
  // (offset += 64) nunca era exercitado. Sem isso, uma quebra na concatenação
  // entre blocos passaria despercebida (e, junto, o checksum de backup em
  // persistencia.js, que usa sha256 para o JSON completo do progresso —
  // quase sempre maior que um bloco). Os vetores de 55/56/64/65 bytes cobrem
  // a fronteira exata do preenchimento; o de 56 caracteres é o vetor oficial
  // de dois blocos do NIST/FIPS 180-4.
  it("deve tratar corretamente a fronteira de 55 bytes (o padding ainda cabe no bloco)", () => {
    assert.equal(
      sha256("a".repeat(55)),
      "9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318"
    );
  });

  it("deve tratar corretamente a fronteira de 56 bytes (o padding empurra para um segundo bloco)", () => {
    assert.equal(
      sha256("a".repeat(56)),
      "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a"
    );
  });

  it("deve tratar corretamente uma entrada de exatamente 64 bytes (um bloco completo)", () => {
    assert.equal(
      sha256("a".repeat(64)),
      "ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb"
    );
  });

  it("deve tratar corretamente uma entrada de 65 bytes (força um segundo bloco completo)", () => {
    assert.equal(
      sha256("a".repeat(65)),
      "635361c48bb9eab14198e76ea8ab7f1a41685d6ad62aa9146d301d4f17eb0ae0"
    );
  });

  it("deve gerar o vetor de teste oficial NIST/FIPS 180-4 de dois blocos", () => {
    assert.equal(
      sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
    );
  });
});
