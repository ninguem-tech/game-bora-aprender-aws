const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calcularAgendamentoLeitner,
  adicionarAoLeitner,
  obterCartoesDevidos,
  MILISSEGUNDOS_POR_DIA
} = require('../src/jogo.js');

describe('Sistema de Repetição Espaçada (Leitner)', () => {

  it('deve avançar o cartão para a próxima caixa quando o usuário acertar', () => {
    const dataInicial = 1000000000000;
    const cartaoInicial = { id: 'q-01', box: 1, due: dataInicial, lapsos: 0 };

    const cartaoAtualizado = calcularAgendamentoLeitner(cartaoInicial, true, dataInicial);

    assert.equal(cartaoAtualizado.box, 2, 'A caixa deve ser incrementada para 2');
    assert.equal(cartaoAtualizado.due, dataInicial + (1 * MILISSEGUNDOS_POR_DIA), 'O reagendamento da caixa 2 deve ser para +1 dia');
  });

  it('deve limitar a caixa máxima ao valor 5', () => {
    const dataInicial = 1000000000000;
    const cartaoNaCaixaCinco = { id: 'q-02', box: 5, due: dataInicial, lapsos: 0 };

    const cartaoAtualizado = calcularAgendamentoLeitner(cartaoNaCaixaCinco, true, dataInicial);

    assert.equal(cartaoAtualizado.box, 5, 'A caixa não deve ultrapassar 5');
    assert.equal(cartaoAtualizado.due, dataInicial + (14 * MILISSEGUNDOS_POR_DIA), 'O reagendamento da caixa 5 deve ser para +14 dias');
  });

  it('deve retornar o cartão para a Caixa 1 e incrementar lapsos quando o usuário errar', () => {
    const dataInicial = 1000000000000;
    const cartaoNaCaixaTres = { id: 'q-03', box: 3, due: dataInicial, lapsos: 1 };

    const cartaoAtualizado = calcularAgendamentoLeitner(cartaoNaCaixaTres, false, dataInicial);

    assert.equal(cartaoAtualizado.box, 1, 'Ao errar, o cartão deve voltar para a Caixa 1');
    assert.equal(cartaoAtualizado.lapsos, 2, 'O número de lapsos deve ser incrementado para 2');
    assert.equal(cartaoAtualizado.due, dataInicial + 8000, 'Na caixa 1 o cartão deve ser reagendado para +8 segundos');
  });

  it('deve adicionar um novo cartão ao baralho Leitner ao errar uma questão', () => {
    const baralhoVazio = {};
    const questaoExemplo = {
      id: 'br-f0-q01',
      situacao: 'Situação de teste',
      stem: 'Qual serviço armazena arquivos?',
      options: [
        { key: 'A', text: 'Amazon S3' },
        { key: 'B', text: 'Amazon EC2' }
      ],
      answers: ['A'],
      explanation: 'O S3 armazena objetos.'
    };

    const dataHora = 1700000000000;
    const novoBaralho = adicionarAoLeitner(baralhoVazio, questaoExemplo, {}, dataHora);

    assert.ok(novoBaralho['br-f0-q01'], 'O cartão deve estar presente no baralho');
    assert.equal(novoBaralho['br-f0-q01'].box, 1, 'O cartão novo deve iniciar na Caixa 1');
    assert.equal(novoBaralho['br-f0-q01'].correta, 'Amazon S3', 'A resposta correta deve ser extraída das opções');
    assert.equal(novoBaralho['br-f0-q01'].lapsos, 1, 'O novo cartão deve registrar 1 lapso');
  });

  it('deve filtrar apenas os cartões que estão devidos para a data atual', () => {
    const agora = 1700000000000;
    const baralho = {
      'c1': { id: 'c1', due: agora - 5000, box: 1 },  // Vencido
      'c2': { id: 'c2', due: agora, box: 2 },         // Devido agora
      'c3': { id: 'c3', due: agora + 100000, box: 3 } // No futuro
    };

    const cartoesDevidos = obterCartoesDevidos(baralho, agora);

    assert.equal(cartoesDevidos.length, 2, 'Devem ser retornados 2 cartões devidos');
    const idsDevidos = cartoesDevidos.map(c => c.id);
    assert.ok(idsDevidos.includes('c1'), 'O cartão c1 deve estar na lista de devidos');
    assert.ok(idsDevidos.includes('c2'), 'O cartão c2 deve estar na lista de devidos');
    assert.ok(!idsDevidos.includes('c3'), 'O cartão c3 não deve estar na lista de devidos');
  });

});
