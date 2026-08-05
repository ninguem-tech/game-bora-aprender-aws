#!/usr/bin/env python3
import json
import os
import sys
import tempfile
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
sys.path.insert(0, DATA_DIR)

import importlib.util
spec = importlib.util.spec_from_file_location("build_bank", os.path.join(DATA_DIR, "build-bank.py"))
build_bank = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_bank)


class TestBuildBankUnit(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.test_dir.cleanup()

    def test_load_supplement_questions_sucesso(self):
        file_path = os.path.join(self.test_dir.name, "test-valid.json")
        data = {"questions": [{"id": 1, "pergunta": "O que é S3?"}]}
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

        questions = build_bank.load_supplement_questions(file_path)
        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0]["id"], 1)

    def test_load_supplement_questions_arquivo_inexistente(self):
        file_path = os.path.join(self.test_dir.name, "inexistente.json")
        with self.assertRaises(FileNotFoundError):
            build_bank.load_supplement_questions(file_path)

    def test_load_supplement_questions_json_invalido(self):
        file_path = os.path.join(self.test_dir.name, "invalido.json")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("esto-nao-e-json")

        # ValueError (não json.JSONDecodeError cru) porque a mensagem precisa
        # nomear o arquivo: com ~50 suplementos no MANIFEST, um traceback sem
        # o caminho não diz qual arquivo está quebrado.
        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn(file_path, str(ctx.exception))

    def test_load_supplement_questions_sem_chave_questions(self):
        file_path = os.path.join(self.test_dir.name, "sem-questions.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"outra_chave": []}, f)

        with self.assertRaises(ValueError):
            build_bank.load_supplement_questions(file_path)

    def test_load_supplement_questions_rejeita_servico_descontinuado(self):
        file_path = os.path.join(self.test_dir.name, "qldb.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": "q-01", "services": ["qldb"]}]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("descontinuado", str(ctx.exception).lower())

    def test_load_supplement_questions_rejeita_mention_textual_qlodb(self):
        file_path = os.path.join(self.test_dir.name, "qldb-texto.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": "q-02", "stem": "QLDB é legal?"}]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("descontinuado", str(ctx.exception).lower())

    def test_load_supplement_questions_rejeita_elemento_invalido(self):
        file_path = os.path.join(self.test_dir.name, "malformado.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [7]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("objeto", str(ctx.exception).lower())

    def test_load_supplement_questions_rejeita_services_nao_string(self):
        file_path = os.path.join(self.test_dir.name, "services-errado.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": "q-03", "services": [42]}]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("services", str(ctx.exception).lower())

    def test_load_supplement_questions_rejeita_mention_em_hints(self):
        file_path = os.path.join(self.test_dir.name, "qldb-hints.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": "q-04", "hints": ["Use o QLDB"]}]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("descontinuado", str(ctx.exception).lower())

    def test_load_supplement_questions_rejeita_mention_em_whynots(self):
        file_path = os.path.join(self.test_dir.name, "qldb-whynots.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": "q-05", "whyNots": {"A": "QLDB seria melhor"}}]}, f)

        with self.assertRaises(ValueError) as ctx:
            build_bank.load_supplement_questions(file_path)
        self.assertIn("descontinuado", str(ctx.exception).lower())

    def test_build_bank_data_estrutura(self):
        file_path = os.path.join(self.test_dir.name, "supp-1.json")
        questao_valida = {
            "id": "q-101",
            "stem": "O que é o S3?",
            "explanation": "Armazenamento de objetos.",
            "options": [{"key": "A", "text": "Objetos"}, {"key": "B", "text": "Blocos"}],
            "answers": ["A"],
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [questao_valida]}, f)

        manifest = [("fase-teste", "Fase Teste", ["supp-1.json"])]
        bank_data = build_bank.build_bank_data(manifest, data_dir=self.test_dir.name)

        self.assertEqual(bank_data["cert"], "SAA-C03")
        self.assertEqual(bank_data["titulo"], "E aí? Bora Aprender AWS?")
        self.assertEqual(len(bank_data["fases"]), 1)
        self.assertEqual(bank_data["fases"][0]["id"], "fase-teste")
        self.assertEqual(len(bank_data["fases"][0]["questions"]), 1)

    def test_generate_bank_js(self):
        bank_data = {"cert": "SAA-C03", "titulo": "Teste", "fases": []}
        out_file = os.path.join(self.test_dir.name, "bank.js")

        build_bank.generate_bank_js(bank_data, out_file)
        self.assertTrue(os.path.exists(out_file))

        with open(out_file, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertTrue(content.startswith("window.AWS_BANK = "))
        self.assertTrue(content.endswith(";\n"))
        json_payload = content[len("window.AWS_BANK = ") : -2]
        parsed = json.loads(json_payload)
        self.assertEqual(parsed["cert"], "SAA-C03")

    def test_validar_arquivo_gerado_aceita_arquivo_correto(self):
        bank_data = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [{"id": "f1", "titulo": "Fase", "questions": [{"id": "q1", "stem": "x"}]}],
        }
        out_file = os.path.join(self.test_dir.name, "bank.js")
        build_bank.generate_bank_js(bank_data, out_file)

        build_bank._validar_arquivo_gerado(out_file, bank_data)  # não deve levantar

    def test_validar_arquivo_gerado_detecta_questoes_faltando(self):
        bank_data_completo = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [
                {
                    "id": "f1",
                    "titulo": "Fase",
                    "questions": [{"id": "q1", "stem": "x"}, {"id": "q2", "stem": "y"}],
                }
            ],
        }
        bank_data_truncado = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [{"id": "f1", "titulo": "Fase", "questions": [{"id": "q1", "stem": "x"}]}],
        }
        out_file = os.path.join(self.test_dir.name, "bank.js")
        # Escreve o arquivo com só 1 questão, mas valida contra bank_data_completo
        # (2 questões) — simula uma divergência entre o que foi gerado em disco
        # e o que estava em memória.
        build_bank.generate_bank_js(bank_data_truncado, out_file)

        with self.assertRaises(ValueError) as ctx:
            build_bank._validar_arquivo_gerado(out_file, bank_data_completo)
        self.assertIn("Integridade", str(ctx.exception))

    def test_validar_arquivo_gerado_detecta_fase_faltando(self):
        bank_data_completo = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [
                {"id": "f1", "titulo": "Fase 1", "questions": [{"id": "q1", "stem": "x"}]},
                {"id": "f2", "titulo": "Fase 2", "questions": [{"id": "q2", "stem": "y"}]},
            ],
        }
        bank_data_truncado = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [{"id": "f1", "titulo": "Fase 1", "questions": [{"id": "q1", "stem": "x"}]}],
        }
        out_file = os.path.join(self.test_dir.name, "bank.js")
        build_bank.generate_bank_js(bank_data_truncado, out_file)

        with self.assertRaises(ValueError) as ctx:
            build_bank._validar_arquivo_gerado(out_file, bank_data_completo)
        self.assertIn("Integridade", str(ctx.exception))


