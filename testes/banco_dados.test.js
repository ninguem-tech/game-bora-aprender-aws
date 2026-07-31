const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  validarQuestao,
  validarBancoDados,
  obterCategoriaFase,
  obterDominioFase,
  DOMINIOS_AWS,
  obterEstatisticasServicos,
  calcularReadiness,
  classificarReadiness,
  filtrarFases,
  sanitizarTermoBusca,
  embaralharArray
} = require("../src/jogo.js");

// Carrega o banco de dados oficial do projeto
global.window = {};
require("../data/bank.js");
const bancoOficialAWS = global.window.AWS_BANK;

describe("Validação do Banco de Dados e Utilitários", () => {
  describe("Integridade do Banco Oficial (data/bank.js)", () => {
    it("deve possuir o código da certificação e o título definidos", () => {
      assert.equal(bancoOficialAWS.cert, "SAA-C03", "O código da certificação deve ser SAA-C03");
      assert.ok(bancoOficialAWS.titulo, "O título do banco deve estar preenchido");
    });

    it("deve ter fases válidas no banco oficial", () => {
      assert.ok(Array.isArray(bancoOficialAWS.fases), "As fases devem ser uma lista");
      assert.ok(
        bancoOficialAWS.fases.length > 0,
        "O banco oficial deve conter pelo menos uma fase"
      );
    });

    it("deve passar com sucesso pela função de validação de integridade", () => {
      const relatorio = validarBancoDados(bancoOficialAWS);
      assert.ok(
        relatorio.valido,
        `O banco oficial deve ser válido. Erros: ${relatorio.erros.join("; ")}`
      );
      assert.ok(relatorio.totalQuestoes > 0, "Deve contabilizar questões válidas");
    });

    it("deve retornar relatório inválido sem lançar exceção ao conter questão nula", () => {
      const banco = {
        cert: "SAA-C03",
        fases: [
          {
            id: "fase-teste",
            titulo: "Fase Teste",
            questions: [
              null,
              {
                id: "q-valida",
                stem: "Pergunta válida",
                options: [
                  { key: "A", text: "Opção A" },
                  { key: "B", text: "Opção B" }
                ],
                answers: ["A"]
              }
            ]
          }
        ]
      };

      const relatorio = validarBancoDados(banco);
      assert.ok(!relatorio.valido);
      assert.ok(relatorio.erros.some((err) => err.includes("sem_id")));
    });
  });

  describe("Validação de Questões Individuais", () => {
    it("deve aprovar uma questão no formato correto", () => {
      const questaoValida = {
        id: "q-teste-1",
        stem: "O que é o Amazon S3?",
        options: [
          { key: "A", text: "Serviço de armazenamento de objetos" },
          { key: "B", text: "Banco de dados relacional" }
        ],
        answers: ["A"]
      };

      const resultado = validarQuestao(questaoValida);
      assert.ok(resultado.valida, "A questão válida deve ser aprovada");
      assert.equal(resultado.erros.length, 0);
    });

    it("deve rejeitar questões incompletas ou malformadas", () => {
      const questaoSemOpcoes = {
        id: "q-invalida",
        stem: "Pergunta sem opções",
        options: [],
        answers: ["A"]
      };

      const resultado = validarQuestao(questaoSemOpcoes);
      assert.ok(!resultado.valida, "A questão sem opções deve ser rejeitada");
      assert.ok(resultado.erros.some((err) => err.includes("opções")));
    });

    it("deve rejeitar resposta que não corresponde a uma opção existente", () => {
      const questaoRespostaInvalida = {
        id: "q-resp-invalida",
        stem: "Pergunta com resposta fora das opções",
        options: [
          { key: "A", text: "Opção A" },
          { key: "B", text: "Opção B" }
        ],
        answers: ["C"]
      };

      const resultado = validarQuestao(questaoRespostaInvalida);
      assert.ok(!resultado.valida, "A questão com resposta inexistente deve ser rejeitada");
      assert.ok(resultado.erros.some((err) => err.includes("Resposta")));
    });

    it("deve rejeitar opções com keys duplicadas", () => {
      const questaoKeysDuplicadas = {
        id: "q-keys-duplicadas",
        stem: "Pergunta com keys duplicadas",
        options: [
          { key: "A", text: "Opção 1" },
          { key: "A", text: "Opção 2" }
        ],
        answers: ["A"]
      };

      const resultado = validarQuestao(questaoKeysDuplicadas);
      assert.ok(!resultado.valida);
      assert.ok(resultado.erros.some((err) => err.includes("duplicada")));
    });

    it("deve rejeitar hints, services e whyNots com valores não textuais", () => {
      const questaoTiposInvalidos = {
        id: "q-tipos",
        stem: "Pergunta com tipos inválidos",
        options: [
          { key: "A", text: "Opção A" },
          { key: "B", text: "Opção B" }
        ],
        answers: ["A"],
        hints: [123],
        services: [42],
        whyNots: { B: 404 }
      };

      const resultado = validarQuestao(questaoTiposInvalidos);
      assert.ok(!resultado.valida);
      assert.ok(resultado.erros.some((err) => err.includes("hint")));
      assert.ok(resultado.erros.some((err) => err.includes("services")));
      assert.ok(resultado.erros.some((err) => err.includes("whyNots")));
    });
  });

  describe("Classificação de Categorias e Filtro de Fases", () => {
    it("deve categorizar títulos de fases corretamente", () => {
      assert.equal(obterCategoriaFase("Fundamentos da Nuvem"), "fundamentos");
      assert.equal(obterCategoriaFase("Computação e Rede (EC2, VPC)"), "computacao");
      assert.equal(obterCategoriaFase("Segurança e IAM"), "seguranca");
      assert.equal(obterCategoriaFase("Armazenamento e Bancos S3"), "dados");
      assert.equal(obterCategoriaFase("Simulado 1"), "simulados");
      assert.equal(
        obterCategoriaFase("Segurança de Rede, Certificados e Investigação"),
        "seguranca"
      );
      assert.equal(obterCategoriaFase("VPC — Fundamentos de Rede"), "computacao");
    });

    it("deve filtrar fases por palavra-chave de busca", () => {
      const listaFasesFicticia = [
        {
          id: "f1",
          titulo: "Fundamentos da Nuvem",
          questions: [{ stem: "O que é EC2?", services: ["ec2"] }]
        },
        {
          id: "f2",
          titulo: "Armazenamento S3",
          questions: [{ stem: "O que é S3?", services: ["s3"] }]
        }
      ];

      const resultadoBusca = filtrarFases(listaFasesFicticia, "S3", "todas");
      assert.equal(resultadoBusca.length, 1, "Deve retornar apenas a fase com S3");
      assert.equal(resultadoBusca[0].id, "f2");
    });

    it("deve filtrar fases por categoria temática", () => {
      const listaFasesFicticia = [
        { id: "f1", titulo: "Fundamentos da Nuvem", questions: [] },
        { id: "f2", titulo: "Computação e Rede (EC2)", questions: [] }
      ];

      const apenasFundamentos = filtrarFases(listaFasesFicticia, "", "fundamentos");
      assert.equal(apenasFundamentos.length, 1);
      assert.equal(apenasFundamentos[0].id, "f1");
    });
  });

  describe("Sanitização do Termo de Busca", () => {
    it("deve normalizar espaços e converter para minúsculas", () => {
      assert.equal(sanitizarTermoBusca("  EC2  "), "ec2");
      assert.equal(sanitizarTermoBusca("S3 Glacier"), "s3 glacier");
    });

    it("deve remover caracteres de controle e null bytes", () => {
      assert.equal(sanitizarTermoBusca("EC2\x00\x01\x1F\x7F"), "ec2");
      assert.equal(sanitizarTermoBusca("\n\rIAM\t"), "iam");
    });

    it("deve limitar o tamanho máximo padrão do termo", () => {
      const longo = "a".repeat(200);
      const resultado = sanitizarTermoBusca(longo);
      assert.equal(resultado.length, 100);
      assert.equal(resultado, "a".repeat(100));
    });

    it("deve aceitar tamanho máximo customizado", () => {
      const termo = "a".repeat(50);
      assert.equal(sanitizarTermoBusca(termo, 10).length, 10);
      assert.equal(sanitizarTermoBusca(termo, 10), "a".repeat(10));
    });

    it("deve retornar string vazia para entradas inválidas", () => {
      assert.equal(sanitizarTermoBusca(null), "");
      assert.equal(sanitizarTermoBusca(undefined), "");
      assert.equal(sanitizarTermoBusca(123), "");
      assert.equal(sanitizarTermoBusca({}), "");
    });

    it("deve retornar vazio quando o termo contém apenas caracteres de controle", () => {
      assert.equal(sanitizarTermoBusca("\x00\x01\x02\x03"), "");
      assert.equal(sanitizarTermoBusca("   "), "");
    });

    it("deve manter caracteres unicode e acentuação válidos", () => {
      assert.equal(sanitizarTermoBusca("Computação"), "computação");
      assert.equal(sanitizarTermoBusca("Serviços"), "serviços");
    });

    it("deve usar termo sanitizado ao filtrar fases", () => {
      const fases = [
        { id: "f1", titulo: "Fundamentos EC2", questions: [] },
        { id: "f2", titulo: "Armazenamento S3", questions: [] }
      ];
      const resultado = filtrarFases(fases, "  EC2\x00\n  ", "todas");
      assert.equal(resultado.length, 1);
      assert.equal(resultado[0].id, "f1");
    });
  });

  describe("Estatísticas de Serviços", () => {
    it("deve listar serviços ordenados por frequência e sem alterar o banco", () => {
      const fasesFicticias = [
        {
          id: "f1",
          titulo: "Armazenamento",
          questions: [
            { stem: "S3?", services: ["s3", "s3"] },
            { stem: "EBS?", services: ["ebs"] }
          ]
        },
        {
          id: "f2",
          titulo: "Rede",
          questions: [{ stem: "EC2?", services: ["ec2", "s3"] }]
        }
      ];

      const stats = obterEstatisticasServicos(fasesFicticias);
      assert.equal(stats.length, 3);
      assert.equal(stats[0].nome, "s3");
      assert.equal(stats[0].total, 3);
      assert.equal(stats[1].nome, "ebs");
      assert.equal(stats[2].nome, "ec2");
      assert.ok(Array.isArray(stats[0].fases));
    });

    it("deve retornar lista vazia para entradas inválidas", () => {
      assert.deepStrictEqual(obterEstatisticasServicos(null), []);
      assert.deepStrictEqual(obterEstatisticasServicos([]), []);
    });
  });

  describe("Domínio AWS da Fase", () => {
    it("deve classificar domínios a partir do título da fase", () => {
      assert.equal(obterDominioFase("EC2 — Modelos de Preço"), "computacao");
      assert.equal(obterDominioFase("S3 — Recursos Avançados"), "armazenamento");
      assert.equal(obterDominioFase("IAM e Identidade"), "seguranca");
      assert.equal(obterDominioFase("Bancos de Dados — Aprofundamento"), "banco_de_dados");
      assert.equal(obterDominioFase("VPC — Fundamentos de Rede"), "rede");
      assert.equal(obterDominioFase("CloudWatch e Monitoramento"), "governanca");
      assert.equal(obterDominioFase("SQS, SNS e API Gateway"), "aplicacao");
      assert.equal(obterDominioFase("RDS e DynamoDB"), "banco_de_dados");
      assert.equal(obterDominioFase("Fundamentos da Nuvem"), "fundamentos");
    });

    it("deve expor a lista de domínios AWS suportados", () => {
      assert.ok(DOMINIOS_AWS.length > 0);
      assert.ok(DOMINIOS_AWS.some((d) => d.id === "computacao"));
      assert.ok(DOMINIOS_AWS.every((d) => d.id && d.label));
    });
  });

  describe("Prontidão para o exame (Readiness)", () => {
    it("deve retornar 0 para estado inválido ou vazio", () => {
      assert.equal(calcularReadiness(null, 10), 0);
      assert.equal(calcularReadiness({}, 10), 0);
    });

    it("deve ponderar acurácia, fases e score de simulado", () => {
      const store = {
        stats: { totalAnswered: 100, totalCorrect: 80 },
        phaseStats: { f1: { completed: true }, f2: { completed: true } },
        examHistory: [{ date: "2024-01-01", score: 800, acertos: 52, total: 65, tempoMinutos: 90 }]
      };
      // accuracy=80*0.35=28; fases=20/10=20%*0.25=5; simulado=800/1000*40=32 -> total=65
      const readiness = calcularReadiness(store, 10);
      assert.equal(readiness, 65);
    });

    it("deve classificar o nível de prontidão com labels e cores", () => {
      assert.equal(classificarReadiness(85).label, "Pronto para o exame!");
      assert.equal(classificarReadiness(65).label, "Em progresso sólido");
      assert.equal(classificarReadiness(30).label, "Começando a jornada");
    });
  });

  describe("Embaralhar Array", () => {
    it("deve retornar um novo array com a mesma quantidade de elementos", () => {
      const entradaOriginal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const resultadoEmbaralhado = embaralharArray(entradaOriginal);

      assert.equal(resultadoEmbaralhado.length, entradaOriginal.length);
      assert.notEqual(
        resultadoEmbaralhado,
        entradaOriginal,
        "Deve retornar uma cópia do array, não a mesma referência"
      );
      assert.ok(
        entradaOriginal.every((item) => resultadoEmbaralhado.includes(item)),
        "Todos os itens originais devem estar presentes"
      );
    });
  });
});
