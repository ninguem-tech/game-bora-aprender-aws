const { describe, it, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const ACESSIBILIDADE = require("../src/acessibilidade.js");
const AUDIO = require("../src/audio.js");
const TECLADO = require("../src/teclado.js");

// ---------- Mocks mínimos de DOM (sem dependências externas) ----------

function criarElementoFalso(tag) {
  const atributos = {};
  const classes = new Set();
  return {
    tagName: String(tag || "div").toUpperCase(),
    textContent: "",
    disabled: false,
    isContentEditable: false,
    focado: false,
    clicado: 0,
    setAttribute(nome, valor) {
      atributos[nome] = String(valor);
    },
    getAttribute(nome) {
      return nome in atributos ? atributos[nome] : null;
    },
    hasAttribute(nome) {
      return nome in atributos;
    },
    focus() {
      this.focado = true;
    },
    click() {
      this.clicado++;
    },
    classList: {
      toggle(classe, forcar) {
        const ativa = forcar === undefined ? !classes.has(classe) : !!forcar;
        if (ativa) classes.add(classe);
        else classes.delete(classe);
        return ativa;
      },
      contains(classe) {
        return classes.has(classe);
      },
      add(classe) {
        classes.add(classe);
      },
      remove(classe) {
        classes.delete(classe);
      }
    }
  };
}

function criarDomFalso(ids) {
  const elementos = {};
  (ids || []).forEach(function (id) {
    elementos[id] = criarElementoFalso("div");
  });
  return {
    activeElement: null,
    body: criarElementoFalso("body"),
    documentElement: criarElementoFalso("html"),
    getElementById(id) {
      return elementos[id] || null;
    },
    _elementos: elementos
  };
}

function criarJanelaFalsa() {
  return {
    _handler: null,
    addEventListener(tipo, fn) {
      if (tipo === "keydown") this._handler = fn;
    }
  };
}

function mapearCode(tecla) {
  const map = {
    1: "Digit1",
    2: "Digit2",
    3: "Digit3",
    4: "Digit4",
    a: "KeyA",
    b: "KeyB",
    c: "KeyC",
    d: "KeyD",
    h: "KeyH",
    A: "KeyA",
    B: "KeyB",
    C: "KeyC",
    D: "KeyD",
    H: "KeyH"
  };
  if (map[tecla]) return map[tecla];
  if (tecla === " ") return "Space";
  if (tecla.length === 1 && /[a-zA-Z]/.test(tecla)) return "Key" + tecla.toUpperCase();
  return tecla;
}

function criarEvento(tecla, extras) {
  const evento = Object.assign(
    {
      key: tecla,
      code: mapearCode(tecla),
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      target: criarElementoFalso("body"),
      defaultPrevented: false
    },
    extras || {}
  );
  evento.preventDefault = function () {
    this.defaultPrevented = true;
  };
  return evento;
}

describe("Acessibilidade — tema, fonte e áudio", () => {
  let dom;

  beforeEach(() => {
    dom = criarDomFalso(["btnTheme", "btnAudio", "ariaAnnounce", "favicon"]);
    global.document = dom;
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  it("deve alternar e aplicar o tema com estado acessível (aria-pressed) e favicon", () => {
    const store = { theme: "light" };
    let salvos = 0;
    const salvar = () => {
      salvos++;
    };

    ACESSIBILIDADE.toggleTheme(store, salvar);

    assert.equal(store.theme, "dark");
    assert.equal(salvos, 1);
    assert.ok(dom.body.classList.contains("dark"));
    assert.equal(dom._elementos.btnTheme.textContent, "🌙");
    assert.equal(dom._elementos.btnTheme.getAttribute("aria-pressed"), "true");
    assert.equal(dom._elementos.favicon.href, "assets/nin-guem-favicon-32-dark.png");

    ACESSIBILIDADE.toggleTheme(store, salvar);

    assert.equal(store.theme, "auto", "Ciclo claro → escuro → automático");
    assert.equal(dom._elementos.btnTheme.textContent, "🌓");

    ACESSIBILIDADE.toggleTheme(store, salvar);

    assert.equal(store.theme, "light");
    assert.equal(dom.body.classList.contains("dark"), false);
    assert.equal(dom._elementos.btnTheme.textContent, "☀️");
    assert.equal(dom._elementos.btnTheme.getAttribute("aria-pressed"), "false");
    assert.equal(dom._elementos.favicon.href, "assets/nin-guem-favicon-32-light.png");
  });

  it("no modo automático deve seguir o prefers-color-scheme do sistema", () => {
    global.window = { matchMedia: () => ({ matches: true }) };
    const store = { theme: "auto" };

    ACESSIBILIDADE.applyTheme(store);

    assert.ok(dom.body.classList.contains("dark"), "Sistema escuro → tema escuro");
    assert.equal(dom._elementos.btnTheme.textContent, "🌓");
    assert.equal(dom._elementos.btnTheme.getAttribute("aria-pressed"), "true");

    global.window = { matchMedia: () => ({ matches: false }) };
    ACESSIBILIDADE.applyTheme(store);

    assert.equal(dom.body.classList.contains("dark"), false, "Sistema claro → tema claro");
    assert.equal(dom._elementos.btnTheme.getAttribute("aria-pressed"), "false");
  });

  it("deve limitar a escala de fonte aos valores mínimo e máximo", () => {
    const salvar = () => {};
    const storeMax = { fontScale: 1.3 };
    ACESSIBILIDADE.changeFontScale(storeMax, 1, salvar);
    assert.equal(storeMax.fontScale, 1.3);
    assert.equal(dom.documentElement.getAttribute("data-text-scale"), "1.3");

    const storeMin = { fontScale: 0.85 };
    ACESSIBILIDADE.changeFontScale(storeMin, -1, salvar);
    assert.equal(storeMin.fontScale, 0.85);
    assert.equal(dom.documentElement.getAttribute("data-text-scale"), "0.85");

    const storeMedio = { fontScale: 1.0 };
    ACESSIBILIDADE.changeFontScale(storeMedio, 1, salvar);
    assert.equal(storeMedio.fontScale, 1.15);
  });

  it("deve expor o estado acessível do botão de áudio (aria-pressed e ícone)", () => {
    const store = { muted: false };
    const salvar = () => {};

    AUDIO.aplicarEstadoAudio(store);
    assert.equal(dom._elementos.btnAudio.textContent, "🔊");
    assert.equal(dom._elementos.btnAudio.getAttribute("aria-pressed"), "false");

    AUDIO.toggleAudio(store, salvar);

    assert.equal(store.muted, true);
    assert.equal(dom._elementos.btnAudio.textContent, "🔇");
    assert.equal(dom._elementos.btnAudio.getAttribute("aria-pressed"), "true");
  });
});

describe("Acessibilidade — região aria-live", () => {
  afterEach(() => {
    delete global.document;
  });

  it("deve atualizar a região live com segurança (textContent, sem interpretar HTML)", () => {
    const dom = criarDomFalso(["ariaAnnounce"]);
    global.document = dom;
    const payload = "<img src=x onerror=alert(1)>";

    ACESSIBILIDADE.announce(payload);

    // textContent guarda a string bruta, sem parse de HTML
    assert.equal(dom._elementos.ariaAnnounce.textContent, payload);
  });

  it("deve reanunciar mensagens repetidas e não falhar sem a região live", () => {
    const dom = criarDomFalso(["ariaAnnounce"]);
    global.document = dom;

    ACESSIBILIDADE.announce("Resposta correta! +10 XP.");
    ACESSIBILIDADE.announce("Resposta correta! +10 XP.");
    assert.equal(dom._elementos.ariaAnnounce.textContent, "Resposta correta! +10 XP.");

    global.document = criarDomFalso([]);
    assert.doesNotThrow(() => ACESSIBILIDADE.announce("sem região live"));
  });
});

describe("Acessibilidade — gerenciamento de foco", () => {
  it("deve mover o foco para o título após a renderização", () => {
    const titulo = criarElementoFalso("h1");
    const container = criarElementoFalso("main");
    container.querySelector = (sel) => (sel === "h1" ? titulo : null);

    const focado = ACESSIBILIDADE.focarTitulo(container);

    assert.equal(focado, titulo);
    assert.ok(titulo.focado);
    assert.equal(titulo.getAttribute("tabindex"), "-1");
  });

  it("deve focar o próprio contêiner quando não houver título", () => {
    const container = criarElementoFalso("main");
    container.querySelector = () => null;

    const focado = ACESSIBILIDADE.focarTitulo(container);

    assert.equal(focado, container);
    assert.ok(container.focado);
    assert.equal(container.getAttribute("tabindex"), "-1");
  });

  it("deve lidar com elemento de foco inexistente sem lançar erro", () => {
    assert.equal(ACESSIBILIDADE.focarElemento(null), null);
    assert.equal(ACESSIBILIDADE.focarTitulo(null), null);
    assert.equal(ACESSIBILIDADE.focarElemento({}), null);
  });

  it("não deve adicionar tabindex a controles nativamente focáveis", () => {
    const botao = criarElementoFalso("button");

    ACESSIBILIDADE.focarElemento(botao);

    assert.ok(botao.focado);
    assert.equal(botao.hasAttribute("tabindex"), false);
  });
});

describe("Acessibilidade — atalhos de teclado", () => {
  let dom;
  let janela;
  let opcoes;
  let dicaBtn;
  let ctaBtn;
  let chamadas;

  function instalar(overrides) {
    const deps = Object.assign(
      {
        intro: () => {
          chamadas.intro++;
        },
        avalia: (acertou) => {
          chamadas.avalia.push(acertou);
        },
        revelarDica: () => {},
        getModoRevisao: () => null,
        getOpcoesDesabilitadas: () => opcoes,
        getDicaBtn: () => dicaBtn,
        getMostrarBtn: () => null,
        getCtaBtn: () => ctaBtn
      },
      overrides || {}
    );
    TECLADO.instalarAtalhosTeclado(deps);
    return janela._handler;
  }

  beforeEach(() => {
    dom = criarDomFalso([]);
    dom.activeElement = criarElementoFalso("body");
    janela = criarJanelaFalsa();
    global.document = dom;
    global.window = janela;
    opcoes = [
      criarElementoFalso("button"),
      criarElementoFalso("button"),
      criarElementoFalso("button"),
      criarElementoFalso("button")
    ];
    dicaBtn = criarElementoFalso("button");
    ctaBtn = criarElementoFalso("button");
    ctaBtn.id = "cta";
    chamadas = { intro: 0, avalia: [] };
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  it("deve ignorar atalhos durante digitação em input, textarea, select e contentEditable", () => {
    const handler = instalar();

    for (const tag of ["INPUT", "TEXTAREA", "SELECT"]) {
      const campo = criarElementoFalso(tag);
      dom.activeElement = campo;
      handler(criarEvento("1", { target: campo }));
    }
    const editavel = criarElementoFalso("div");
    editavel.isContentEditable = true;
    dom.activeElement = editavel;
    handler(criarEvento("1", { target: editavel }));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
    assert.equal(chamadas.intro, 0);
  });

  it("deve ignorar atalhos de caractere sem o modificador Alt (WCAG 2.1.4)", () => {
    const handler = instalar();

    handler(criarEvento("1"));
    handler(criarEvento("d"));
    handler(criarEvento("h"));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
    assert.equal(dicaBtn.clicado, 0);
    assert.equal(chamadas.intro, 0);
  });

  it("deve ignorar Ctrl/Meta e permitir Alt para atalhos de caractere", () => {
    const handler = instalar();

    handler(criarEvento("1", { ctrlKey: true }));
    handler(criarEvento("2", { metaKey: true }));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));

    handler(criarEvento("1", { altKey: true }));

    assert.equal(opcoes[0].clicado, 1);
  });

  it("Alt+4 deve disparar apenas a quarta opção, nunca a dica (ação única por tecla)", () => {
    const handler = instalar();

    handler(criarEvento("4", { altKey: true }));

    assert.equal(opcoes[3].clicado, 1);
    assert.equal(dicaBtn.clicado, 0);
    assert.equal(opcoes[0].clicado + opcoes[1].clicado + opcoes[2].clicado, 0);
  });

  it("Alt+letra (A-D) não deve disparar nenhuma ação — removido por conflitar com atalhos do navegador (ex.: Alt+D = barra de endereço no Chrome/Firefox/Edge)", () => {
    const handler = instalar();

    handler(criarEvento("a", { altKey: true }));
    handler(criarEvento("b", { altKey: true }));
    handler(criarEvento("c", { altKey: true }));
    handler(criarEvento("d", { altKey: true }));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
    assert.equal(dicaBtn.clicado, 0);
    assert.equal(chamadas.intro, 0);
  });

  it("Alt+H deve revelar a dica sem clicar em opções", () => {
    const handler = instalar();

    handler(criarEvento("h", { altKey: true }));

    assert.equal(dicaBtn.clicado, 1);
    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
  });

  it("não deve clicar em opção desabilitada nem sem opções suficientes", () => {
    const handler = instalar();
    opcoes[3].disabled = true;
    handler(criarEvento("4", { altKey: true }));
    assert.equal(opcoes[3].clicado, 0);

    const handler2 = instalar({ getOpcoesDesabilitadas: () => opcoes.slice(0, 3) });
    handler2(criarEvento("4", { altKey: true }));
    assert.equal(opcoes[3].clicado, 0);
  });

  it("Enter sobre um botão focado deve preservar o comportamento nativo (sem dupla ativação)", () => {
    const handler = instalar();
    const botaoFocado = criarElementoFalso("button");
    dom.activeElement = botaoFocado;

    handler(criarEvento("Enter", { target: botaoFocado }));

    assert.equal(ctaBtn.clicado, 0);
  });

  it("Enter fora de controles deve ativar o CTA uma única vez", () => {
    const handler = instalar();

    const evento = criarEvento("Enter");
    handler(evento);

    assert.equal(ctaBtn.clicado, 1);
    assert.ok(evento.defaultPrevented);
  });

  it("Espaço sem nada realmente focado não deve ativar o CTA (rolagem nativa da página)", () => {
    const handler = instalar();
    dom.activeElement = dom.body;

    const evento = criarEvento(" ");
    handler(evento);

    assert.equal(ctaBtn.clicado, 0, "Sem foco real, Espaço deve rolar a página, não clicar no CTA");
    assert.equal(evento.defaultPrevented, false);
  });

  it("na revisão, Alt+1/Alt+2 avaliam o cartão e Espaço revela a resposta", () => {
    const mostrarBtn = criarElementoFalso("button");
    const handler = instalar({ getModoRevisao: () => ({ revelado: true }) });

    handler(criarEvento("1", { altKey: true }));
    handler(criarEvento("2", { altKey: true }));
    assert.deepEqual(chamadas.avalia, [false, true]);

    const handler2 = instalar({
      getModoRevisao: () => ({ revelado: false }),
      getMostrarBtn: () => mostrarBtn
    });
    const evento = criarEvento(" ");
    handler2(evento);
    assert.equal(mostrarBtn.clicado, 1);
    assert.ok(evento.defaultPrevented);
  });

  it("Escape deve retornar ao início, exceto durante digitação", () => {
    const handler = instalar();

    handler(criarEvento("Escape"));
    assert.equal(chamadas.intro, 1);

    const campo = criarElementoFalso("INPUT");
    dom.activeElement = campo;
    handler(criarEvento("Escape", { target: campo }));
    assert.equal(chamadas.intro, 1);
  });
});

describe("Acessibilidade — resolução do tema efetivo", () => {
  afterEach(() => {
    delete global.window;
  });

  it("deve resolver temas explícitos sem consultar o sistema", () => {
    assert.equal(ACESSIBILIDADE.temaEfetivoEscuro({ theme: "dark" }), true);
    assert.equal(ACESSIBILIDADE.temaEfetivoEscuro({ theme: "light" }), false);
  });

  it("deve consultar prefers-color-scheme no modo automático", () => {
    const escuro = () => ({ matches: true });
    const claro = () => ({ matches: false });

    assert.equal(ACESSIBILIDADE.temaEfetivoEscuro({ theme: "auto" }, escuro), true);
    assert.equal(ACESSIBILIDADE.temaEfetivoEscuro({ theme: "auto" }, claro), false);
  });

  it("sem matchMedia disponível o modo automático resolve para claro", () => {
    delete global.window;
    assert.equal(ACESSIBILIDADE.temaEfetivoEscuro({ theme: "auto" }), false);
  });
});

describe("Acessibilidade — preferência por movimento reduzido", () => {
  it("deve detectar prefers-reduced-motion via matchMedia injetado", () => {
    const simAtivo = () => ({ matches: true });
    const simInativo = () => ({ matches: false });

    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(simAtivo), true);
    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(simInativo), false);
  });

  it("deve retornar false quando matchMedia não está disponível", () => {
    delete global.window;
    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(), false);
  });
});