class TestRedistribuicaoGabarito(unittest.TestCase):
    """Testes da redistribuição do gabarito entre as posições.

    Os suplementos são escritos com a alternativa correta sempre em "A". Sem a
    redistribuição, a posição vira a resposta e o jogador acerta chutando uma
    letra fixa, sem ler o enunciado.
    """

    def _questao(self, qid="q1", correta="A", total=4):
        letras = build_bank.LETRAS_OPCOES[:total]
        return {
            "id": qid,
            "stem": f"Enunciado da questão {qid}?",
            "explanation": "Explicação da resposta correta.",
            "options": [{"key": k, "text": f"texto {k}"} for k in letras],
            "answers": [correta],
            "whyNots": {k: f"porque não {k}" for k in letras if k != correta},
        }

    def test_move_a_correta_para_a_posicao_alvo(self):
        questao = self._questao()

        redistribuida = build_bank.redistribuir_gabarito(questao, posicao_alvo=2)

        self.assertEqual(redistribuida["answers"], ["C"])
        self.assertEqual(redistribuida["options"][2]["text"], "texto A")

    def test_reatribui_as_letras_pela_posicao(self):
        questao = self._questao()

        redistribuida = build_bank.redistribuir_gabarito(questao, posicao_alvo=1)

        self.assertEqual([o["key"] for o in redistribuida["options"]], ["A", "B", "C", "D"])

    def test_remapeia_why_nots_para_as_novas_letras(self):
        questao = self._questao()

        redistribuida = build_bank.redistribuir_gabarito(questao, posicao_alvo=3)

        chave_correta = redistribuida["answers"][0]
        self.assertNotIn(chave_correta, redistribuida["whyNots"])
        self.assertEqual(len(redistribuida["whyNots"]), 3)
        for opcao in redistribuida["options"]:
            if opcao["key"] == chave_correta:
                continue
            # O texto de cada whyNot deve continuar casando com a alternativa certa.
            letra_original = opcao["text"].split()[-1]
            self.assertEqual(
                redistribuida["whyNots"][opcao["key"]], f"porque não {letra_original}"
            )

    def test_preserva_o_conjunto_de_alternativas(self):
        questao = self._questao()

        redistribuida = build_bank.redistribuir_gabarito(questao, posicao_alvo=2)

        self.assertEqual(
            sorted(o["text"] for o in redistribuida["options"]),
            sorted(o["text"] for o in questao["options"]),
        )

    def test_nao_muta_a_questao_original(self):
        questao = self._questao()
        copia = json.loads(json.dumps(questao))

        build_bank.redistribuir_gabarito(questao, posicao_alvo=2)

        self.assertEqual(questao, copia)

    def test_e_deterministica(self):
        primeira = build_bank.redistribuir_gabarito(self._questao(), posicao_alvo=1)
        segunda = build_bank.redistribuir_gabarito(self._questao(), posicao_alvo=1)

        self.assertEqual(primeira, segunda)

    def test_funciona_com_tres_alternativas(self):
        questao = self._questao(total=3)

        redistribuida = build_bank.redistribuir_gabarito(questao, posicao_alvo=2)

        self.assertEqual(redistribuida["answers"], ["C"])
        self.assertEqual(len(redistribuida["options"]), 3)

    def test_ignora_questao_sem_opcoes(self):
        questao = {"id": "sem-opcoes"}

        self.assertEqual(build_bank.redistribuir_gabarito(questao, 0), questao)

    def test_ignora_questao_com_gabarito_ausente_nas_opcoes(self):
        questao = self._questao()
        questao["answers"] = ["Z"]

        self.assertEqual(build_bank.redistribuir_gabarito(questao, 1), questao)

    def test_ignora_questao_com_multiplas_respostas(self):
        questao = self._questao()
        questao["answers"] = ["A", "B"]

        self.assertEqual(build_bank.redistribuir_gabarito(questao, 1), questao)

    def test_build_bank_data_distribui_entre_as_posicoes(self):
        with tempfile.TemporaryDirectory() as tmp:
            questoes = [self._questao(qid=f"q{i}") for i in range(40)]
            caminho = os.path.join(tmp, "supp-1.json")
            with open(caminho, "w", encoding="utf-8") as f:
                json.dump({"questions": questoes}, f)

            manifest = [("fase-teste", "Fase Teste", ["supp-1.json"])]
            bank_data = build_bank.build_bank_data(manifest, data_dir=tmp)

            geradas = bank_data["fases"][0]["questions"]
            contagem = {}
            for q in geradas:
                contagem[q["answers"][0]] = contagem.get(q["answers"][0], 0) + 1

            self.assertEqual(sorted(contagem), ["A", "B", "C", "D"])
            for letra, quantidade in contagem.items():
                self.assertEqual(quantidade, 10, f"Posição {letra} desbalanceada")

    def test_ordem_deterministica_e_uma_permutacao(self):
        ordem = build_bank._ordem_deterministica("semente", 4)

        self.assertEqual(sorted(ordem), [0, 1, 2, 3])
        self.assertEqual(ordem, build_bank._ordem_deterministica("semente", 4))


