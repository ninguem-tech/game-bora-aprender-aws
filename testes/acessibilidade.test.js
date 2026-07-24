const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const ACESSIBILIDADE = require('../src/acessibilidade.js');
const AUDIO = require('../src/audio.js');
const TECLADO = require('../src/teclado.js');

// ---------- Mocks mínimos de DOM (sem dependências externas) ----------

function criarElementoFalso(tag) {
  const atributos = {};
  const classes = new Set();
  return {
    tagName: String(tag || 'div').toUpperCase(),
    textContent: '',
    disabled: false,
    isContentEditable: false,
    focado: false,
    clicado: 0,
    setAttribute(nome, valor) { atributos[nome] = String(valor); },
    getAttribute(nome) { return nome in atributos ? atributos[nome] : null; },
    hasAttribute(nome) { return nome in atributos; },
    focus() { this.focado = true; },
    click() { this.clicado++; },
    classList: {
      toggle(classe, forcar) {
        const ativa = forcar === undefined ? !classes.has(classe) : !!forcar;
        if (ativa) classes.add(classe); else classes.delete(classe);
        return ativa;
      },
      contains(classe) { return classes.has(classe); },
      add(classe) { classes.add(classe); },
      remove(classe) { classes.delete(classe); }
    }
  };
}

function criarDomFalso(ids) {
  const elementos = {};
  (ids || []).forEach(function (id) { elementos[id] = criarElementoFalso('div'); });
  return {
    activeElement: null,
    body: criarElementoFalso('body'),
    documentElement: criarElementoFalso('html'),
    getElementById(id) { return elementos[id] || null; },
    _elementos: elementos
  };
}

function criarJanelaFalsa() {
  return {
    _handler: null,
    addEventListener(tipo, fn) { if (tipo === 'keydown') this._handler = fn; }
  };
}

function criarEvento(tecla, extras) {
  const evento = Object.assign({
    key: tecla,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: criarElementoFalso('body'),
    defaultPrevented: false
  }, extras || {});
  evento.preventDefault = function () { this.defaultPrevented = true; };
  return evento;
}

