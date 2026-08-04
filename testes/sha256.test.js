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
});