class TestNormalizarDomainLabel(unittest.TestCase):
    """Os arquivos-fonte acumularam variantes do mesmo domainLabel (ex.:
    'Segurança' vs 'Arquiteturas seguras' para o domain 1) porque foram
    escritos por autores/sessões diferentes ao longo do tempo. Em vez de
    editar à mão dezenas de arquivos data/supplement-*.json, o build
    normaliza domainLabel a partir do 'domain' numérico (fonte da verdade).
    """

    def test_substitui_variante_conhecida_pelo_rotulo_canonico(self):
        questao = {"domain": 1, "domainLabel": "Segurança"}
        resultado = build_bank.normalizar_domain_label(questao)
        self.assertEqual(resultado["domainLabel"], "Arquiteturas seguras")

    def test_mantem_rotulo_ja_canonico_sem_copiar_o_objeto(self):
        # Rótulo já canônico: função devolve a MESMA referência (curto-circuito
        # sem cópia), diferente do caso de substituição, que devolve uma cópia.
        questao = {"domain": 4, "domainLabel": "Otimização de custos"}
        resultado = build_bank.normalizar_domain_label(questao)
        self.assertEqual(resultado["domainLabel"], "Otimização de custos")
        self.assertIs(resultado, questao)

    def test_nao_muta_a_questao_original(self):
        questao = {"domain": 2, "domainLabel": "Resiliência"}
        build_bank.normalizar_domain_label(questao)
        self.assertEqual(questao["domainLabel"], "Resiliência")

    def test_domain_desconhecido_preserva_domain_label_original(self):
        questao = {"domain": 99, "domainLabel": "Rótulo Qualquer"}
        resultado = build_bank.normalizar_domain_label(questao)
        self.assertEqual(resultado["domainLabel"], "Rótulo Qualquer")

    def test_cobre_todos_os_dominios_da_saa_c03(self):
        esperado = {
            0: "Fundamentos",
            1: "Arquiteturas seguras",
            2: "Arquiteturas resilientes",
            3: "Arquiteturas de alto desempenho",
            4: "Otimização de custos",
        }
        self.assertEqual(build_bank.ROTULOS_DOMINIO, esperado)


