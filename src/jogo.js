/**
 * Módulo principal de lógica e regras de negócio do jogo "E aí, Bora Aprender AWS?".
 * 
 * Este arquivo contém as funções puras de agendamento Leitner, cálculo de XP,
 * filtragem de fases, gerenciamento dos modos de jogo (Pet e Sobrevivência) e
 * validação do banco de questões.
 */

const MILISSEGUNDOS_POR_DIA = 86400000;
const INTERVALOS_LEITNER_DIAS = [0, 1, 3, 7, 14]; // Intervalos por caixa (caixas 1 a 5)

/**
 * Retorna o horário atual em milissegundos.
 * @returns {number} Timestamp atual em ms.
 */
function obterDataAtualMs() {
  return Date.now();
}

/**
 * Recalcula o agendamento de um cartão de revisão Leitner.
 * 
 * @param {Object} cartao Cartão contendo a caixa atual e dados de agendamento.
 * @param {boolean} acertou Se o usuário respondeu corretamente ao cartão.
 * @param {number} [dataAtualMs] Timestamp opcional para testes.
 * @returns {Object} Cartão atualizado com nova caixa, próximo agendamento e total de lapsos.
 */
function calcularAgendamentoLeitner(cartao, acertou, dataAtualMs = Date.now()) {
  const cartaoAtualizado = { ...cartao };
  
  if (acertou) {
    cartaoAtualizado.box = Math.min(5, (cartaoAtualizado.box || 1) + 1);
  } else {
    cartaoAtualizado.box = 1;
    cartaoAtualizado.lapsos = (cartaoAtualizado.lapsos || 0) + 1;
  }

  const diasAdicionais = INTERVALOS_LEITNER_DIAS[cartaoAtualizado.box - 1];
  
  // Se for caixa 1 (diasAdicionais = 0), reagenda para daqui a 8 segundos
  if (diasAdicionais === 0) {
    cartaoAtualizado.due = dataAtualMs + 8000;
  } else {
    cartaoAtualizado.due = dataAtualMs + (diasAdicionais * MILISSEGUNDOS_POR_DIA);
  }

  return cartaoAtualizado;
}

/**
 * Adiciona ou atualiza uma questão no baralho Leitner.
 * 
 * @param {Object} baralho Objeto contendo os cartões mapeados por ID.
 * @param {Object} questao Objeto da questão errada.
 * @param {Object} [indiceQuestoes] Mapeamento opcional de ID da questão para ID da fase.
 * @param {number} [dataAtualMs] Timestamp opcional para testes.
 * @returns {Object} Novo estado do baralho.
 */
function adicionarAoLeitner(baralho, questao, indiceQuestoes = {}, dataAtualMs = Date.now()) {
  const novoBaralho = { ...baralho };
  const idQuestao = questao.id;
  const cartaoExistente = novoBaralho[idQuestao];

  let respostaCorretaTexto = "";
  if (questao.options && questao.answers && questao.answers.length > 0) {
    const chaveCorreta = questao.answers[0];
    const opcaoEncontrada = questao.options.find(opt => opt.key === chaveCorreta);
    if (opcaoEncontrada) {
      respostaCorretaTexto = opcaoEncontrada.text;
    }
  }

  novoBaralho[idQuestao] = {
    id: idQuestao,
    faseId: indiceQuestoes[idQuestao] ? indiceQuestoes[idQuestao].faseId : null,
    box: 1,
    due: dataAtualMs,
    situacao: questao.situacao || "",
    stem: questao.stem || "",
    correta: respostaCorretaTexto,
    porque: questao.explanation || "",
    lapsos: cartaoExistente ? (cartaoExistente.lapsos || 0) + 1 : 1
  };

  return novoBaralho;
}

/**
 * Filtra os cartões do baralho Leitner que estão devidos para revisão.
 * 
 * @param {Object} baralho Objeto contendo os cartões.
 * @param {number} [dataAtualMs] Timestamp de comparação.
 * @returns {Array<Object>} Lista de cartões pendentes de revisão.
 */
function obterCartoesDevidos(baralho, dataAtualMs = Date.now()) {
  if (!baralho) return [];
  return Object.values(baralho).filter(cartao => cartao && cartao.due <= dataAtualMs);
}

/**
 * Calcula a quantidade de pontos XP obtidos por uma resposta.
 * 
 * @param {boolean} acertou Se o usuário acertou a questão.
 * @param {number} sequenciaAtual Número de acertos consecutivos atuais (streak).
 * @param {boolean} usouDica Se o usuário revelou ao menos uma dica.
 * @returns {number} Pontos de XP concedidos.
 */
function calcularGanhoXP(acertou, sequenciaAtual = 0, usouDica = false) {
  if (!acertou) return 0;
  
  let xpBase = 10;
  const bonusSequencia = sequenciaAtual >= 3 ? 5 : 0;
  const bonusSemDica = usouDica ? 0 : 2;

  return xpBase + bonusSequencia + bonusSemDica;
}

