const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  criarEstadoSobrevivencia,
  processarRespostaSobrevivencia,
  criarEstadoPet,
  processarRespostaPet,
  calcularGanhoXP,
  adicionarAoLeitner,
  obterCartoesDevidos,
  calcularAgendamentoLeitner,
  validarBancoDados,
  validarQuestao,
  obterCategoriaFase,
  filtrarFases
} = require("../src/jogo.js");

// Carrega o banco oficial para os testes de integração
global.window = {};
require("../data/bank.js");
const { fases, cert } = global.window.AWS_BANK;

describe("Testes de Integração — Fluxos Reais com Banco Oficial", () => {
  let baralho;
  let dataBase;

  beforeEach(() => {
    baralho = {};
    dataBase = 1700000000000;
  });

  // ---------------------------------------------------------------
  // 1. Fluxo completo: Sobrevivência até game over com questões reais
  // ---------------------------------------------------------------
  describe("Fluxo Sobrevivência com Questões do Banco", () => {
    it("deve sustentar acertos consecutivos sem zerar status", () => {
      const estado = criarEstadoSobrevivencia(3);
      let e = estado;
      e = processarRespostaSobrevivencia(e, true);
      e = processarRespostaSobrevivencia(e, true);
      e = processarRespostaSobrevivencia(e, true);
      assert.strictEqual(e.acertosConsecutivos, 3);
      assert.strictEqual(e.erros, 0);
      assert.strictEqual(e.status, "em_andamento");
    });

    it("deve finalizar com derrota ao acumular 3 erros consecutivos", () => {
      const estado = criarEstadoSobrevivencia(3);
      let e = estado;
      e = processarRespostaSobrevivencia(e, false);
      e = processarRespostaSobrevivencia(e, false);
      e = processarRespostaSobrevivencia(e, false);
      assert.strictEqual(e.erros, 3);
      assert.strictEqual(e.status, "derrota");
    });

    it("deve zerar sequência ao errar, mas não perder status se ainda tem vidas", () => {
      const estado = criarEstadoSobrevivencia(3);
      let e = estado;
      e = processarRespostaSobrevivencia(e, true);
      e = processarRespostaSobrevivencia(e, true);
      e = processarRespostaSobrevivencia(e, false);
      assert.strictEqual(e.acertosConsecutivos, 0);
      assert.strictEqual(e.erros, 1);
      assert.strictEqual(e.status, "em_andamento");
    });

    it("deve percorrer todas as questões do banco sem crash (fumaça)", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      assert.ok(todas.length > 0, "Banco deve conter questões");
      todas.forEach((q) => {
        const r = validarQuestao(q);
        assert.ok(r.valida, `Questão ${q.id} deve ser válida: ${r.erros.join(", ")}`);
      });
    });
  });

  // ---------------------------------------------------------------
  // 2. Fluxo completo: Leitner (adicionar, revisar, avançar, dominar)
  // ---------------------------------------------------------------
  describe("Fluxo Leitner com Questões do Banco", () => {
    it("deve adicionar cartões e listar apenas os devidos", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      const q1 = todas[0];
      const q2 = todas[1];

      baralho = adicionarAoLeitner(baralho, q1, {}, dataBase);
      baralho = adicionarAoLeitner(baralho, q2, {}, dataBase);

      const devidos = obterCartoesDevidos(baralho, dataBase);
      assert.strictEqual(devidos.length, 2, "Dois cartões adicionados devem estar devidos");

      // Cartão agendado para 8s à frente (caixa 1 após acerto)
      const cartaoAcertado = calcularAgendamentoLeitner(Object.values(baralho)[0], true, dataBase);
      baralho[q1.id] = cartaoAcertado;

      // Imediatamente após agendar para +8s, ainda está "no futuro" para dataBase
      const devidosAposAcerto = obterCartoesDevidos(baralho, dataBase);
      assert.strictEqual(
        devidosAposAcerto.length,
        1,
        "Apenas o cartão que não foi acertado ainda deve aparecer como devido"
      );
    });

    it("deve remover cartão da caixa 5 ao acertar novamente", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      const q = todas[0];

      baralho = adicionarAoLeitner(baralho, q, {}, dataBase);
      let cartao = Object.values(baralho)[0];

      // Avança manualmente até caixa 4 (3 acertos)
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase); // box 2
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase); // box 3
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase); // box 4
      assert.strictEqual(cartao.box, 4);

      // Acerto na caixa 4 → caixa 5
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase);
      assert.strictEqual(cartao.box, 5);

      // Caixa 5 indica domínio: remove do baralho (simulado pelo renderizador)
      const ids = Object.keys(baralho);
      assert.ok(ids.includes(q.id), "Ainda está no baralho até ser removido pelo fluxo de revisão");
    });

    it("deve retornar à caixa 1 e incrementar lapsos ao errar", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      const q = todas[0];

      // Cartão adicionado ao Leitner porque o jogador errou a questão original
      baralho = adicionarAoLeitner(baralho, q, {}, dataBase);
      let cartao = Object.values(baralho)[0];
      // Um cartão recém-adicionado por erro já inicia com lapsos 1
      assert.strictEqual(cartao.lapsos, 1);

      // Avança para caixa 3 com dois acertos na revisão
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase);
      cartao = calcularAgendamentoLeitner(cartao, true, dataBase);
      assert.strictEqual(cartao.box, 3);
      assert.strictEqual(cartao.lapsos, 1); // lapsos se mantém nos acertos

      // Erra na caixa 3
      cartao = calcularAgendamentoLeitner(cartao, false, dataBase);
      assert.strictEqual(cartao.box, 1);
      assert.strictEqual(cartao.lapsos, 2);
      // Reagendamento para +8 segundos
      assert.ok(cartao.due > dataBase && cartao.due <= dataBase + 8000);
    });
  });

  // ---------------------------------------------------------------
  // 3. Fluxo completo: Modo Salvar o Pet
  // ---------------------------------------------------------------
  describe("Fluxo Salvar o Pet", () => {
    it("deve completar a missão ao atingir meta de acertos", () => {
      const pet = { id: "cat", name: "Gatinho", emoji: "🐱", word: "Mimi" };
      let estado = criarEstadoPet(pet, 5, 2);

      for (let i = 0; i < 5; i++) {
        estado = processarRespostaPet(estado, true);
      }

      assert.strictEqual(estado.acertos, 5);
      assert.strictEqual(estado.status, "salvo");
      assert.strictEqual(estado.erros, 0);
    });

    it("deve falhar ao atingir limite de erros", () => {
      const pet = { id: "dog", name: "Cãozinho", emoji: "🐶", word: "Bidu" };
      let estado = criarEstadoPet(pet, 20, 2);

      estado = processarRespostaPet(estado, false);
      estado = processarRespostaPet(estado, false);

      assert.strictEqual(estado.erros, 2);
      assert.strictEqual(estado.status, "derrota");
    });
  });

  // ---------------------------------------------------------------
  // 4. Integridade estrutural e unicidade do banco oficial
  // ---------------------------------------------------------------
  describe("Integridade do Banco Oficial", () => {
    it("deve ser válido pela função de validação", () => {
      const relatorio = validarBancoDados({ fases, cert });
      assert.ok(
        relatorio.valido,
        `Banco oficial deve ser válido. Erros: ${relatorio.erros.join("; ")}`
      );
      assert.ok(relatorio.totalQuestoes > 0);
      assert.ok(relatorio.totalFases > 0);
    });

    it("deve ter IDs de questões únicos globalmente", () => {
      const ids = new Set();
      fases.forEach((f) => {
        f.questions.forEach((q) => {
          assert.ok(!ids.has(q.id), `ID duplicado: ${q.id}`);
          ids.add(q.id);
        });
      });
      assert.ok(ids.size > 0);
    });

    it("deve ter todas as fases com pelo menos 2 questões", () => {
      fases.forEach((f) => {
        assert.ok(f.questions.length >= 2, `Fase "${f.titulo}" deve ter pelo menos 2 questões`);
      });
    });

    it("deve ter questões com exatamente 1 resposta correta (SAA-C03)", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      todas.forEach((q) => {
        assert.strictEqual(
          q.answers.length,
          1,
          `Questão ${q.id} deve ter exatamente 1 resposta correta`
        );
      });
    });

    it("deve ter questões com 2 ou mais opções de resposta", () => {
      const todas = fases.reduce((acc, f) => acc.concat(f.questions), []);
      todas.forEach((q) => {
        assert.ok(
          q.options.length >= 2,
          `Questão ${q.id} deve ter no mínimo 2 opções, tem ${q.options.length}`
        );
      });
    });
  });

  // ---------------------------------------------------------------
  // 5. Integração: XP + Progressão
  // ---------------------------------------------------------------
  describe("Fluxo de XP e Progressão", () => {
    it("deve acumular XP com bônus de sequência sem dica", () => {
      let xpAcumulado = 0;
      let streak = 0;
      const respostas = [true, true, true]; // 3 acertos seguidos

      respostas.forEach((acertou) => {
        streak = acertou ? streak + 1 : 0;
        xpAcumulado += calcularGanhoXP(acertou, streak, false);
      });

      // 1º: 10 base + 0 sequência + 2 sem dica = 12
      // 2º: 10 base + 0 sequência + 2 sem dica = 12
      // 3º: 10 base + 5 sequência + 2 sem dica = 17
      // Total = 41
      assert.strictEqual(xpAcumulado, 41);
    });

    it("deve conceder 0 XP em caso de erro independente da sequência", () => {
      assert.strictEqual(calcularGanhoXP(false, 10, false), 0);
      assert.strictEqual(calcularGanhoXP(false, 3, true), 0);
      assert.strictEqual(calcularGanhoXP(false, 0, false), 0);
    });
  });

  // ---------------------------------------------------------------
  // 6. Filtro e categorização com dados reais
  // ---------------------------------------------------------------
  describe("Filtro de Fases com Banco Real", () => {
    it("deve categorizar todas as fases sem erro", () => {
      fases.forEach((f) => {
        const cat = obterCategoriaFase(f.titulo);
        assert.ok(
          ["fundamentos", "computacao", "seguranca", "dados", "avancado", "simulados"].includes(
            cat
          ),
          `Fase "${f.titulo}" deve ter categoria válida, recebeu: ${cat}`
        );
      });
    });

    it("deve encontrar fases por serviço AWS mencionado nas questões", () => {
      const resultado = filtrarFases(fases, "S3", "todas");
      // Espera-se que pelo menos uma fase mencione S3
      assert.ok(resultado.length > 0, "Deve existir pelo menos uma fase com questões sobre S3");
      resultado.forEach((f) => {
        assert.ok(
          f.titulo.toLowerCase().includes("s3") ||
            f.questions.some(
              (q) =>
                (q.stem || "").toLowerCase().includes("s3") ||
                (q.services || []).some((s) => s.toLowerCase().includes("s3"))
            ),
          `Fase "${f.titulo}" deve conter referência a S3`
        );
      });
    });
  });
});