describe('Acessibilidade — tema, fonte e áudio', () => {

  let dom;

  beforeEach(() => {
    dom = criarDomFalso(['btnTheme', 'btnAudio', 'ariaAnnounce']);
    global.document = dom;
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  it('deve alternar e aplicar o tema com estado acessível (aria-pressed)', () => {
    const store = { theme: 'light' };
    let salvos = 0;
    const salvar = () => { salvos++; };

    ACESSIBILIDADE.toggleTheme(store, salvar);

    assert.equal(store.theme, 'dark');
    assert.equal(salvos, 1);
    assert.ok(dom.body.classList.contains('dark'));
    assert.equal(dom._elementos.btnTheme.textContent, '🌙');
    assert.equal(dom._elementos.btnTheme.getAttribute('aria-pressed'), 'true');

    ACESSIBILIDADE.toggleTheme(store, salvar);

    assert.equal(store.theme, 'light');
    assert.equal(dom.body.classList.contains('dark'), false);
    assert.equal(dom._elementos.btnTheme.textContent, '☀️');
    assert.equal(dom._elementos.btnTheme.getAttribute('aria-pressed'), 'false');
  });

  it('deve limitar a escala de fonte aos valores mínimo e máximo', () => {
    const salvar = () => {};
    const storeMax = { fontScale: 1.3 };
    ACESSIBILIDADE.changeFontScale(storeMax, 1, salvar);
    assert.equal(storeMax.fontScale, 1.3);
    assert.equal(dom.documentElement.getAttribute('data-text-scale'), '1.3');

    const storeMin = { fontScale: 0.85 };
    ACESSIBILIDADE.changeFontScale(storeMin, -1, salvar);
    assert.equal(storeMin.fontScale, 0.85);
    assert.equal(dom.documentElement.getAttribute('data-text-scale'), '0.85');

    const storeMedio = { fontScale: 1.0 };
    ACESSIBILIDADE.changeFontScale(storeMedio, 1, salvar);
    assert.equal(storeMedio.fontScale, 1.15);
  });

  it('deve expor o estado acessível do botão de áudio (aria-pressed e ícone)', () => {
    const store = { muted: false };
    const salvar = () => {};

    AUDIO.aplicarEstadoAudio(store);
    assert.equal(dom._elementos.btnAudio.textContent, '🔊');
    assert.equal(dom._elementos.btnAudio.getAttribute('aria-pressed'), 'false');

    AUDIO.toggleAudio(store, salvar);

    assert.equal(store.muted, true);
    assert.equal(dom._elementos.btnAudio.textContent, '🔇');
    assert.equal(dom._elementos.btnAudio.getAttribute('aria-pressed'), 'true');
  });
});

describe('Acessibilidade — região aria-live', () => {

  afterEach(() => {
    delete global.document;
  });

  it('deve atualizar a região live com segurança (textContent, sem interpretar HTML)', () => {
    const dom = criarDomFalso(['ariaAnnounce']);
    global.document = dom;
    const payload = '<img src=x onerror=alert(1)>';

    ACESSIBILIDADE.announce(payload);

    // textContent guarda a string bruta, sem parse de HTML
    assert.equal(dom._elementos.ariaAnnounce.textContent, payload);
  });

  it('deve reanunciar mensagens repetidas e não falhar sem a região live', () => {
    const dom = criarDomFalso(['ariaAnnounce']);
    global.document = dom;

    ACESSIBILIDADE.announce('Resposta correta! +10 XP.');
    ACESSIBILIDADE.announce('Resposta correta! +10 XP.');
    assert.equal(dom._elementos.ariaAnnounce.textContent, 'Resposta correta! +10 XP.');

    global.document = criarDomFalso([]);
    assert.doesNotThrow(() => ACESSIBILIDADE.announce('sem região live'));
  });
});

describe('Acessibilidade — gerenciamento de foco', () => {

  it('deve mover o foco para o título após a renderização', () => {
    const titulo = criarElementoFalso('h1');
    const container = criarElementoFalso('main');
    container.querySelector = (sel) => (sel === 'h1' ? titulo : null);

    const focado = ACESSIBILIDADE.focarTitulo(container);

    assert.equal(focado, titulo);
    assert.ok(titulo.focado);
    assert.equal(titulo.getAttribute('tabindex'), '-1');
  });

  it('deve focar o próprio contêiner quando não houver título', () => {
    const container = criarElementoFalso('main');
    container.querySelector = () => null;

    const focado = ACESSIBILIDADE.focarTitulo(container);

    assert.equal(focado, container);
    assert.ok(container.focado);
    assert.equal(container.getAttribute('tabindex'), '-1');
  });

  it('deve lidar com elemento de foco inexistente sem lançar erro', () => {
    assert.equal(ACESSIBILIDADE.focarElemento(null), null);
    assert.equal(ACESSIBILIDADE.focarTitulo(null), null);
    assert.equal(ACESSIBILIDADE.focarElemento({}), null);
  });

  it('não deve adicionar tabindex a controles nativamente focáveis', () => {
    const botao = criarElementoFalso('button');

    ACESSIBILIDADE.focarElemento(botao);

    assert.ok(botao.focado);
    assert.equal(botao.hasAttribute('tabindex'), false);
  });
});

describe('Acessibilidade — atalhos de teclado', () => {

  let dom;
  let janela;
  let opcoes;
  let dicaBtn;
  let ctaBtn;
  let chamadas;

  function instalar(overrides) {
    const deps = Object.assign({
      intro: () => { chamadas.intro++; },
      avalia: (acertou) => { chamadas.avalia.push(acertou); },
      revelarDica: () => {},
      getModoRevisao: () => null,
      getOpcoesDesabilitadas: () => opcoes,
      getDicaBtn: () => dicaBtn,
      getMostrarBtn: () => null,
      getCtaBtn: () => ctaBtn
    }, overrides || {});
    TECLADO.instalarAtalhosTeclado(deps);
    return janela._handler;
  }

  beforeEach(() => {
    dom = criarDomFalso([]);
    dom.activeElement = criarElementoFalso('body');
    janela = criarJanelaFalsa();
    global.document = dom;
    global.window = janela;
    opcoes = [criarElementoFalso('button'), criarElementoFalso('button'), criarElementoFalso('button'), criarElementoFalso('button')];
    dicaBtn = criarElementoFalso('button');
    ctaBtn = criarElementoFalso('button');
    ctaBtn.id = 'cta';
    chamadas = { intro: 0, avalia: [] };
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  it('deve ignorar atalhos durante digitação em input, textarea, select e contentEditable', () => {
    const handler = instalar();

    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
      const campo = criarElementoFalso(tag);
      dom.activeElement = campo;
      handler(criarEvento('1', { target: campo }));
    }
    const editavel = criarElementoFalso('div');
    editavel.isContentEditable = true;
    dom.activeElement = editavel;
    handler(criarEvento('1', { target: editavel }));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
    assert.equal(chamadas.intro, 0);
  });

  it('deve ignorar atalhos quando uma tecla modificadora está pressionada', () => {
    const handler = instalar();

    handler(criarEvento('1', { ctrlKey: true }));
    handler(criarEvento('2', { metaKey: true }));
    handler(criarEvento('Escape', { altKey: true }));

    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
    assert.equal(chamadas.intro, 0);
  });

  it('a tecla D deve disparar apenas a opção D, nunca a dica (ação única por tecla)', () => {
    const handler = instalar();

    handler(criarEvento('d'));

    assert.equal(opcoes[3].clicado, 1);
    assert.equal(dicaBtn.clicado, 0);
    assert.equal(opcoes[0].clicado + opcoes[1].clicado + opcoes[2].clicado, 0);
  });

  it('a tecla H deve revelar a dica sem clicar em opções', () => {
    const handler = instalar();

    handler(criarEvento('h'));

    assert.equal(dicaBtn.clicado, 1);
    opcoes.forEach((opcao) => assert.equal(opcao.clicado, 0));
  });

  it('não deve clicar em opção desabilitada nem sem opções suficientes', () => {
    const handler = instalar();
    opcoes[3].disabled = true;
    handler(criarEvento('d'));
    assert.equal(opcoes[3].clicado, 0);

    const handler2 = instalar({ getOpcoesDesabilitadas: () => opcoes.slice(0, 3) });
    handler2(criarEvento('d'));
    assert.equal(opcoes[3].clicado, 0);
  });

  it('Enter sobre um botão focado deve preservar o comportamento nativo (sem dupla ativação)', () => {
    const handler = instalar();
    const botaoFocado = criarElementoFalso('button');
    dom.activeElement = botaoFocado;

    handler(criarEvento('Enter', { target: botaoFocado }));

    assert.equal(ctaBtn.clicado, 0);
  });

  it('Enter fora de controles deve ativar o CTA uma única vez', () => {
    const handler = instalar();

    const evento = criarEvento('Enter');
    handler(evento);

    assert.equal(ctaBtn.clicado, 1);
    assert.ok(evento.defaultPrevented);
  });

  it('na revisão, 1/2 avaliam o cartão e Espaço revela a resposta', () => {
    const mostrarBtn = criarElementoFalso('button');
    const handler = instalar({ getModoRevisao: () => ({ revelado: true }) });

    handler(criarEvento('1'));
    handler(criarEvento('b'));
    assert.deepEqual(chamadas.avalia, [false, true]);

    const handler2 = instalar({
      getModoRevisao: () => ({ revelado: false }),
      getMostrarBtn: () => mostrarBtn
    });
    const evento = criarEvento(' ');
    handler2(evento);
    assert.equal(mostrarBtn.clicado, 1);
    assert.ok(evento.defaultPrevented);
  });

  it('Escape deve retornar ao início, exceto durante digitação', () => {
    const handler = instalar();

    handler(criarEvento('Escape'));
    assert.equal(chamadas.intro, 1);

    const campo = criarElementoFalso('INPUT');
    dom.activeElement = campo;
    handler(criarEvento('Escape', { target: campo }));
    assert.equal(chamadas.intro, 1);
  });
});

describe('Acessibilidade — preferência por movimento reduzido', () => {

  it('deve detectar prefers-reduced-motion via matchMedia injetado', () => {
    const simAtivo = () => ({ matches: true });
    const simInativo = () => ({ matches: false });

    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(simAtivo), true);
    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(simInativo), false);
  });

  it('deve retornar false quando matchMedia não está disponível', () => {
    delete global.window;
    assert.equal(ACESSIBILIDADE.prefereMovimentoReduzido(), false);
  });
});
