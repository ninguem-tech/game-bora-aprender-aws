const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calcularGanhoXP,
  criarEstadoPet,
  processarRespostaPet,
  criarEstadoSobrevivencia,
  processarRespostaSobrevivencia,
  criarEstadoSimulado,
  processarRespostaSimulado,
  calcularScoreAWS,
  calcularTempoRestanteSimulado,
  calcularConquistas
} = require("../src/jogo.js");

describe("Regras e Modos de Jogo", () => {
  describe("Cálculo de Pontuação (XP)", () => {
    it("deve retornar 0 XP se a resposta for incorreta", () => {
      const pontos = calcularGanhoXP(false, 5, false);
      assert.equal(pontos, 0, "Resposta incorreta não deve conceder XP");
    });

    it("deve conceder 12 XP para resposta correta sem dica e sem bônus de sequência", () => {
      const pontos = calcularGanhoXP(true, 1, false);
      assert.equal(pontos, 12, "XP base (10) + bônus sem dica (2) = 12 XP");
    });

    it("deve conceder 10 XP para resposta correta se o usuário usou dica", () => {
      const pontos = calcularGanhoXP(true, 1, true);
      assert.equal(pontos, 10, "Ao usar dica, não recebe os +2 XP de bônus");
    });

    it("deve conceder 17 XP para resposta correta com sequência >= 3 e sem dica", () => {
      const pontos = calcularGanhoXP(true, 3, false);
      assert.equal(pontos, 17, "XP base (10) + sequência (5) + sem dica (2) = 17 XP");
    });
  });

  describe("Modo Salvar o Pet", () => {
    it("deve inicializar o estado do Pet com valores padrão", () => {
      const pet = { id: "capy", name: "Capivara", emoji: "🦫", word: "Capi" };
      const estado = criarEstadoPet(pet, 20, 3);

      assert.equal(estado.acertos, 0, "Acertos iniciais devem ser 0");
      assert.equal(estado.erros, 0, "Erros iniciais devem ser 0");
      assert.equal(estado.metaAcertos, 20, "Meta de acertos deve ser 20");
      assert.equal(estado.maxErros, 3, "Limite de erros deve ser 3");
      assert.equal(estado.status, "em_andamento", "Status inicial deve ser em_andamento");
    });

    it('deve atualizar os acertos e alterar status para "salvo" ao atingir a meta', () => {
      const pet = { id: "cat", name: "Gatinho", emoji: "🐱", word: "Mimi" };
      let estado = criarEstadoPet(pet, 2, 3);

      estado = processarRespostaPet(estado, true);
      assert.equal(estado.acertos, 1);
      assert.equal(estado.status, "em_andamento");

      estado = processarRespostaPet(estado, true);
      assert.equal(estado.acertos, 2);
      assert.equal(estado.status, "salvo", "Status deve mudar para salvo após atingir a meta");
    });

    it('deve alterar o status para "derrota" ao atingir o número máximo de erros', () => {
      const pet = { id: "dog", name: "Cãozinho", emoji: "🐶", word: "Bidu" };
      let estado = criarEstadoPet(pet, 20, 3);

      estado = processarRespostaPet(estado, false);
      estado = processarRespostaPet(estado, false);
      assert.equal(estado.erros, 2);
      assert.equal(estado.status, "em_andamento");

      estado = processarRespostaPet(estado, false);
      assert.equal(estado.erros, 3);
      assert.equal(estado.status, "derrota", "Status deve mudar para derrota ao atingir 3 erros");
    });
  });

  describe("Modo Sobrevivência", () => {
    it("deve inicializar o estado de Sobrevivência com 3 vidas", () => {
      const estado = criarEstadoSobrevivencia(3);
      assert.equal(estado.acertosConsecutivos, 0);
      assert.equal(estado.erros, 0);
      assert.equal(estado.maxErros, 3);
      assert.equal(estado.status, "em_andamento");
    });

    it("deve incrementar os acertos consecutivos na resposta correta", () => {
      let estado = criarEstadoSobrevivencia(3);
      estado = processarRespostaSobrevivencia(estado, true);
      estado = processarRespostaSobrevivencia(estado, true);

      assert.equal(estado.acertosConsecutivos, 2);
      assert.equal(estado.erros, 0);
      assert.equal(estado.status, "em_andamento");
    });

    it("deve zerar os acertos consecutivos após um erro", () => {
      let estado = criarEstadoSobrevivencia(3);
      estado = processarRespostaSobrevivencia(estado, true);
      estado = processarRespostaSobrevivencia(estado, true);
      estado = processarRespostaSobrevivencia(estado, false);

      assert.equal(estado.acertosConsecutivos, 0, "Sequência deve ser zerada após erro");
      assert.equal(estado.erros, 1);
      assert.equal(estado.status, "em_andamento");
    });

    it("deve finalizar o jogo ao acumular 3 erros no modo sobrevivência", () => {
      let estado = criarEstadoSobrevivencia(3);
      estado = processarRespostaSobrevivencia(estado, false);
      estado = processarRespostaSobrevivencia(estado, false);
      estado = processarRespostaSobrevivencia(estado, false);

      assert.equal(estado.erros, 3);
      assert.equal(estado.status, "derrota");
    });
  });

  describe("Modo Simulado", () => {
    it("deve inicializar o estado do simulado com 65 questões e 130 minutos", () => {
      const estado = criarEstadoSimulado(65, 130);

      assert.equal(estado.indice, 0);
      assert.equal(estado.acertos, 0);
      assert.equal(estado.erros, 0);
      assert.equal(estado.total, 65);
      assert.equal(estado.tempoMinutos, 130);
      assert.equal(estado.status, "em_andamento");
    });

    it("deve avançar o índice e contabilizar acertos", () => {
      let estado = criarEstadoSimulado(65, 130);
      estado = processarRespostaSimulado(estado, true);

      assert.equal(estado.indice, 1);
      assert.equal(estado.acertos, 1);
      assert.equal(estado.status, "em_andamento");
    });

    it("deve finalizar ao responder todas as questões", () => {
      let estado = criarEstadoSimulado(3, 130);
      estado = processarRespostaSimulado(estado, true);
      estado = processarRespostaSimulado(estado, true);
      estado = processarRespostaSimulado(estado, true);

      assert.equal(estado.indice, 3);
      assert.equal(estado.acertos, 3);
      assert.equal(estado.status, "finalizado");
    });

    it("deve calcular o score AWS corretamente", () => {
      assert.equal(calcularScoreAWS(0, 65), 100);
      assert.equal(calcularScoreAWS(32, 65), 543);
      assert.equal(calcularScoreAWS(65, 65), 1000);
    });

    it("deve calcular o tempo restante do simulado", () => {
      const agora = 1700000000000;
      const fim = agora + 130 * 60 * 1000;
      assert.equal(calcularTempoRestanteSimulado(fim, agora), 7800);
      assert.equal(calcularTempoRestanteSimulado(agora - 1, agora), 0);
    });
  });

  describe("Conquistas", () => {
    it("deve retornar conquistas desbloqueadas de acordo com o estado", () => {
      const store = {
        stats: { totalAnswered: 100, totalCorrect: 80 },
        streakDays: 3,
        phaseStats: { f1: { completed: true, bestPercent: 100 } },
        examHistory: [{ score: 800 }],
        deck: { q1: {}, q2: {}, q3: {}, q4: {}, q5: {}, q6: {}, q7: {}, q8: {}, q9: {}, q10: {} }
      };
      const { desbloqueadas, pendentes } = calcularConquistas(store);

      assert.ok(desbloqueadas.some((c) => c.id === "primeira_resposta"));
      assert.ok(desbloqueadas.some((c) => c.id === "cem_questoes"));
      assert.ok(desbloqueadas.some((c) => c.id === "streak_3"));
      assert.ok(desbloqueadas.some((c) => c.id === "fase_perfeita"));
      assert.ok(desbloqueadas.some((c) => c.id === "simulado_aprovado"));
      assert.ok(desbloqueadas.some((c) => c.id === "leitner_10"));
      assert.ok(pendentes.some((c) => c.id === "streak_7"));
      assert.ok(pendentes.some((c) => c.id === "simulado_perfeito"));
    });

    it("deve retornar todas as conquistas como pendentes para estado vazio", () => {
      const { desbloqueadas, pendentes } = calcularConquistas({});
      assert.equal(desbloqueadas.length, 0);
      assert.ok(pendentes.length > 0);
    });
  });
});