/**
 * Determina a categoria temática de uma fase com base no título.
 * 
 * @param {string} tituloFase Título da fase.
 * @returns {string} Identificador da categoria.
 */
function obterCategoriaFase(tituloFase) {
  if (!tituloFase) return "avancado";
  const tituloMinusculo = tituloFase.toLowerCase();

  if (tituloMinusculo.includes("fundamentos") || tituloMinusculo.includes("well-architected") || tituloMinusculo.includes("global")) {
    return "fundamentos";
  }
  if (tituloMinusculo.includes("computação") || tituloMinusculo.includes("ec2") || tituloMinusculo.includes("vpc") || tituloMinusculo.includes("rede") || tituloMinusculo.includes("conteineres")) {
    return "computacao";
  }
  if (tituloMinusculo.includes("segurança") || tituloMinusculo.includes("iam") || tituloMinusculo.includes("kms") || tituloMinusculo.includes("waf") || tituloMinusculo.includes("compliance")) {
    return "seguranca";
  }
  if (tituloMinusculo.includes("armazenamento") || tituloMinusculo.includes("bancos") || tituloMinusculo.includes("s3") || tituloMinusculo.includes("ebs") || tituloMinusculo.includes("efs")) {
    return "dados";
  }
  if (tituloMinusculo.includes("simulado") || tituloMinusculo.includes("rodada relâmpago") || tituloMinusculo.includes("cenários")) {
    return "simulados";
  }

  return "avancado";
}

/**
 * Filtra a lista de fases por palavra-chave e categoria temática.
 * 
 * @param {Array<Object>} fases Lista completa de fases.
 * @param {string} termoBusca Termo de busca fornecido pelo usuário.
 * @param {string} categoriaFiltro Categoria selecionada ('todas' ou ID específico).
 * @returns {Array<Object>} Fases filtradas.
 */
function filtrarFases(fases, termoBusca = "", categoriaFiltro = "todas") {
  if (!Array.isArray(fases)) return [];

  const buscaNormalizada = termoBusca.trim().toLowerCase();

  return fases.filter(fase => {
    if (!fase) return false;

    const categoriaCalculada = obterCategoriaFase(fase.titulo);
    const atendeCategoria = (categoriaFiltro === "todas" || categoriaFiltro === categoriaCalculada);

    if (!atendeCategoria) return false;
    if (!buscaNormalizada) return true;

    const tituloMatch = fase.titulo && fase.titulo.toLowerCase().includes(buscaNormalizada);
    const questaoMatch = Array.isArray(fase.questions) && fase.questions.some(q => {
      const stemMatch = q.stem && q.stem.toLowerCase().includes(buscaNormalizada);
      const servicoMatch = Array.isArray(q.services) && q.services.some(s => s.toLowerCase().includes(buscaNormalizada));
      return stemMatch || servicoMatch;
    });

    return tituloMatch || questaoMatch;
  });
}

/**
 * Cria uma cópia embaralhada de uma lista de elementos (algoritmo Fisher-Yates).
 * 
 * @param {Array} arrayOriginal Array a ser embaralhado.
 * @returns {Array} Novo array com os elementos em ordem aleatória.
 */
function embaralharArray(arrayOriginal) {
  if (!Array.isArray(arrayOriginal)) return [];
  const copia = arrayOriginal.slice();
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const indiceAleatorio = Math.floor(Math.random() * (indice + 1));
    [copia[indice], copia[indiceAleatorio]] = [copia[indiceAleatorio], copia[indice]];
  }
  return copia;
}

/**
 * Valida o formato e integridade de uma questão individual.
 * 
 * @param {Object} questao Objeto da questão.
 * @returns {Object} Resultado com { valida: boolean, erros: Array<string> }.
 */
function validarQuestao(questao) {
  const erros = [];

  if (!questao || typeof questao !== "object") {
    return { valida: false, erros: ["Questão nula ou inválida"] };
  }
  if (!questao.id) erros.push("Falta o campo 'id'");
  if (!questao.stem) erros.push("Falta o enunciado ('stem')");
  if (!Array.isArray(questao.options) || questao.options.length < 2) {
    erros.push("Deve ter pelo menos 2 opções");
  }
  if (!Array.isArray(questao.answers) || questao.answers.length === 0) {
    erros.push("Deve ter pelo menos 1 resposta correta ('answers')");
  }

  return {
    valida: erros.length === 0,
    erros
  };
}

/**
 * Valida o banco completo de questões.
 * 
 * @param {Object} banco Objeto AWS_BANK contendo a lista de fases.
 * @returns {Object} Relatório de validação com total de fases, total de questões e erros.
 */
