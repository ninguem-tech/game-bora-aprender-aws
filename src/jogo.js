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
    cartaoAtualizado.due = dataAtualMs + diasAdicionais * MILISSEGUNDOS_POR_DIA;
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
    const opcaoEncontrada = questao.options.find((opt) => opt.key === chaveCorreta);
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
  return Object.values(baralho).filter((cartao) => cartao && cartao.due <= dataAtualMs);
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

  const xpBase = 10;
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

  if (
    tituloMinusculo.includes("simulado") ||
    tituloMinusculo.includes("rodada relâmpago") ||
    tituloMinusculo.includes("cenários")
  ) {
    return "simulados";
  }
  if (
    tituloMinusculo.includes("segurança") ||
    tituloMinusculo.includes("iam") ||
    tituloMinusculo.includes("kms") ||
    tituloMinusculo.includes("waf") ||
    tituloMinusculo.includes("compliance")
  ) {
    return "seguranca";
  }
  if (
    tituloMinusculo.includes("computação") ||
    tituloMinusculo.includes("ec2") ||
    tituloMinusculo.includes("vpc") ||
    tituloMinusculo.includes("rede") ||
    tituloMinusculo.includes("conteineres") ||
    tituloMinusculo.includes("contêineres")
  ) {
    return "computacao";
  }
  if (
    tituloMinusculo.includes("fundamentos") ||
    tituloMinusculo.includes("well-architected") ||
    tituloMinusculo.includes("global")
  ) {
    return "fundamentos";
  }
  if (
    tituloMinusculo.includes("armazenamento") ||
    tituloMinusculo.includes("bancos") ||
    tituloMinusculo.includes("s3") ||
    tituloMinusculo.includes("ebs") ||
    tituloMinusculo.includes("efs")
  ) {
    return "dados";
  }

  return "avancado";
}

const DOMINIOS_AWS = [
  { id: "todos", label: "Todos" },
  { id: "fundamentos", label: "Fundamentos" },
  { id: "computacao", label: "Computação" },
  { id: "armazenamento", label: "Armazenamento" },
  { id: "banco_de_dados", label: "Banco de Dados" },
  { id: "rede", label: "Rede e Entrega" },
  { id: "seguranca", label: "Segurança" },
  { id: "aplicacao", label: "Aplicação" },
  { id: "governanca", label: "Governança" },
  { id: "analytics", label: "Analytics" },
  { id: "migracao", label: "Migração" }
];

/**
 * Classifica o domínio AWS oficial a partir do título da fase.
 *
 * @param {string} tituloFase Título da fase.
 * @returns {string} Identificador do domínio AWS.
 */
