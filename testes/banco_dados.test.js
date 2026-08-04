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
  MINIMO_RESPOSTAS_PRONTIDAO,
  prontidaoEhConfiavel,
  filtrarFases,
  sanitizarTermoBusca,
  embaralharArray,
  embaralharOpcoes,
  ROTULOS_OPCOES
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

    it("não deve concentrar o gabarito em uma única letra", () => {
      // Se uma letra concentra a maioria das respostas, a posição vira a
      // resposta: o jogador acerta chutando sempre a mesma tecla, sem ler o
      // enunciado, e o cálculo de prontidão passa a medir o hábito, não o estudo.
      const LIMITE_CONCENTRACAO = 0.4;
      const ocorrencias = {};
      let totalComGabarito = 0;

      bancoOficialAWS.fases.forEach((fase) => {
        (fase.questions || []).forEach((questao) => {
          const respostas = questao && questao.answers;
          if (!Array.isArray(respostas) || respostas.length !== 1) return;
          ocorrencias[respostas[0]] = (ocorrencias[respostas[0]] || 0) + 1;
          totalComGabarito++;
        });
      });

      assert.ok(totalComGabarito > 0, "O banco deve ter questões com gabarito único");

      Object.entries(ocorrencias).forEach(([letra, quantidade]) => {
        const proporcao = quantidade / totalComGabarito;
        assert.ok(
          proporcao <= LIMITE_CONCENTRACAO,
          `A resposta '${letra}' concentra ${(proporcao * 100).toFixed(1)}% do gabarito ` +
            `(${quantidade}/${totalComGabarito}), acima do limite de ` +
            `${LIMITE_CONCENTRACAO * 100}%. Rode 'python3 data/build-bank.py' para redistribuir.`
        );
      });
    });

    it("deve usar todas as posições disponíveis como gabarito", () => {
      const posicoes = new Set();
      bancoOficialAWS.fases.forEach((fase) => {
        (fase.questions || []).forEach((questao) => {
          const respostas = questao && questao.answers;
          if (Array.isArray(respostas) && respostas.length === 1) posicoes.add(respostas[0]);
        });
      });

      assert.ok(
        posicoes.size >= 4,
        `O gabarito deveria usar as 4 posições; usa apenas: ${[...posicoes].sort().join(", ")}`
      );
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

    it("deve rejeitar difficulty fora do conjunto suportado pelo jogo", () => {
      const questao = {
        id: "q-diff",
        stem: "Pergunta com difficulty inválida",
        difficulty: "extremo",
        options: [
          { key: "A", text: "Opção A" },
          { key: "B", text: "Opção B" }
        ],
        answers: ["A"]
      };

      const resultado = validarQuestao(questao);
      assert.ok(!resultado.valida);
      assert.ok(resultado.erros.some((err) => err.includes("difficulty")));
    });

    it("deve rejeitar mais de 4 opções (limite dos atalhos de teclado)", () => {
      const opcoes = ["A", "B", "C", "D", "E"].map((key) => ({ key, text: "Opção " + key }));
      const questao = {
        id: "q-5-opcoes",
        stem: "Pergunta com 5 opções",
        options: opcoes,
        answers: ["A"]
      };

      const resultado = validarQuestao(questao);
      assert.ok(!resultado.valida);
      assert.ok(resultado.erros.some((err) => err.includes("4 opções")));
    });

    it("deve rejeitar type diferente de single (único formato jogável)", () => {
      const questao = {
        id: "q-type",
        stem: "Pergunta com type inválido",
        type: "multipla",
        options: [
          { key: "A", text: "Opção A" },
          { key: "B", text: "Opção B" }
        ],
        answers: ["A"]
      };

      const resultado = validarQuestao(questao);
      assert.ok(!resultado.valida);
      assert.ok(resultado.erros.some((err) => err.includes("'type'")));
    });

    it("deve aprovar questão com difficulty e type válidos", () => {
      const questao = {
        id: "q-completa",
        stem: "Pergunta completa",
        difficulty: "exam",
        type: "single",
        options: [
          { key: "A", text: "Opção A" },
          { key: "B", text: "Opção B" }
        ],
        answers: ["A"]
      };

      const resultado = validarQuestao(questao);
      assert.ok(resultado.valida, `Erros: ${resultado.erros.join(", ")}`);
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

    it("deve classificar fase de aplicação mesmo quando cita CloudFront", () => {
      assert.equal(
        obterDominioFase("Serviços de Aplicação (Lambda, Filas, CloudFront, Containers)"),
        "aplicacao"
      );
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

    describe("prontidaoEhConfiavel (gate de exibição)", () => {
      it("não deve ser confiável abaixo do mínimo de respostas", () => {
        assert.equal(prontidaoEhConfiavel(0), false);
        assert.equal(prontidaoEhConfiavel(1), false);
        assert.equal(prontidaoEhConfiavel(MINIMO_RESPOSTAS_PRONTIDAO - 1), false);
      });

      it("deve ser confiável ao atingir o mínimo de respostas", () => {
        assert.equal(prontidaoEhConfiavel(MINIMO_RESPOSTAS_PRONTIDAO), true);
        assert.equal(prontidaoEhConfiavel(MINIMO_RESPOSTAS_PRONTIDAO + 50), true);
      });

      it("deve aceitar um mínimo customizado", () => {
        assert.equal(prontidaoEhConfiavel(2, 3), false);
        assert.equal(prontidaoEhConfiavel(3, 3), true);
      });

      it("deve tratar entradas inválidas como zero respostas", () => {
        assert.equal(prontidaoEhConfiavel(null), false);
        assert.equal(prontidaoEhConfiavel(undefined), false);
        assert.equal(prontidaoEhConfiavel(NaN), false);
      });
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

  describe("Embaralhar Opções da Questão", () => {
    const questaoExemplo = {
      id: "q-embaralha",
      stem: "Pergunta",
      options: [
        { key: "A", text: "Alternativa A" },
        { key: "B", text: "Alternativa B" },
        { key: "C", text: "Alternativa C" },
        { key: "D", text: "Alternativa D" }
      ],
      answers: ["C"],
      whyNots: { A: "não", B: "não", D: "não" }
    };

    // Embaralhamento controlado: inverte a ordem, para tornar o mapeamento observável.
    const inverter = (lista) => lista.slice().reverse();

    it("deve preservar a key original de cada alternativa", () => {
      const embaralhadas = embaralharOpcoes(questaoExemplo, inverter);

      assert.deepEqual(
        embaralhadas.map((o) => o.key),
        ["D", "C", "B", "A"],
        "A key original acompanha o texto, para answers e whyNots continuarem válidos"
      );
      embaralhadas.forEach((opcao) => {
        const original = questaoExemplo.options.find((o) => o.key === opcao.key);
        assert.equal(opcao.text, original.text, "Cada key deve manter o seu texto");
      });
    });

    it("deve atribuir o rótulo exibido pela posição na tela", () => {
      const embaralhadas = embaralharOpcoes(questaoExemplo, inverter);

      assert.deepEqual(
        embaralhadas.map((o) => o.rotulo),
        ["A", "B", "C", "D"]
      );
      assert.equal(
        embaralhadas.find((o) => o.key === "C").rotulo,
        "B",
        "A alternativa correta ('C') passa a ser exibida na segunda posição"
      );
    });

    it("deve manter o gabarito resolvível pela key após embaralhar", () => {
      const embaralhadas = embaralharOpcoes(questaoExemplo, inverter);
      const corretas = embaralhadas.filter((o) => questaoExemplo.answers.includes(o.key));

      assert.equal(corretas.length, 1, "Deve haver exatamente uma alternativa correta");
      assert.equal(corretas[0].text, "Alternativa C");
    });

    it("não deve modificar as opções originais da questão", () => {
      const copiaAntes = JSON.parse(JSON.stringify(questaoExemplo.options));
      embaralharOpcoes(questaoExemplo, inverter);

      assert.deepEqual(questaoExemplo.options, copiaAntes, "O banco não pode ser mutado");
    });

    it("deve distribuir a posição da correta ao longo de várias apresentações", () => {
      const posicoes = new Set();
      for (let tentativa = 0; tentativa < 200; tentativa++) {
        const embaralhadas = embaralharOpcoes(questaoExemplo);
        posicoes.add(embaralhadas.findIndex((o) => o.key === "C"));
      }

      assert.equal(posicoes.size, 4, "A correta deve aparecer nas 4 posições ao longo do tempo");
    });

    it("deve tolerar questão sem opções", () => {
      assert.deepEqual(embaralharOpcoes({}), []);
      assert.deepEqual(embaralharOpcoes(null), []);
      assert.deepEqual(embaralharOpcoes({ options: "não é lista" }), []);
    });

    it("deve expor os rótulos das quatro posições", () => {
      assert.deepEqual(ROTULOS_OPCOES, ["A", "B", "C", "D"]);
    });
  });
});