class TestHelpersInternos(unittest.TestCase):
    """Testes unitários para os helpers internos (_prefixados) de build-bank.py.

    Antes, esses helpers só eram exercitados indiretamente via
    load_supplement_questions (testes de comportamento fim-a-fim). Aqui eles
    são testados isoladamente, incluindo casos de borda e entradas inválidas,
    seguindo o padrão AAA do AGENTS.md.
    """

    def test_menciona_servico_descontinuado_encontra_minusculo(self):
        texto = "use o qldb pra isso"
        self.assertTrue(build_bank._texto_menciona_servico_descontinuado(texto))

    def test_menciona_servico_descontinuado_case_insensitive(self):
        texto = "Use o QLDB pra isso"
        self.assertTrue(build_bank._texto_menciona_servico_descontinuado(texto))

    def test_menciona_servico_descontinuado_como_substring(self):
        texto = "o serviço qldb-like não existe de verdade"
        self.assertTrue(build_bank._texto_menciona_servico_descontinuado(texto))

    def test_nao_menciona_servico_descontinuado(self):
        texto = "use o DynamoDB pra isso"
        self.assertFalse(build_bank._texto_menciona_servico_descontinuado(texto))

    def test_menciona_servico_descontinuado_string_vazia(self):
        self.assertFalse(build_bank._texto_menciona_servico_descontinuado(""))

    def test_menciona_servico_descontinuado_entrada_nao_string(self):
        self.assertFalse(build_bank._texto_menciona_servico_descontinuado(None))
        self.assertFalse(build_bank._texto_menciona_servico_descontinuado(42))
        self.assertFalse(build_bank._texto_menciona_servico_descontinuado(["qldb"]))

    def test_campos_texto_da_questao_campos_basicos(self):
        questao = {"situacao": "sit", "stem": "pergunta", "explanation": "expl"}
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertEqual(campos, ["sit", "pergunta", "expl"])

    def test_campos_texto_da_questao_ignora_campos_ausentes(self):
        questao = {"stem": "só isso"}
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertEqual(campos, ["só isso"])

    def test_campos_texto_da_questao_inclui_opcoes(self):
        questao = {"options": [{"text": "opção A"}, {"text": "opção B"}]}
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertEqual(campos, ["opção A", "opção B"])

    def test_campos_texto_da_questao_ignora_options_malformado(self):
        questao = {"options": "não é uma lista"}
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertEqual(campos, [])

    def test_campos_texto_da_questao_ignora_opcao_nao_dict(self):
        questao = {"options": [{"text": "válida"}, "inválida", 42]}
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertEqual(campos, ["válida"])

    def test_campos_texto_da_questao_inclui_hints_e_whynots(self):
        questao = {
            "hints": ["dica 1", "dica 2"],
            "whyNots": {"A": "não é A porque...", "B": "não é B porque..."}
        }
        campos = list(build_bank._campos_texto_da_questao(questao))
        self.assertIn("dica 1", campos)
        self.assertIn("dica 2", campos)
        self.assertIn("não é A porque...", campos)
        self.assertIn("não é B porque...", campos)

    def test_campos_texto_da_questao_questao_vazia(self):
        campos = list(build_bank._campos_texto_da_questao({}))
        self.assertEqual(campos, [])