describe("Acessibilidade — integração com o renderizador (anúncios e foco)", () => {
  let RENDERIZADOR;
  let dom;
  let titulo;

  before(() => {
    titulo = criarElementoFalso("h1");

    const appFake = criarElementoFalso("main");
    appFake.className = "";
    appFake.innerHTML = "";
    appFake.querySelector = (sel) => (sel === "h1" ? titulo : null);

    const barFake = criarElementoFalso("i");
    barFake.style = {};
    barFake.parentElement = criarElementoFalso("div");

    dom = {
      activeElement: null,
      body: criarElementoFalso("body"),
      documentElement: criarElementoFalso("html"),
      _elementos: {
        app: appFake,
        xp: criarElementoFalso("div"),
        bar: barFake,
        home: criarElementoFalso("button"),
        ariaAnnounce: criarElementoFalso("div")
      },
      getElementById(id) {
        return this._elementos[id] || null;
      },
      querySelector() {
        return null;
      }
    };

    global.document = dom;
    global.window = { AWS_BANK: { fases: [] } };
    global.JogoCore = require("../src/jogo.js");
    global.PERSISTENCIA = require("../src/persistencia.js");
    global.AUDIO = AUDIO;
    global.ACESSIBILIDADE = ACESSIBILIDADE;
    global.App = {
      store: {
        deck: {},
        xpTotal: 0,
        theme: "light",
        muted: true,
        fontScale: 1.0,
        phaseStats: {},
        stats: {}
      },
      modoJogo: "fases",
      modoRevisao: null,
      iniciado: true,
      focoOrigem: null,
      searchFilter: "",
      categoryFilter: "todas",
      petSelecionado: { id: "cat", name: "Gatinho", emoji: "🐱", word: "Mimi" }
    };

    RENDERIZADOR = require("../src/renderizador.js");
  });

  after(() => {
    delete global.document;
    delete global.window;
    delete global.JogoCore;
    delete global.PERSISTENCIA;
    delete global.AUDIO;
    delete global.ACESSIBILIDADE;
    delete global.App;
  });

  it("deve anunciar a tela inicial e mover o foco para o título após a renderização", () => {
    titulo.focado = false;

    RENDERIZADOR.intro();

    assert.equal(dom._elementos.ariaAnnounce.textContent, "Tela inicial.");
    assert.ok(titulo.focado);
    assert.equal(dom._elementos.app.className, "card pop");
  });

  it("não deve anunciar nem mover o foco no carregamento inicial (App.iniciado = false)", () => {
    dom._elementos.ariaAnnounce.textContent = "";
    titulo.focado = false;
    global.App.iniciado = false;

    RENDERIZADOR.intro();

    assert.equal(dom._elementos.ariaAnnounce.textContent, "");
    assert.equal(titulo.focado, false);
    global.App.iniciado = true;
  });

  it("a troca de aba via setModo não deve reanunciar a tela inicial", () => {
    dom._elementos.ariaAnnounce.textContent = "";

    RENDERIZADOR.setModo("leitner");

    assert.equal(global.App.modoJogo, "leitner");
    assert.equal(dom._elementos.ariaAnnounce.textContent, "");
    global.App.modoJogo = "fases";
  });

  it('deve anunciar a tela "Sobre o autor" e focar o título ao renderizá-la', () => {
    dom._elementos.ariaAnnounce.textContent = "";
    titulo.focado = false;

    RENDERIZADOR.sobre();

    assert.equal(dom._elementos.ariaAnnounce.textContent, "Sobre o autor.");
    assert.ok(titulo.focado);
    assert.equal(dom._elementos.home.hidden, false);
  });

  it("deve exibir o gráfico de evolução com 2+ simulados e ocultar com menos", () => {
    global.App.store.examHistory = [
      { date: "2026-08-01", acertos: 51, total: 65, score: 800, tempoMinutos: 100 },
      { date: "2026-07-01", acertos: 40, total: 65, score: 600, tempoMinutos: 120 }
    ];
    const container = { innerHTML: "" };

    RENDERIZADOR.renderSimuladoIntro(container);

    assert.ok(container.innerHTML.includes("graficoSimulados"), "Gráfico presente com 2 exames");
    assert.ok(container.innerHTML.includes("polyline"));
    assert.ok(container.innerHTML.includes("corte 720"));
    assert.ok(container.innerHTML.includes('role="img"'), "Gráfico acessível via role=img");

    global.App.store.examHistory = [];
    RENDERIZADOR.renderSimuladoIntro(container);

    assert.equal(
      container.innerHTML.includes("graficoSimulados"),
      false,
      "Sem histórico suficiente não há gráfico"
    );
  });

  it("avalia: cartão que chega à caixa 5 é removido do baralho (domínio)", () => {
    dom._elementos.ariaAnnounce.textContent = "";
    const carta = {
      id: "q-dominio",
      box: 4,
      due: 0,
      stem: "Pergunta de revisão",
      correta: "Resposta certa",
      porque: "",
      situacao: "",
      lapsos: 0
    };
    global.App.store.deck = { "q-dominio": carta };
    global.App.store.studyLogs = {};
    global.App.modoRevisao = { cards: [carta], idx: 0, acertosRev: 0, revelado: true };

    RENDERIZADOR.avalia(true);

    assert.ok(
      !Object.prototype.hasOwnProperty.call(global.App.store.deck, "q-dominio"),
      "Cartão dominado (caixa 5) deve sair do baralho"
    );
    assert.equal(global.App.modoRevisao, null, "Revisão termina após o último cartão");
    assert.match(dom._elementos.ariaAnnounce.textContent, /Revisão concluída/);

    global.App.store.deck = {};
  });

  it("avalia: cartão errado volta à caixa 1 e permanece no baralho", () => {
    const carta = {
      id: "q-erro",
      box: 3,
      due: 0,
      stem: "Pergunta de revisão",
      correta: "Resposta certa",
      porque: "",
      situacao: "",
      lapsos: 0
    };
    global.App.store.deck = { "q-erro": carta };
    global.App.store.studyLogs = {};
    global.App.modoRevisao = { cards: [carta], idx: 0, acertosRev: 0, revelado: true };

    RENDERIZADOR.avalia(false);

    assert.ok(
      Object.prototype.hasOwnProperty.call(global.App.store.deck, "q-erro"),
      "Cartão errado continua no baralho"
    );
    assert.equal(global.App.store.deck["q-erro"].box, 1, "Erro devolve o cartão à caixa 1");

    global.App.store.deck = {};
    global.App.modoRevisao = null;
  });

  it("deve expor a API completa do renderizador (integridade do agregador)", () => {
    // Protege a divisão em módulos de tela: se um módulo deixar de ser
    // carregado/registrado, alguma função pública ficará ausente aqui.
    const funcoes = [
      "escaparHtml",
      "salvarProgresso",
      "intro",
      "setModo",
      "renderModoContent",
      "renderFasesList",
      "onSearchInput",
      "setCategoryFilter",
      "setDomainFilter",
      "updateFaseGrid",
      "renderPetSelector",
      "selectPet",
      "startPetMode",
      "mostraPetPergunta",
      "renderSurvivalIntro",
      "startSurvivalMode",
      "mostraSurvivalPergunta",
      "renderSimuladoIntro",
      "startSimuladoMode",
      "mostraSimuladoPergunta",
      "resumoSimulado",
      "renderGraficoSimulados",
      "compartilharSimulado",
      "atualizarModoSimulado",
      "renderLeitnerOverview",
      "renderServicos",
      "renderConquistas",
      "renderOptionsAndHints",
      "startFase",
      "mostra",
      "revelarDica",
      "responde",
      "desabilitarOpcoes",
      "processarPontuacao",
      "atualizarModoPet",
      "atualizarModoSurvival",
      "renderizarFeedback",
      "ehUltimaQuestao",
      "criarBotaoProximo",
      "resumo",
      "resumoPet",
      "resumoSurvival",
      "revisar0",
      "mostraCartao",
      "revelaResp",
      "avalia",
      "resumoRevisao",
      "sobre",
      "showHome",
      "setProgress"
    ];
    funcoes.forEach((nome) => {
      assert.equal(typeof RENDERIZADOR[nome], "function", nome + " deveria ser uma função");
    });
    assert.ok(Array.isArray(RENDERIZADOR.PETS) && RENDERIZADOR.PETS.length > 0, "PETS ausente");
    assert.ok(RENDERIZADOR.BANK && Array.isArray(RENDERIZADOR.BANK.fases), "BANK ausente");
    assert.ok(RENDERIZADOR.QINDEX && typeof RENDERIZADOR.QINDEX === "object", "QINDEX ausente");
  });
});
