#!/usr/bin/env python3
"""Testes unitários para data/analytics-bank.py.

Antes desta suíte, o script de analytics não tinha nenhuma cobertura de
testes (diferente do lado JS, que segue rigorosamente o padrão AAA do
AGENTS.md). Aqui testamos as funções puras de contagem/análise em
isolamento, com casos felizes, de borda e entradas vazias.
"""
import json
import os
import sys
import tempfile
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
sys.path.insert(0, DATA_DIR)

import importlib.util

spec = importlib.util.spec_from_file_location(
    "analytics_bank", os.path.join(DATA_DIR, "analytics-bank.py")
)
analytics_bank = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analytics_bank)


class TestCountByDomain(unittest.TestCase):
    def test_conta_por_domainLabel(self):
        questions = [
            {"domainLabel": "Fundamentos"},
            {"domainLabel": "Fundamentos"},
            {"domainLabel": "Segurança"}
        ]
        counts = analytics_bank.count_by_domain(questions)
        self.assertEqual(counts, {"Fundamentos": 2, "Segurança": 1})

    def test_questao_sem_domainLabel_cai_em_sem_dominio(self):
        questions = [{"stem": "sem domínio aqui"}]
        counts = analytics_bank.count_by_domain(questions)
        self.assertEqual(counts, {"(sem domínio)": 1})

    def test_lista_vazia_retorna_dict_vazio(self):
        self.assertEqual(analytics_bank.count_by_domain([]), {})


class TestCountServices(unittest.TestCase):
    def test_conta_servicos_mencionados(self):
        questions = [
            {"services": ["s3", "ec2"]},
            {"services": ["s3"]}
        ]
        counts = analytics_bank.count_services(questions)
        self.assertEqual(counts, {"s3": 2, "ec2": 1})

    def test_questao_sem_services_e_ignorada(self):
        questions = [{"stem": "sem services"}, {"services": None}]
        counts = analytics_bank.count_services(questions)
        self.assertEqual(counts, {})

    def test_lista_vazia_retorna_dict_vazio(self):
        self.assertEqual(analytics_bank.count_services([]), {})


class TestCountDifficulty(unittest.TestCase):
    def test_conta_dificuldades_validas(self):
        questions = [{"difficulty": "intro"}, {"difficulty": "exam"}, {"difficulty": "intro"}]
        counts = analytics_bank.count_difficulty(questions)
        self.assertEqual(counts, {"intro": 2, "exam": 1})

    def test_dificuldade_invalida_ou_ausente_cai_em_indefinida(self):
        questions = [{"difficulty": "muito-dificil"}, {}]
        counts = analytics_bank.count_difficulty(questions)
        self.assertEqual(counts, {"(indefinida)": 2})


class TestAnalyze(unittest.TestCase):
    def test_banco_vazio_retorna_apenas_total_zero(self):
        report = analytics_bank.analyze([])
        self.assertEqual(report, {"total": 0})

    def test_calcula_percentuais_e_cobertura_pedagogica(self):
        questions = [
            {
                "domainLabel": "Fundamentos",
                "difficulty": "intro",
                "services": ["s3"],
                "hints": ["dica"],
                "whyNots": {"A": "porque"},
                "explanation": "expl",
                "situacao": "sit",
                "options": [{"key": "A"}, {"key": "B"}]
            },
            {
                "domainLabel": "Fundamentos",
                "difficulty": "exam",
                "services": [],
                "options": [{"key": "A"}, {"key": "B"}, {"key": "C"}]
            }
        ]
        report = analytics_bank.analyze(questions)

        self.assertEqual(report["total"], 2)
        self.assertEqual(report["with_hints"], 1)
        self.assertEqual(report["with_hints_pct"], 50.0)
        self.assertEqual(report["with_why_nots"], 1)
        self.assertEqual(report["with_explanation"], 1)
        self.assertEqual(report["with_situacao"], 1)
        self.assertEqual(report["min_options"], 2)
        self.assertEqual(report["max_options"], 3)
        self.assertEqual(report["avg_options"], 2.5)

    def test_questao_sem_options_conta_zero_opcoes(self):
        questions = [{}]
        report = analytics_bank.analyze(questions)
        self.assertEqual(report["min_options"], 0)
        self.assertEqual(report["max_options"], 0)
        self.assertEqual(report["avg_options"], 0.0)


class TestExtractJsonFromJs(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.test_dir.cleanup()

    def test_extrai_objeto_valido(self):
        file_path = os.path.join(self.test_dir.name, "bank.js")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write('window.AWS_BANK = {"cert": "SAA-C03", "fases": []};\n')

        bank = analytics_bank.extract_json_from_js(file_path)
        self.assertEqual(bank["cert"], "SAA-C03")
        self.assertEqual(bank["fases"], [])

    def test_arquivo_sem_atribuicao_esperada_levanta_erro(self):
        file_path = os.path.join(self.test_dir.name, "invalido.js")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("const outraCoisa = 42;\n")

        with self.assertRaises(ValueError):
            analytics_bank.extract_json_from_js(file_path)


if __name__ == "__main__":
    unittest.main()
