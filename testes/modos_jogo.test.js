const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularGanhoXP,
  criarEstadoPet,
  processarRespostaPet,
  criarEstadoSobrevivencia,
  processarRespostaSobrevivencia
} = require('../src/jogo.js');

describe('Regras e Modos de Jogo', () => {

  describe('Cálculo de Pontuação (XP)', () => {
    it('deve retornar 0 XP se a resposta for incorreta', () => {
      const pontos = calcularGanhoXP(false, 5, false);
      assert.equal(pontos, 0, 'Resposta incorreta não deve conceder XP');
    });

    it('deve conceder 12 XP para resposta correta sem dica e sem bônus de sequência', () => {
      const pontos = calcularGanhoXP(true, 1, false);
      assert.equal(pontos, 12, 'XP base (10) + bônus sem dica (2) = 12 XP');
    });

    it('deve conceder 10 XP para resposta correta se o usuário usou dica', () => {
      const pontos = calcularGanhoXP(true, 1, true);
      assert.equal(pontos, 10, 'Ao usar dica, não recebe os +2 XP de bônus');
    });

    it('deve conceder 17 XP para resposta correta com sequência >= 3 e sem dica', () => {
      const pontos = calcularGanhoXP(true, 3, false);
      assert.equal(pontos, 17, 'XP base (10) + sequência (5) + sem dica (2) = 17 XP');
    });
  });

  describe('Modo Salvar o Pet', () => {
    it('deve inicializar o estado do Pet com valores padrão', () => {
      const pet = { id: 'capy', name: 'Capivara', emoji: '🦫', word: 'Capi' };
      const estado = criarEstadoPet(pet, 20, 3);

      assert.equal(estado.acertos, 0, 'Acertos iniciais devem ser 0');
      assert.equal(estado.erros, 0, 'Erros iniciais devem ser 0');
      assert.equal(estado.metaAcertos, 20, 'Meta de acertos deve ser 20');
      assert.equal(estado.maxErros, 3, 'Limite de erros deve ser 3');
      assert.equal(estado.status, 'em_andamento', 'Status inicial deve ser em_andamento');
    });

    it('deve atualizar os acertos e alterar status para "salvo" ao atingir a meta', () => {
      const pet = { id: 'cat', name: 'Gatinho', emoji: '🐱', word: 'Mimi' };
      let estado = criarEstadoPet(pet, 2, 3);

      estado = processarRespostaPet(estado, true);
      assert.equal(estado.acertos, 1);
      assert.equal(estado.status, 'em_andamento');

      estado = processarRespostaPet(estado, true);
      assert.equal(estado.acertos, 2);
      assert.equal(estado.status, 'salvo', 'Status deve mudar para salvo após atingir a meta');
    });

    it('deve alterar o status para "derrota" ao atingir o número máximo de erros', () => {
      const pet = { id: 'dog', name: 'Cãozinho', emoji: '🐶', word: 'Bidu' };
      let estado = criarEstadoPet(pet, 20, 3);

      estado = processarRespostaPet(estado, false);
      estado = processarRespostaPet(estado, false);
      assert.equal(estado.erros, 2);
      assert.equal(estado.status, 'em_andamento');

      estado = processarRespostaPet(estado, false);
      assert.equal(estado.erros, 3);
      assert.equal(estado.status, 'derrota', 'Status deve mudar para derrota ao atingir 3 erros');
    });
  });

  describe('Modo Sobrevivência', () => {
    it('deve inicializar o estado de Sobrevivência com 3 vidas', () => {
      const estado = criarEstadoSobrevivencia(3);
      assert.equal(estado.acertosConsecutivos, 0);
      assert.equal(estado.erros, 0);
      assert.equal(estado.maxErros, 3);
      assert.equal(estado.status, 'em_andamento');
    });

    it('deve incrementar os acertos consecutivos na resposta correta', () => {
      let estado = criarEstadoSobrevivencia(3);
      estado = processarRespostaSobrevivencia(estado, true);
      estado = processarRespostaSobrevivencia(estado, true);

      assert.equal(estado.acertosConsecutivos, 2);
      assert.equal(estado.erros, 0);
      assert.equal(estado.status, 'em_andamento');
    });

    it('deve finalizar o jogo ao acumular 3 erros no modo sobrevivência', () => {
      let estado = criarEstadoSobrevivencia(3);
      estado = processarRespostaSobrevivencia(estado, false);
      estado = processarRespostaSobrevivencia(estado, false);
      estado = processarRespostaSobrevivencia(estado, false);

      assert.equal(estado.erros, 3);
      assert.equal(estado.status, 'derrota');
    });
  });

});