class TestValidacaoSchema(unittest.TestCase):
    """Validação de schema no BUILD (validar_questao_schema + unicidade de IDs).

    Antes, o builder não checava o schema que o jogo espera: um suplemento
    malformado entrava direto no bank.js, e questões que não atendiam aos
    pré-requisitos de redistribuir_gabarito ficavam sem embaralhamento em
    silêncio (a correta permanecia na posição "A" autoral).
    """

    def _questao_valida(self, qid="q1"):
        return {
            "id": qid,
            "stem": "Qual serviço guarda objetos?",
            "explanation": "S3 é o serviço de armazenamento de objetos.",
            "options": [
                {"key": "A", "text": "S3"},
                {"key": "B", "text": "EBS"},
                {"key": "C", "text": "EFS"},
            ],
            "answers": ["A"],
            "whyNots": {"B": "EBS é bloco", "C": "EFS é arquivo"},
            "hints": ["Pense em objetos"],
            "difficulty": "intro",
            "type": "single",
        }

    def test_aceita_questao_valida(self):
        build_bank.validar_questao_schema(self._questao_valida())  # não deve levantar

    def test_rejeita_stem_ausente_ou_vazio(self):
        questao = self._questao_valida()
        questao["stem"] = "   "
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("stem", str(ctx.exception))

    def test_rejeita_explanation_ausente(self):
        questao = self._questao_valida()
        del questao["explanation"]
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("explanation", str(ctx.exception))

    def test_rejeita_id_nao_string(self):
        questao = self._questao_valida()
        questao["id"] = 101
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("id", str(ctx.exception))

    def test_rejeita_mais_de_quatro_opcoes(self):
        questao = self._questao_valida()
        questao["options"] = [
            {"key": k, "text": f"texto {k}"} for k in ["A", "B", "C", "D", "E"]
        ]
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("options", str(ctx.exception))

    def test_rejeita_resposta_sem_opcao_correspondente(self):
        questao = self._questao_valida()
        questao["answers"] = ["Z"]
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("Z", str(ctx.exception))

    def test_rejeita_multiplas_respostas(self):
        questao = self._questao_valida()
        questao["answers"] = ["A", "B"]
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("answers", str(ctx.exception))

    def test_rejeita_keys_duplicadas_nas_opcoes(self):
        questao = self._questao_valida()
        questao["options"][1]["key"] = "A"
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("duplicadas", str(ctx.exception))

    def test_rejeita_whynots_com_chave_orfa(self):
        questao = self._questao_valida()
        questao["whyNots"]["X"] = "chave que não existe nas opções"
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("whyNots['X']", str(ctx.exception))

    def test_rejeita_difficulty_invalida(self):
        questao = self._questao_valida()
        questao["difficulty"] = "impossivel"
        with self.assertRaises(ValueError) as ctx:
            build_bank.validar_questao_schema(questao)
        self.assertIn("difficulty", str(ctx.exception))

    def test_build_bank_data_rejeita_ids_duplicados_entre_suplementos(self):
        with tempfile.TemporaryDirectory() as tmp:
            for nome in ("supp-1.json", "supp-2.json"):
                with open(os.path.join(tmp, nome), "w", encoding="utf-8") as f:
                    json.dump({"questions": [self._questao_valida("q-dup")]}, f)

            manifest = [
                ("fase-1", "Fase 1", ["supp-1.json"]),
                ("fase-2", "Fase 2", ["supp-2.json"]),
            ]
            with self.assertRaises(ValueError) as ctx:
                build_bank.build_bank_data(manifest, data_dir=tmp)
            self.assertIn("q-dup", str(ctx.exception))
            self.assertIn("duplicado", str(ctx.exception).lower())

    def test_build_bank_data_rejeita_fid_duplicado_no_manifest(self):
        """MANIFEST é editado à mão: um id de fase copiado sem trocar deve
        derrubar o build, assim como já acontece para id de questão duplicado."""
        with tempfile.TemporaryDirectory() as tmp:
            for nome, qid in (("supp-1.json", "q-a"), ("supp-2.json", "q-b")):
                with open(os.path.join(tmp, nome), "w", encoding="utf-8") as f:
                    json.dump({"questions": [self._questao_valida(qid)]}, f)

            manifest = [
                ("fase-dup", "Fase Um", ["supp-1.json"]),
                ("fase-dup", "Fase Dois (id copiado sem trocar)", ["supp-2.json"]),
            ]
            with self.assertRaises(ValueError) as ctx:
                build_bank.build_bank_data(manifest, data_dir=tmp)
            self.assertIn("fase-dup", str(ctx.exception))
            self.assertIn("duplicado", str(ctx.exception).lower())

    def test_generate_bank_js_escapa_sequencias_perigosas(self):
        stem_perigoso = "Texto com </script> e separadores \u2028 e \u2029 de linha."
        bank_data = {
            "cert": "SAA-C03",
            "titulo": "Teste",
            "fases": [{
                "id": "f1",
                "titulo": "Fase",
                "questions": [{"id": "q1", "stem": stem_perigoso}],
            }],
        }
        with tempfile.TemporaryDirectory() as tmp:
            out_file = os.path.join(tmp, "bank.js")
            build_bank.generate_bank_js(bank_data, out_file)
            self.assertFalse(
                os.path.exists(out_file + ".tmp"), "Arquivo temporário deve ser limpo"
            )
            with open(out_file, "r", encoding="utf-8") as f:
                content = f.read()

        self.assertNotIn("</", content, "'</' cru não pode aparecer na saída")
        self.assertNotIn("\u2028", content, "U+2028 cru quebra engines pré-ES2019")
        self.assertNotIn("\u2029", content, "U+2029 cru quebra engines pré-ES2019")
        # O escape é transparente: o JSON continua válido e o texto, idêntico.
        payload = content[len("window.AWS_BANK = "):-2]
        parsed = json.loads(payload)
        self.assertEqual(parsed["fases"][0]["questions"][0]["stem"], stem_perigoso)


class TestBuildBankIntegracao(unittest.TestCase):
    def test_integracao_manifest_oficial(self):
        """Valida que todo o MANIFEST oficial possui arquivos válidos e gera o banco sem erros."""
        bank_data = build_bank.build_bank_data(build_bank.MANIFEST, data_dir=DATA_DIR)
        self.assertEqual(bank_data["cert"], "SAA-C03")
        self.assertGreater(len(bank_data["fases"]), 0)

        total_questions = sum(len(f["questions"]) for f in bank_data["fases"])
        self.assertGreater(total_questions, 0, "O banco de questões gerado não deve estar vazio")


if __name__ == "__main__":
    unittest.main()