function validarBancoDados(banco) {
  const relatorio = {
    valido: true,
    totalFases: 0,
    totalQuestoes: 0,
    erros: []
  };

  if (!banco || !Array.isArray(banco.fases)) {
    relatorio.valido = false;
    relatorio.erros.push("Banco de dados sem propriedade 'fases' válida.");
    return relatorio;
  }

  relatorio.totalFases = banco.fases.length;

  banco.fases.forEach((fase, indiceFase) => {
    if (!fase.id || !fase.titulo) {
      relatorio.valido = false;
      relatorio.erros.push(`Fase no índice ${indiceFase} sem ID ou título.`);
    }

    if (!Array.isArray(fase.questions)) {
      relatorio.valido = false;
      relatorio.erros.push(`Fase '${fase.id || indiceFase}' sem lista de questões.`);
      return;
    }

    relatorio.totalQuestoes += fase.questions.length;

    fase.questions.forEach(q => {
      const checagem = validarQuestao(q);
      if (!checagem.valida) {
        relatorio.valido = false;
        relatorio.erros.push(`Questão '${q.id || 'sem_id'}': ${checagem.erros.join(", ")}`);
      }
    });
  });

  return relatorio;
}

/**
 * Inicializa o estado do jogo para o modo "Salvar o Pet".
 * 
 * @param {Object} pet Objeto do pet selecionado.
 * @param {number} [metaAcertos=20] Meta de acertos para resgatar.
 * @param {number} [maxErros=3] Máximo de erros permitido.
 * @returns {Object} Estado inicial do modo Pet.
 */
function criarEstadoPet(pet, metaAcertos = 20, maxErros = 3) {
  return {
    pet: pet || { id: 'cat', name: 'Gatinho', emoji: '🐱', word: 'Mimi' },
    acertos: 0,
    erros: 0,
    maxErros,
    metaAcertos,
    status: 'em_andamento' // 'em_andamento', 'salvo', 'derrota'
  };
}

/**
 * Processa o resultado de uma resposta no modo "Salvar o Pet".
 * 
 * @param {Object} estadoPet Estado atual do modo Pet.
 * @param {boolean} acertou Se o jogador acertou a questão.
 * @returns {Object} Novo estado do modo Pet.
 */
function processarRespostaPet(estadoPet, acertou) {
  const novoEstado = { ...estadoPet };

  if (acertou) {
    novoEstado.acertos += 1;
    if (novoEstado.acertos >= novoEstado.metaAcertos) {
      novoEstado.status = 'salvo';
    }
  } else {
    novoEstado.erros += 1;
    if (novoEstado.erros >= novoEstado.maxErros) {
      novoEstado.status = 'derrota';
    }
  }

  return novoEstado;
}

/**
 * Inicializa o estado do jogo para o modo "Sobrevivência".
 * 
 * @param {number} [totalVidas=3] Quantidade total de vidas.
 * @returns {Object} Estado inicial do modo Sobrevivência.
 */
function criarEstadoSobrevivencia(totalVidas = 3) {
  return {
    acertosConsecutivos: 0,
    erros: 0,
    maxErros: totalVidas,
    status: 'em_andamento' // 'em_andamento', 'derrota'
  };
}

/**
 * Processa a resposta do jogador no modo Sobrevivência.
 * 
 * @param {Object} estadoSobrevivencia Estado atual do modo Sobrevivência.
 * @param {boolean} acertou Se a resposta foi correta.
 * @returns {Object} Novo estado do modo Sobrevivência.
 */
function processarRespostaSobrevivencia(estadoSobrevivencia, acertou) {
  const novoEstado = { ...estadoSobrevivencia };

  if (acertou) {
    novoEstado.acertosConsecutivos += 1;
  } else {
    novoEstado.erros += 1;
    if (novoEstado.erros >= novoEstado.maxErros) {
      novoEstado.status = 'derrota';
    }
  }

  return novoEstado;
}

// Exportação compatível com Node.js (CommonJS) e Navegador (Global/UMD)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MILISSEGUNDOS_POR_DIA,
    INTERVALOS_LEITNER_DIAS,
    obterDataAtualMs,
    calcularAgendamentoLeitner,
    adicionarAoLeitner,
    obterCartoesDevidos,
    calcularGanhoXP,
    obterCategoriaFase,
    filtrarFases,
    embaralharArray,
    validarQuestao,
    validarBancoDados,
    criarEstadoPet,
    processarRespostaPet,
    criarEstadoSobrevivencia,
    processarRespostaSobrevivencia
  };
} else if (typeof window !== 'undefined') {
  window.JogoCore = {
    MILISSEGUNDOS_POR_DIA,
    INTERVALOS_LEITNER_DIAS,
    obterDataAtualMs,
    calcularAgendamentoLeitner,
    adicionarAoLeitner,
    obterCartoesDevidos,
    calcularGanhoXP,
    obterCategoriaFase,
    filtrarFases,
    embaralharArray,
    validarQuestao,
    validarBancoDados,
    criarEstadoPet,
    processarRespostaPet,
    criarEstadoSobrevivencia,
    processarRespostaSobrevivencia
  };
}