function obterDominioFase(tituloFase) {
  if (!tituloFase) return "fundamentos";
  const t = tituloFase.toLowerCase();

  if (
    t.includes("segurança") ||
    t.includes("iam") ||
    t.includes("kms") ||
    t.includes("waf") ||
    t.includes("compliance") ||
    t.includes("auditoria") ||
    t.includes("certificado") ||
    t.includes("diretório")
  ) {
    return "seguranca";
  }
  if (
    t.includes("banco") ||
    t.includes("dynamodb") ||
    t.includes("rds") ||
    t.includes("documentdb") ||
    t.includes("neptune") ||
    t.includes("timestream")
  ) {
    return "banco_de_dados";
  }
  if (
    t.includes("armazenamento") ||
    t.includes("s3") ||
    t.includes("ebs") ||
    t.includes("efs") ||
    t.includes("fsx")
  ) {
    return "armazenamento";
  }
  if (
    t.includes("rede") ||
    t.includes("vpc") ||
    t.includes("route 53") ||
    t.includes("cloudfront") ||
    t.includes("nacl") ||
    t.includes("conectividade")
  ) {
    return "rede";
  }
  if (
    t.includes("computação") ||
    t.includes("ec2") ||
    t.includes("lambda") ||
    t.includes("contêiner") ||
    t.includes("conteiner") ||
    t.includes("ecs") ||
    t.includes("ecr") ||
    t.includes("eks") ||
    t.includes("workspaces") ||
    t.includes("computação de usuário")
  ) {
    return "computacao";
  }
  if (
    t.includes("aplicação") ||
    t.includes("sqs") ||
    t.includes("sns") ||
    t.includes("api gateway") ||
    t.includes("step functions") ||
    t.includes("cloudfront") ||
    t.includes("cloudfront e edge") ||
    t.includes("mensageria")
  ) {
    return "aplicacao";
  }
  if (
    t.includes("governança") ||
    t.includes("custos") ||
    t.includes("organizat") ||
    t.includes("control tower") ||
    t.includes("cloudwatch") ||
    t.includes("monitoramento") ||
    t.includes("observabilidade") ||
    t.includes("config") ||
    t.includes("ops") ||
    t.includes("operações")
  ) {
    return "governanca";
  }
  if (
    t.includes("analytics") ||
    t.includes("big data") ||
    t.includes("opensearch") ||
    t.includes("logs")
  ) {
    return "analytics";
  }
  if (
    t.includes("migração") ||
    t.includes("transferência") ||
    t.includes("dr") ||
    t.includes("recuperação")
  ) {
    return "migracao";
  }

  return "fundamentos";
}

/**
 * Extrai estatísticas de serviços AWS mencionados no banco de questões.
 *
 * @param {Array<Object>} fases Lista completa de fases.
 * @returns {Array<{nome: string, total: number, fases: string[]}>} Serviços ordenados por total.
 */
