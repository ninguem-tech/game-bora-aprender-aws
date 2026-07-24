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

        with self.assertRaises(json.JSONDecodeError):
            build_bank.load_supplement_questions(file_path)

    def test_load_supplement_questions_sem_chave_questions(self):
        file_path = os.path.join(self.test_dir.name, "sem-questions.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"outra_chave": []}, f)

        with self.assertRaises(ValueError):
            build_bank.load_supplement_questions(file_path)

    def test_build_bank_data_estrutura(self):
        file_path = os.path.join(self.test_dir.name, "supp-1.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({"questions": [{"id": 101}]}, f)

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
