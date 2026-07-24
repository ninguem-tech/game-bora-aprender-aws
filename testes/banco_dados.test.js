const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validarQuestao,
  validarBancoDados,
  obterCategoriaFase,
  filtrarFases,
  embaralharArray
} = require('../src/jogo.js');

// Carrega o banco de dados oficial do projeto
global.window = {};
require('../data/bank.js');
const bancoOficialAWS = global.window.AWS_BANK;

describe('Validação do Banco de Dados e Utilitários', () => {

  describe('Integridade do Banco Oficial (data/bank.js)', () => {
    it('deve possuir o código da certificação e o título definidos', () => {
      assert.equal(bancoOficialAWS.cert, 'SAA-C03', 'O código da certificação deve ser SAA-C03');
      assert.ok(bancoOficialAWS.titulo, 'O título do banco deve estar preenchido');
    });

    it('deve ter fases válidas no banco oficial', () => {
      assert.ok(Array.isArray(bancoOficialAWS.fases), 'As fases devem ser uma lista');
      assert.ok(bancoOficialAWS.fases.length > 0, 'O banco oficial deve conter pelo menos uma fase');
    });

    it('deve passar com sucesso pela função de validação de integridade', () => {
      const relatorio = validarBancoDados(bancoOficialAWS);
      assert.ok(relatorio.valido, `O banco oficial deve ser válido. Erros: ${relatorio.erros.join('; ')}`);
      assert.ok(relatorio.totalQuestoes > 0, 'Deve contabilizar questões válidas');
    });
  });

  describe('Validação de Questões Individuais', () => {
    it('deve aprovar uma questão no formato correto', () => {
      const questaoValida = {
        id: 'q-teste-1',
        stem: 'O que é o Amazon S3?',
        options: [
          { key: 'A', text: 'Serviço de armazenamento de objetos' },
          { key: 'B', text: 'Banco de dados relacional' }
        ],
        answers: ['A']
      };

      const resultado = validarQuestao(questaoValida);
      assert.ok(resultado.valida, 'A questão válida deve ser aprovada');
      assert.equal(resultado.erros.length, 0);
    });

    it('deve rejeitar questões incompletas ou malformadas', () => {
      const questaoSemOpcoes = {
        id: 'q-invalida',
        stem: 'Pergunta sem opções',
        options: [],
        answers: ['A']
      };

      const resultado = validarQuestao(questaoSemOpcoes);
      assert.ok(!resultado.valida, 'A questão sem opções deve ser rejeitada');
      assert.ok(resultado.erros.some(err => err.includes('opções')));
    });
  });

  describe('Classificação de Categorias e Filtro de Fases', () => {
    it('deve categorizar títulos de fases corretamente', () => {
      assert.equal(obterCategoriaFase('Fundamentos da Nuvem'), 'fundamentos');
      assert.equal(obterCategoriaFase('Computação e Rede (EC2, VPC)'), 'computacao');
      assert.equal(obterCategoriaFase('Segurança e IAM'), 'seguranca');
      assert.equal(obterCategoriaFase('Armazenamento e Bancos S3'), 'dados');
      assert.equal(obterCategoriaFase('Simulado 1'), 'simulados');
    });

    it('deve filtrar fases por palavra-chave de busca', () => {
      const listaFasesFicticia = [
        { id: 'f1', titulo: 'Fundamentos da Nuvem', questions: [{ stem: 'O que é EC2?', services: ['ec2'] }] },
        { id: 'f2', titulo: 'Armazenamento S3', questions: [{ stem: 'O que é S3?', services: ['s3'] }] }
      ];

      const resultadoBusca = filtrarFases(listaFasesFicticia, 'S3', 'todas');
      assert.equal(resultadoBusca.length, 1, 'Deve retornar apenas a fase com S3');
      assert.equal(resultadoBusca[0].id, 'f2');
    });

    it('deve filtrar fases por categoria temática', () => {
      const listaFasesFicticia = [
        { id: 'f1', titulo: 'Fundamentos da Nuvem', questions: [] },
        { id: 'f2', titulo: 'Computação e Rede (EC2)', questions: [] }
      ];

      const apenasFundamentos = filtrarFases(listaFasesFicticia, '', 'fundamentos');
      assert.equal(apenasFundamentos.length, 1);
      assert.equal(apenasFundamentos[0].id, 'f1');
    });
  });

  describe('Embaralhar Array', () => {
    it('deve retornar um novo array com a mesma quantidade de elementos', () => {
      const entradaOriginal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const resultadoEmbaralhado = embaralharArray(entradaOriginal);

      assert.equal(resultadoEmbaralhado.length, entradaOriginal.length);
      assert.notEqual(resultadoEmbaralhado, entradaOriginal, 'Deve retornar uma cópia do array, não a mesma referência');
      assert.ok(entradaOriginal.every(item => resultadoEmbaralhado.includes(item)), 'Todos os itens originais devem estar presentes');
    });
  });

});
