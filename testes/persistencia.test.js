const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  carregar,
  salvar,
  registrarExame,
  registrarEstudo,
  atualizarStreak,
  importarProgressoJSON,
  calcularChecksumBackup,
  LS_KEY,
  ESTADO_PADRAO,
  formatarDataLocal,
  dataHojeIso,
  dataOntemIso
} = require("../src/persistencia.js");

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
    assert.equal(estado.theme, "auto", "Novos usuários começam no tema automático");
    assert.equal(estado.muted, false);
    assert.equal(estado.fontScale, 1.0);
    assert.deepStrictEqual(estado.phaseStats, {});
    assert.deepStrictEqual(estado.stats, { totalAnswered: 0, totalCorrect: 0, maxStreak: 0 });
    assert.deepStrictEqual(estado.examHistory, []);
    assert.equal(estado.hasSeenWelcome, false);
    assert.equal(estado.streakDays, 0, "Usuário novo não deve começar com streak");
    assert.equal(estado.lastActiveDate, null, "Usuário novo não deve ter data de atividade");
  });

  it("só deve iniciar o streak após a primeira atividade registrada", () => {
    const estado = carregar();
    assert.equal(estado.streakDays, 0);
    assert.equal(estado.lastActiveDate, null);

    registrarEstudo(estado, { questionsAnswered: 1 });

    assert.equal(estado.streakDays, 1);
    assert.equal(estado.lastActiveDate, dataHojeIso());
  });

  it("deve incrementar o streak quando a última atividade foi ontem", () => {
    const estado = { streakDays: 2, lastActiveDate: dataOntemIso(), studyLogs: {} };

    atualizarStreak(estado);

    assert.equal(estado.streakDays, 3);
    assert.equal(estado.lastActiveDate, dataHojeIso());
  });

  it("deve reiniciar o streak para 1 quando houve lacuna de dias", () => {
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    const estado = {
      streakDays: 5,
      lastActiveDate: formatarDataLocal(tresDiasAtras),
      studyLogs: {}
    };

    atualizarStreak(estado);

    assert.equal(estado.streakDays, 1);
    assert.equal(estado.lastActiveDate, dataHojeIso());
  });

  it("não deve avançar o streak apenas por abrir o app (carregar)", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({ streakDays: 2, lastActiveDate: dataOntemIso() })
    );

    const estado = carregar();

    assert.equal(estado.streakDays, 2, "Carregar não pode incrementar o streak");
    assert.equal(estado.lastActiveDate, dataOntemIso(), "Carregar não pode marcar atividade hoje");
  });

  it("deve manter o streak intacto ao carregar quando já estudou hoje", () => {
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({ streakDays: 4, lastActiveDate: dataHojeIso() })
    );

    const estado = carregar();

    assert.equal(estado.streakDays, 4);
    assert.equal(estado.lastActiveDate, dataHojeIso());
  });

  it("deve exibir streak zerado ao carregar quando a sequência foi quebrada", () => {
    const quatroDiasAtras = new Date();
    quatroDiasAtras.setDate(quatroDiasAtras.getDate() - 4);
    localStorageFalso.setItem(
      LS_KEY,
      JSON.stringify({ streakDays: 7, lastActiveDate: formatarDataLocal(quatroDiasAtras) })
    );

    const estado = carregar();

    assert.equal(estado.streakDays, 0, "Sequência quebrada deve aparecer zerada");
    assert.equal(
      estado.lastActiveDate,
      formatarDataLocal(quatroDiasAtras),
      "A data da última atividade real deve ser preservada"
    );
  });

  it("deve aceitar o tema automático salvo e rejeitar temas inválidos", () => {
    localStorageFalso.setItem(LS_KEY, JSON.stringify({ theme: "auto" }));
    assert.equal(carregar().theme, "auto");

    localStorageFalso.setItem(LS_KEY, JSON.stringify({ theme: "sepia" }));
    assert.equal(carregar().theme, "auto", "Tema inválido volta ao padrão automático");
  });

  it("deve salvar e carregar o estado completo corretamente", () => {
    const estadoCompleto = {
      deck: { q1: { id: "q1", box: 2, due: 1000 } },
      xpTotal: 150,
      theme: "dark",
      muted: true,
      fontScale: 1.15,
      phaseStats: { f1: { completed: true, bestPercent: 80 } },
      stats: { totalAnswered: 20, totalCorrect: 16, maxStreak: 5 },
      hasSeenWelcome: true
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
    assert.deepStrictEqual(estadoCarregado.examHistory, []);
    assert.equal(estadoCarregado.hasSeenWelcome, true);
  });

  it("deve retornar o estado padrão quando o JSON no localStorage é inválido", () => {
    localStorageFalso.setItem(LS_KEY, "{json corrompido!!!");

    const estado = carregar();

    assert.deepStrictEqual(estado.deck, {});
    assert.equal(estado.xpTotal, 0);
    assert.equal(estado.theme, "auto");
  });

  it("deve preencher campos ausentes com valores padrão ao carregar dados parciais", () => {
    localStorageFalso.setItem(LS_KEY, JSON.stringify({ xpTotal: 42 }));

    const estado = carregar();

    assert.equal(estado.xpTotal, 42);
    assert.deepStrictEqual(estado.deck, {});
    assert.equal(estado.theme, "auto");
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
    assert.equal(estado.theme, "auto");
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
    assert.equal(ESTADO_PADRAO.theme, "auto");
    assert.equal(ESTADO_PADRAO.muted, false);
    assert.equal(ESTADO_PADRAO.fontScale, 1.0);
  });

  it("deve registrar e normalizar o histórico de simulados", () => {
    const store = carregar();
    registrarExame(store, { acertos: 52, total: 65, score: 800, tempoMinutos: 90 });

    assert.equal(store.examHistory.length, 1);
    assert.equal(store.examHistory[0].score, 800);
    assert.equal(store.examHistory[0].acertos, 52);
    assert.equal(store.examHistory[0].total, 65);
    assert.equal(store.examHistory[0].tempoMinutos, 90);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(store.examHistory[0].date));
  });

  it("deve limitar o histórico de simulados a 100 entradas", () => {
    const store = carregar();
    for (let i = 0; i < 110; i++) {
      registrarExame(store, { acertos: i % 65, total: 65, score: 100 + i, tempoMinutos: 60 });
    }
    assert.equal(store.examHistory.length, 100);
    assert.equal(store.examHistory[0].score, 209);
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

  it("deve rejeitar backup com tentativa de prototype pollution", () => {
    const malicioso = JSON.stringify({
      ["__proto__"]: { polluted: true },
      stats: { totalAnswered: 1, totalCorrect: 1, maxStreak: 1 }
    });
    const resultado = importarProgressoJSON(malicioso);
    assert.equal(resultado, null);
  });

  it("deve rejeitar backup com chaves desconhecidas ou muito grande", () => {
    const resultado = importarProgressoJSON('{"stats":{},"tema":"hacker"}');
    assert.equal(resultado, null);
  });

  it("deve rejeitar backup com lastActiveDate inválido", () => {
    const resultado = importarProgressoJSON('{"stats":{},"lastActiveDate":"ontem"}');
    assert.equal(resultado, null);
  });

  it("deve importar backup válido e descartar campos inválidos", () => {
    const valido = JSON.stringify({
      xpTotal: 50,
      theme: "dark",
      fontScale: 1.3,
      stats: { totalAnswered: 10, totalCorrect: 8, maxStreak: 2 }
    });
    const resultado = importarProgressoJSON(valido);
    assert.equal(resultado.xpTotal, 50);
    assert.equal(resultado.theme, "dark");
    assert.equal(resultado.fontScale, 1.3);
    assert.equal(resultado.stats.totalCorrect, 8);
  });

  it("deve calcular checksum estável independente da ordem das chaves", () => {
    const primeiro = { xpTotal: 10, stats: { totalAnswered: 2 }, deck: {} };
    const segundo = { stats: { totalAnswered: 2 }, deck: {}, xpTotal: 10 };

    assert.equal(calcularChecksumBackup(primeiro), calcularChecksumBackup(segundo));
    assert.match(calcularChecksumBackup(primeiro), /^sha256-[0-9a-f]{64}$/);
  });

  it("deve importar backup com checksum válido", () => {
    const dados = {
      xpTotal: 50,
      theme: "dark",
      stats: { totalAnswered: 10, totalCorrect: 8, maxStreak: 2 }
    };
    const backup = JSON.stringify({ checksum: calcularChecksumBackup(dados), data: dados });

    const resultado = importarProgressoJSON(backup);

    assert.ok(resultado);
    assert.equal(resultado.xpTotal, 50);
    assert.equal(resultado.theme, "dark");
  });

  it("deve rejeitar backup com dados adulterados após o checksum", () => {
    const dados = { xpTotal: 50, stats: { totalAnswered: 10 } };
    const backup = JSON.stringify({ checksum: calcularChecksumBackup(dados), data: dados });
    const adulterado = backup.replace('"xpTotal":50', '"xpTotal":999');

    const resultado = importarProgressoJSON(adulterado);

    assert.equal(resultado, null);
  });

  it("deve rejeitar envelope sem checksum", () => {
    const resultado = importarProgressoJSON('{"data":{"stats":{}}}');
    assert.equal(resultado, null);
  });
});

describe("Datas locais (formatarDataLocal, dataHojeIso, dataOntemIso)", () => {
  it("deve formatar uma data local corretamente com zero-padding", () => {
    const d = new Date(2026, 0, 5, 23, 59, 59);
    assert.equal(formatarDataLocal(d), "2026-01-05");
  });

  it("deve formatar o mês de dezembro e dia 31 corretamente", () => {
    const d = new Date(2025, 11, 31);
    assert.equal(formatarDataLocal(d), "2025-12-31");
  });

  it("deve usar data local e não UTC em dataHojeIso", () => {
    const resultado = dataHojeIso();
    assert.match(resultado, /^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
    const agora = new Date();
    const esperado =
      agora.getFullYear() +
      "-" +
      String(agora.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(agora.getDate()).padStart(2, "0");
    assert.equal(resultado, esperado);
  });

  it("deve retornar a data de ontem local em dataOntemIso", () => {
    const resultado = dataOntemIso();
    assert.match(resultado, /^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const esperado =
      ontem.getFullYear() +
      "-" +
      String(ontem.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(ontem.getDate()).padStart(2, "0");
    assert.equal(resultado, esperado);
  });
});