function obterEstatisticasServicos(fases) {
  if (!Array.isArray(fases)) return [];

  const mapa = {};
  fases.forEach((fase) => {
    if (!fase || !Array.isArray(fase.questions)) return;
    fase.questions.forEach((q) => {
      if (!q || !Array.isArray(q.services)) return;
      q.services.forEach((servico) => {
        if (typeof servico !== "string" || !servico) return;
        const nome = servico.trim().toLowerCase();
        if (!mapa[nome]) {
          mapa[nome] = { nome, total: 0, fases: new Set() };
        }
        mapa[nome].total += 1;
        mapa[nome].fases.add(fase.titulo || fase.id);
      });
    });
  });

  return Object.values(mapa)
    .map((s) => ({ nome: s.nome, total: s.total, fases: Array.from(s.fases).slice(0, 3) }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

/**
 * Calcula o nível de prontidão do jogador para o exame SAA-C03.
 *
 * Fórmula ponderada:
 * - 35% taxa de acerto geral
 * - 25% progresso nas fases (concluídas / total)
 * - 40% melhor score normalizado em simulados (score / 1000)
 *
 * @param {Object} store Estado persistente do jogador.
 * @param {number} totalFases Quantidade total de fases no banco.
 * @returns {number} Prontidão de 0 a 100.
 */
function calcularReadiness(store, totalFases) {
  if (!store || typeof store !== "object") return 0;

  const stats = store.stats || { totalAnswered: 0, totalCorrect: 0 };
  const accuracy =
    stats.totalAnswered > 0
      ? Math.min(100, Math.round((stats.totalCorrect / stats.totalAnswered) * 100))
      : 0;

  const phaseStats = store.phaseStats || {};
  const completadas = Object.values(phaseStats).filter((p) => p && p.completed).length;
  const progressoFases = totalFases > 0 ? Math.round((completadas / totalFases) * 100) : 0;

  const examHistory = Array.isArray(store.examHistory) ? store.examHistory : [];
  const melhorScore =
    examHistory.length > 0
      ? Math.max(...examHistory.map((exame) => (exame && exame.score ? exame.score : 0)))
      : 0;
  const simuladoScore = Math.min(1000, Math.max(0, melhorScore));

  return Math.round(accuracy * 0.35 + progressoFases * 0.25 + (simuladoScore / 1000) * 40);
}

/**
 * Retorna o nível descritivo e a cor semântica para uma prontidão.
 *
 * @param {number} readiness Valor de 0 a 100.
 * @returns {{label: string, cor: string}} Label e cor do medidor.
 */
function classificarReadiness(readiness) {
  if (readiness >= 80) return { label: "Pronto para o exame!", cor: "var(--verde)" };
  if (readiness >= 60) return { label: "Em progresso sólido", cor: "var(--dourado)" };
  if (readiness >= 40) return { label: "Na metade do caminho", cor: "var(--dourado)" };
  return { label: "Começando a jornada", cor: "var(--vermelho)" };
}

/**
 * Sanitiza um termo de busca para uso seguro na interface.
 *
 * Remove caracteres de controle (incluindo null bytes), normaliza espaços,
 * limita o tamanho e converte para minúsculas. O resultado é seguro para
 * inserção via textContent e para comparações de string.
 *
 * @param {string} termo Termo de busca bruto.
 * @param {number} [tamanhoMaximo=100] Tamanho máximo permitido.
 * @returns {string} Termo sanitizado e normalizado.
 */
function sanitizarTermoBusca(termo, tamanhoMaximo = 100) {
  if (typeof termo !== "string") return "";
  const semControle = termo
    .split("")
    .filter((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo >= 32 && codigo !== 127;
    })
    .join("");
  return semControle.trim().slice(0, tamanhoMaximo).toLowerCase();
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

  const buscaNormalizada = sanitizarTermoBusca(termoBusca);

  return fases.filter((fase) => {
    if (!fase) return false;

    const categoriaCalculada = obterCategoriaFase(fase.titulo);
    const atendeCategoria = categoriaFiltro === "todas" || categoriaFiltro === categoriaCalculada;

    if (!atendeCategoria) return false;
    if (!buscaNormalizada) return true;

    const tituloMatch =
      typeof fase.titulo === "string" && fase.titulo.toLowerCase().includes(buscaNormalizada);
    const questaoMatch =
      Array.isArray(fase.questions) &&
      fase.questions.some((q) => {
        const stemMatch =
          typeof q.stem === "string" && q.stem.toLowerCase().includes(buscaNormalizada);
        const servicoMatch =
          Array.isArray(q.services) &&
          q.services.some(
            (s) => typeof s === "string" && s.toLowerCase().includes(buscaNormalizada)
          );
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
 * Lista de conquistas e regras de desbloqueio.
 *
 * @returns {Array<{id: string, label: string, emoji: string, criterio: Function}>} Conquistas.
 */
function obterConquistasDefinicao() {
  return [
    {
      id: "primeira_resposta",
      label: "Primeiros Passos",
      emoji: "👟",
      criterio: (s) => (s.stats.totalAnswered || 0) >= 1
    },
    {
      id: "cem_questoes",
      label: "Cem Desafios",
      emoji: "💯",
      criterio: (s) => (s.stats.totalAnswered || 0) >= 100
    },
    {
      id: "streak_3",
      label: "Fogo de 3 Dias",
      emoji: "🔥",
      criterio: (s) => (s.streakDays || 0) >= 3
    },
    {
      id: "streak_7",
      label: "Fogo de 7 Dias",
      emoji: "🔥🔥",
      criterio: (s) => (s.streakDays || 0) >= 7
    },
    {
      id: "primeira_fase",
      label: "Primeira Fase Concluída",
      emoji: "🌟",
      criterio: (s) =>
        Object.values(s.phaseStats || {}).some((p) => p && p.completed) ||
        Object.values(s.phaseStats || {}).some((p) => p && p.bestPercent >= 80)
    },
    {
      id: "fase_perfeita",
      label: "Fase Perfeita",
      emoji: "⭐",
      criterio: (s) => Object.values(s.phaseStats || {}).some((p) => p && p.bestPercent === 100)
    },
    {
      id: "pet_salvo",
      label: "Salvou o Pet",
      emoji: "🐾",
      criterio: () => false
    },
    {
      id: "leitner_10",
      label: "Baralho de 10",
      emoji: "📒",
      criterio: (s) => Object.keys(s.deck || {}).length >= 10
    },
    {
      id: "simulado_aprovado",
      label: "Aprovado no Simulado",
      emoji: "✅",
      criterio: (s) =>
        (s.examHistory || []).some((e) => e && typeof e.score === "number" && e.score >= 720)
    },
    {
      id: "simulado_perfeito",
      label: "Score Máximo",
      emoji: "🏆",
      criterio: (s) =>
        (s.examHistory || []).some((e) => e && typeof e.score === "number" && e.score >= 1000)
    }
  ];
}

/**
 * Calcula as conquistas desbloqueadas e pendentes do jogador.
 *
 * @param {Object} store Estado persistente.
 * @returns {{desbloqueadas: Array<Object>, pendentes: Array<Object>}} Conquistas.
 */
function calcularConquistas(store) {
  const seguro = store || {};
  seguro.stats = seguro.stats || {};
  seguro.phaseStats = seguro.phaseStats || {};
  seguro.examHistory = seguro.examHistory || [];
  seguro.deck = seguro.deck || {};

  const conquistas = obterConquistasDefinicao();
  const desbloqueadas = [];
  const pendentes = [];
  conquistas.forEach((c) => {
    if (c.criterio(seguro)) desbloqueadas.push(c);
    else pendentes.push(c);
  });
  return { desbloqueadas, pendentes };
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
  if (!questao.id || typeof questao.id !== "string")
    erros.push("Falta o campo 'id' ou não é uma string");
  if (!questao.stem || typeof questao.stem !== "string")
    erros.push("Falta o enunciado ('stem') ou não é uma string");
  if (questao.type && typeof questao.type !== "string") erros.push("'type' deve ser uma string");

  if (!Array.isArray(questao.options) || questao.options.length < 2) {
    erros.push("Deve ter pelo menos 2 opções");
  }

  const chavesOpcoes = new Set();
  if (Array.isArray(questao.options)) {
    questao.options.forEach((opt, idx) => {
      if (!opt || typeof opt !== "object") {
        erros.push(`Opção ${idx} inválida`);
        return;
      }
      if (!opt.key || typeof opt.key !== "string")
        erros.push(`Opção ${idx} sem 'key' ou não é uma string`);
      if (!opt.text || typeof opt.text !== "string")
        erros.push(`Opção ${idx} sem 'text' ou não é uma string`);
      if (opt.key && chavesOpcoes.has(opt.key)) erros.push(`Key '${opt.key}' duplicada nas opções`);
      if (opt.key) chavesOpcoes.add(opt.key);
    });
  }

  if (!Array.isArray(questao.answers) || questao.answers.length === 0) {
    erros.push("Deve ter pelo menos 1 resposta correta ('answers')");
  } else {
    questao.answers.forEach((resp) => {
      if (typeof resp !== "string") erros.push("Cada resposta em 'answers' deve ser uma string");
      else if (!chavesOpcoes.has(resp))
        erros.push(`Resposta '${resp}' não corresponde a uma opção existente`);
    });
  }

  if (questao.hints && !Array.isArray(questao.hints)) {
    erros.push("'hints' deve ser uma lista de strings");
  } else if (Array.isArray(questao.hints)) {
    questao.hints.forEach((hint, idx) => {
      if (typeof hint !== "string") erros.push(`hint[${idx}] deve ser uma string`);
    });
  }

  if (questao.whyNots && (typeof questao.whyNots !== "object" || Array.isArray(questao.whyNots))) {
    erros.push("'whyNots' deve ser um objeto");
  } else if (questao.whyNots && typeof questao.whyNots === "object") {
    Object.entries(questao.whyNots).forEach(([chave, valor]) => {
      if (typeof valor !== "string") erros.push(`whyNots['${chave}'] deve ser uma string`);
    });
  }

  if (questao.services && !Array.isArray(questao.services)) {
    erros.push("'services' deve ser uma lista de strings");
  } else if (Array.isArray(questao.services)) {
    questao.services.forEach((s, idx) => {
      if (typeof s !== "string") erros.push(`services[${idx}] deve ser uma string`);
    });
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

  if (!banco || typeof banco !== "object" || !Array.isArray(banco.fases)) {
    relatorio.valido = false;
    relatorio.erros.push("Banco de dados sem propriedade 'fases' válida.");
    return relatorio;
  }
  if (banco.cert !== "SAA-C03") {
    relatorio.valido = false;
    relatorio.erros.push(
      "Banco com código de certificação inválido ou ausente. Esperado 'SAA-C03'."
    );
  }

  relatorio.totalFases = banco.fases.length;
  const idsFases = new Set();
  const idsQuestoes = new Set();

  banco.fases.forEach((fase, indiceFase) => {
    if (!fase || typeof fase !== "object") {
      relatorio.valido = false;
      relatorio.erros.push(`Fase no índice ${indiceFase} não é um objeto válido.`);
      return;
    }
    if (!fase.id || typeof fase.id !== "string") {
      relatorio.valido = false;
      relatorio.erros.push(`Fase no índice ${indiceFase} sem ID válido.`);
    } else if (idsFases.has(fase.id)) {
      relatorio.valido = false;
      relatorio.erros.push(`ID de fase duplicado: '${fase.id}'.`);
    } else {
      idsFases.add(fase.id);
    }
    if (!fase.titulo || typeof fase.titulo !== "string") {
      relatorio.valido = false;
      relatorio.erros.push(`Fase '${fase.id || indiceFase}' sem título válido.`);
    }

    if (!Array.isArray(fase.questions) || fase.questions.length === 0) {
      relatorio.valido = false;
      relatorio.erros.push(`Fase '${fase.id || indiceFase}' deve conter pelo menos uma questão.`);
      return;
    }

    relatorio.totalQuestoes += fase.questions.length;

    fase.questions.forEach((q) => {
      const checagem = validarQuestao(q);
      const qId =
        q && typeof q === "object" && !Array.isArray(q) && typeof q.id === "string" ? q.id : null;
      if (!checagem.valida) {
        relatorio.valido = false;
        relatorio.erros.push(`Questão '${qId || "sem_id"}': ${checagem.erros.join(", ")}`);
        return;
      }
      if (qId && idsQuestoes.has(qId)) {
        relatorio.valido = false;
        relatorio.erros.push(`Questão com ID duplicado: '${qId}'.`);
      }
      if (qId) idsQuestoes.add(qId);
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
    pet: pet || { id: "cat", name: "Gatinho", emoji: "🐱", word: "Mimi" },
    acertos: 0,
    erros: 0,
    maxErros,
    metaAcertos,
    status: "em_andamento" // 'em_andamento', 'salvo', 'derrota'
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
      novoEstado.status = "salvo";
    }
  } else {
    novoEstado.erros += 1;
    if (novoEstado.erros >= novoEstado.maxErros) {
      novoEstado.status = "derrota";
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
    status: "em_andamento" // 'em_andamento', 'derrota'
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
    novoEstado.acertosConsecutivos = 0;
    novoEstado.erros += 1;
    if (novoEstado.erros >= novoEstado.maxErros) {
      novoEstado.status = "derrota";
    }
  }

  return novoEstado;
}

/**
 * Inicializa o estado do jogo para o modo "Simulado".
 *
 * @param {number} [totalQuestoes=65] Quantidade total de questões do simulado.
 * @param {number} [tempoMinutos=130] Tempo total em minutos.
 * @returns {Object} Estado inicial do modo Simulado.
 */
function criarEstadoSimulado(totalQuestoes = 65, tempoMinutos = 130) {
  return {
    indice: 0,
    acertos: 0,
    erros: 0,
    total: totalQuestoes,
    tempoMinutos: tempoMinutos,
    tempoFimMs: Date.now() + tempoMinutos * 60 * 1000,
    status: "em_andamento" // 'em_andamento', 'finalizado', 'timeout'
  };
}

/**
 * Processa a resposta do jogador no modo Simulado.
 *
 * @param {Object} estadoSimulado Estado atual do modo Simulado.
 * @param {boolean} acertou Se a resposta foi correta.
 * @returns {Object} Novo estado do modo Simulado.
 */
function processarRespostaSimulado(estadoSimulado, acertou) {
  const novoEstado = { ...estadoSimulado };

  if (acertou) {
    novoEstado.acertos += 1;
  } else {
    novoEstado.erros += 1;
  }

  novoEstado.indice += 1;
  if (novoEstado.indice >= novoEstado.total) {
    novoEstado.status = "finalizado";
  }

  return novoEstado;
}

/**
 * Calcula o score em escala AWS (100 - 1000) a partir da porcentagem de acertos.
 *
 * @param {number} acertos Quantidade de respostas corretas.
 * @param {number} total Quantidade total de questões.
 * @returns {number} Score na escala 100 a 1000.
 */
function calcularScoreAWS(acertos, total) {
  if (total <= 0) return 100;
  const percentual = acertos / total;
  return Math.round(100 + percentual * 900);
}

/**
 * Retorna o tempo restante, em segundos, do modo Simulado.
 *
 * @param {number} tempoFimMs Timestamp de término.
 * @param {number} [agoraMs] Timestamp atual (padrão Date.now()).
 * @returns {number} Segundos restantes (mínimo 0).
 */
function calcularTempoRestanteSimulado(tempoFimMs, agoraMs = Date.now()) {
  const restanteMs = Math.max(0, tempoFimMs - agoraMs);
  return Math.ceil(restanteMs / 1000);
}

// Exportação compatível com Node.js (CommonJS) e Navegador (Global/UMD)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MILISSEGUNDOS_POR_DIA,
    INTERVALOS_LEITNER_DIAS,
    obterDataAtualMs,
    calcularAgendamentoLeitner,
    adicionarAoLeitner,
    obterCartoesDevidos,
    calcularGanhoXP,
    DOMINIOS_AWS,
    obterCategoriaFase,
    obterDominioFase,
    obterEstatisticasServicos,
    calcularReadiness,
    classificarReadiness,
    calcularConquistas,
    obterConquistasDefinicao,
    filtrarFases,
    sanitizarTermoBusca,
    embaralharArray,
    validarQuestao,
    validarBancoDados,
    criarEstadoPet,
    processarRespostaPet,
    criarEstadoSobrevivencia,
    processarRespostaSobrevivencia,
    criarEstadoSimulado,
    processarRespostaSimulado,
    calcularScoreAWS,
    calcularTempoRestanteSimulado
  };
} else if (typeof window !== "undefined") {
  window.JogoCore = {
    MILISSEGUNDOS_POR_DIA,
    INTERVALOS_LEITNER_DIAS,
    obterDataAtualMs,
    calcularAgendamentoLeitner,
    adicionarAoLeitner,
    obterCartoesDevidos,
    calcularGanhoXP,
    DOMINIOS_AWS,
    obterCategoriaFase,
    obterDominioFase,
    obterEstatisticasServicos,
    calcularReadiness,
    classificarReadiness,
    calcularConquistas,
    obterConquistasDefinicao,
    filtrarFases,
    sanitizarTermoBusca,
    embaralharArray,
    validarQuestao,
    validarBancoDados,
    criarEstadoPet,
    processarRespostaPet,
    criarEstadoSobrevivencia,
    processarRespostaSobrevivencia,
    criarEstadoSimulado,
    processarRespostaSimulado,
    calcularScoreAWS,
    calcularTempoRestanteSimulado
  };
}
