const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { carregar, salvar, LS_KEY, ESTADO_PADRAO } = require("../src/persistencia.js");

function criarLocalStorageFalso() {
  const dados = {};
  return {
    getItem(chave) {
      return chave in dados ? dados[chave] : null;
    },
    setItem(chave, valor) {
      dados[chave] = String(valor);
    },
    removeItem(chave) {
      delete dados[chave];
    },
    clear() {
      for (const k of Object.keys(dados)) delete dados[k];
    },
    _dados: dados
  };
}

describe("Camada de Persistência (localStorage)", () => {
  let localStorageFalso;

  beforeEach(() => {
    localStorageFalso = criarLocalStorageFalso();
    global.localStorage = localStorageFalso;
  });

  it("deve retornar o estado padrão quando o localStorage está vazio", () => {
    const estado = carregar();

    assert.deepStrictEqual(estado.deck, {});
    assert.equal(estado.xpTotal, 0);
    assert.equal(estado.theme, "light");
    assert.equal(estado.muted, false);
    assert.equal(estado.fontScale, 1.0);
    assert.deepStrictEqual(estado.phaseStats, {});
    assert.deepStrictEqual(estado.stats, { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 });
  });

  it("deve salvar e carregar o estado completo corretamente", () => {
    const estadoCompleto = {
      deck: { q1: { id: "q1", box: 2, due: 1000 } },
      xpTotal: 150,
      theme: "dark",
      muted: true,
      fontScale: 1.15,
      phaseStats: { f1: { completed: true, bestPercent: 80 } },
      stats: { totalAnswered: 20, totalCorrect: 16, maxStreak: 5 }
    };

    salvar(estadoCompleto);
    const estadoCarregado = carregar();

    assert.deepStrictEqual(estadoCarregado.deck, {
      q1: {
        id: "q1",
        faseId: null,
        box: 2,
        due: 1000,
        situacao: "",
        stem: "",
        correta: "",
        porque: "",
        lapsos: 0
      }
    });
    assert.equal(estadoCarregado.xpTotal, 150);
    assert.equal(estadoCarregado.theme, "dark");
    assert.equal(estadoCarregado.muted, true);
    assert.equal(estadoCarregado.fontScale, 1.15);
    assert.deepStrictEqual(estadoCarregado.phaseStats, estadoCompleto.phaseStats);
    assert.deepStrictEqual(estadoCarregado.stats, estadoCompleto.stats);
  });

  it("deve retornar o estado padrão quando o JSON no localStorage é inválido", () => {
    localStorageFalso.setItem(LS_KEY, "{json corrompido!!!");

    const estado = carregar();

    assert.deepStrictEqual(estado.deck, {});
    assert.equal(estado.xpTotal, 0);
    assert.equal(estado.theme, "light");
  });

  it("deve preencher campos ausentes com valores padrão ao carregar dados parciais", () => {
    localStorageFalso.setItem(LS_KEY, JSON.stringify({ xpTotal: 42 }));

    const estado = carregar();

    assert.equal(estado.xpTotal, 42);
    assert.deepStrictEqual(estado.deck, {});
    assert.equal(estado.theme, "light");
    assert.equal(estado.muted, false);
    assert.deepStrictEqual(estado.stats, { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 });
  });

  it("deve descartar valores com tipos inválidos e usar o padrão", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({
        xpTotal: "100concatenado",
        muted: "sim",
        fontScale: "grande",
        theme: 123,
        stats: { totalAnswered: "dez", totalCorrect: null, maxStreak: undefined }
      })
    );

    const estado = carregar();

    assert.equal(estado.xpTotal, 0);
    assert.equal(estado.muted, false);
    assert.equal(estado.fontScale, 1.0);
    assert.equal(estado.theme, "light");
    assert.deepStrictEqual(estado.stats, { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 });
  });

  it("deve ignorar chaves perigosas que poderiam poluir protótipos", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({
        deck: {
          __proto__: { polluted: true },
          constructor: { polluted: true },
          q1: { id: "q1", box: 1, due: 1000 }
        }
      })
    );

    const estado = carregar();

    assert.equal(
      Object.getPrototypeOf(estado.deck),
      Object.prototype,
      "Deve manter protótipo padrão"
    );
    assert.ok(
      !Object.prototype.hasOwnProperty.call(estado.deck, "constructor"),
      "Deve descartar chave constructor"
    );
    assert.ok(
      !Object.prototype.hasOwnProperty.call(estado.deck, "prototype"),
      "Deve descartar chave prototype"
    );
    assert.ok(estado.deck.q1);
  });

  it("deve aplicar limites aos valores numéricos persistidos", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({
        xpTotal: -50,
        fontScale: 999,
        phaseStats: {
          fase1: { completed: true, bestPercent: 700 }
        },
        stats: {
          totalAnswered: -10,
          totalCorrect: 200,
          maxStreak: -5
        }
      })
    );

    const estado = carregar();

    assert.equal(estado.xpTotal, 0, "XP não pode ser negativo");
    assert.equal(estado.fontScale, 1.0, "fontScale inválido deve voltar ao padrão");
    assert.equal(estado.phaseStats.fase1.bestPercent, 100, "bestPercent não pode ultrapassar 100");
    assert.equal(estado.stats.totalAnswered, 0, "totalAnswered não pode ser negativo");
    assert.equal(estado.stats.totalCorrect, 0, "totalCorrect não pode exceder totalAnswered");
    assert.equal(estado.stats.maxStreak, 0, "maxStreak não pode ser negativo");
  });

  it("deve normalizar campos do cartão Leitner descartando valores inválidos", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({
        deck: {
          q1: {
            situacao: "<b>situação</b>",
            stem: "<script>alert(1)</script>",
            correta: "A",
            porque: "Porque explicação",
            box: 8,
            due: -1000,
            lapsos: "muitos"
          }
        }
      })
    );

    const estado = carregar();
    const c = estado.deck.q1;

    assert.equal(c.situacao, "<b>situação</b>", "Texto é preservado como string");
    assert.equal(c.stem, "<script>alert(1)</script>", "Texto é preservado como string");
    assert.equal(c.box, 5, "box acima do máximo é limitado a 5");
    assert.equal(c.due, 0, "due negativo é zerado");
    assert.equal(c.lapsos, 0, "lapsos inválido é zerado");
  });

  it("deve descartar entradas do deck que não sejam objetos simples", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({
        deck: {
          q1: null,
          q2: "não é cartão",
          q3: ["array"],
          q4: { box: 1, due: 500 }
        }
      })
    );

    const estado = carregar();

    assert.ok(!estado.deck.q1, "deve descartar null");
    assert.ok(!estado.deck.q2, "deve descartar string");
    assert.ok(!estado.deck.q3, "deve descartar array");
    assert.ok(estado.deck.q4, "deve manter objeto simples");
    assert.equal(estado.deck.q4.due, 500);
  });

  it("deve usar a chave LS_KEY correta para armazenar os dados", () => {
    assert.equal(LS_KEY, "bora_aws_v2");

    salvar({
      deck: {},
      xpTotal: 10,
      theme: "light",
      muted: false,
      fontScale: 1.0,
      phaseStats: {},
      stats: { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 }
    });

    const raw = localStorageFalso.getItem(LS_KEY);
    assert.ok(raw, "Os dados devem estar armazenados sob a chave LS_KEY");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.xpTotal, 10);
  });

  it("deve exportar o objeto ESTADO_PADRAO com a estrutura esperada", () => {
    assert.ok(ESTADO_PADRAO);
    assert.deepStrictEqual(ESTADO_PADRAO.deck, {});
    assert.equal(ESTADO_PADRAO.xpTotal, 0);
    assert.equal(ESTADO_PADRAO.theme, "light");
    assert.equal(ESTADO_PADRAO.muted, false);
    assert.equal(ESTADO_PADRAO.fontScale, 1.0);
  });

  it("não deve lançar erro ao salvar se localStorage estiver indisponível", () => {
    const storeOriginal = global.localStorage;
    global.localStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      }
    };

    assert.doesNotThrow(() => {
      salvar({ deck: {}, xpTotal: 0 });
    });

    global.localStorage = storeOriginal;
  });
});
