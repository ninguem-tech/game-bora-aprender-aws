#!/usr/bin/env python3
"""Builds data/bank.js (window.AWS_BANK) from the PT supplement JSON files.
Add a new fase by appending to MANIFEST. Run: python3 data/build-bank.py"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# Serviços descontinuados pela AWS; questões que os citam devem ser revisadas
# antes de entrar no banco oficial.
DEPRECATED_SERVICES = {"qldb"}

MANIFEST = [
    ("fundamentos", "Fundamentos da Nuvem", ["supplement-fundamentos.json"]),
    ("computacao-rede", "Computação e Rede (EC2, VPC, ELB)",
     ["supplement-fase2-ec2-SAMPLE.json", "supplement-fase1-cap04-07-SAMPLE.json"]),
    ("armazenamento", "Armazenamento e Bancos de Dados",
     ["supplement-armazenamento-cap08-10.json", "supplement-bancos-cap11-13.json"]),
    ("seguranca", "Segurança e Identidade (IAM, KMS, WAF)",
     ["supplement-seguranca-cap14-17.json"]),
    ("aplicacao", "Serviços de Aplicação (Lambda, Filas, CloudFront, Containers)",
     ["supplement-aplicacao-cap18-21.json"]),
    ("custos", "Custos e Governança",
     ["supplement-custos-governanca.json"]),
    ("implantacao", "Implantação, IaC e Performance Global",
     ["supplement-implantacao-performance.json"]),
    ("operacoes", "Operações e Governança (SSM, Config, SCP)",
     ["supplement-operacoes-governanca.json"]),
    ("conectividade", "Conectividade Híbrida e Mensageria",
     ["supplement-conectividade-mensageria.json"]),
    ("resiliencia", "Resiliência e Recuperação de Desastres (DR)",
     ["supplement-resiliencia-dr.json"]),
    ("analytics", "Analytics e Big Data",
     ["supplement-analytics-bigdata.json"]),
    ("bancos-avancado", "Bancos de Dados — Aprofundamento",
     ["supplement-bancos-avancado.json"]),
    ("migracao", "Migração e Transferência",
     ["supplement-migracao-transferencia.json"]),
    ("rede-avancado", "Rede — Aprofundamento (Route 53, Endpoints, NACL)",
     ["supplement-rede-avancado.json"]),
    ("seguranca-deteccao", "Segurança — Detecção e Proteção",
     ["supplement-seguranca-deteccao.json"]),
    ("compute-conteineres", "Computação e Contêineres — Aprofundamento",
     ["supplement-compute-conteineres.json"]),
    ("armazenamento-avancado", "Armazenamento — Aprofundamento (S3 classes, EBS, EFS/FSx)",
     ["supplement-armazenamento-avancado.json"]),
    ("ec2-precos", "EC2 — Modelos de Preço e Otimização",
     ["supplement-ec2-precos-placement.json"]),
    ("iam-avancado", "IAM e Identidade — Aprofundamento",
     ["supplement-iam-avancado.json"]),
    ("integracao-apps", "Integração de Aplicações (SQS, SNS, Step Functions, API GW, MQ)",
     ["supplement-integracao-apps.json"]),
    ("cloudfront-edge", "CloudFront e Edge (OAC, signed URLs, edge functions)",
     ["supplement-cloudfront-edge.json"]),
    ("monitoramento", "Monitoramento e Observabilidade (CloudWatch)",
     ["supplement-monitoramento.json"]),
    ("cenarios-combinados", "Cenários Combinados (estilo prova)",
     ["supplement-cenarios-combinados.json"]),
    ("s3-avancado", "S3 — Recursos Avançados (versionamento, replicação, Object Lock)",
     ["supplement-s3-avancado.json"]),
    ("bancos-especializados", "Bancos de Dados Especializados (DocumentDB, Neptune, Timestream...)",
     ["supplement-bancos-especializados.json"]),
    ("fundamentos-well-architected", "Fundamentos: Global, Responsabilidade e Well-Architected",
     ["supplement-fundamentos-governanca.json"]),
    ("lambda-avancado", "AWS Lambda — Aprofundamento",
     ["supplement-lambda-avancado.json"]),
    ("vpc-fundamentos", "VPC — Fundamentos de Rede",
     ["supplement-vpc-fundamentos.json"]),
    ("ia-ml", "Serviços de IA/ML Gerenciados",
     ["supplement-ia-ml-gerenciados.json"]),
    ("governanca-multiconta", "Governança Multi-Conta e Escala (Organizations, Control Tower, RAM)",
     ["supplement-governanca-multiconta.json"]),
    ("custos-ferramentas", "Otimização de Custos — Ferramentas Avançadas",
     ["supplement-custos-ferramentas.json"]),
    ("cicd-devtools", "CI/CD e Ferramentas de Desenvolvedor",
     ["supplement-cicd-devtools.json"]),
    ("compute-extra", "Computação — Opções Adicionais e Híbridas",
     ["supplement-compute-extra-hibrido.json"]),
    ("seguranca-rede-certs", "Segurança de Rede, Certificados e Investigação",
     ["supplement-seguranca-rede-certs.json"]),
    ("diretorio-euc", "Diretório e Computação de Usuário Final",
     ["supplement-diretorio-euc.json"]),
    ("mensageria-usuario", "Mensageria ao Usuário Final (SES, SNS)",
     ["supplement-mensageria-usuario.json"]),
    ("conteineres-fundo", "Contêineres a Fundo — ECR e Orquestração",
     ["supplement-conteineres-fundo.json"]),
    ("route53-avancado", "Route 53 Avançado (Alias, hosted zones, Resolver, health checks)",
     ["supplement-route53-avancado.json"]),
    ("cenarios-combinados-2", "Cenários Combinados II (estilo prova)",
     ["supplement-cenarios-combinados-2.json"]),
    ("busca-integracao", "Busca, Análise de Logs e Integração SaaS (OpenSearch, AppFlow)",
     ["supplement-busca-integracao.json"]),
    ("transferencia-dr", "Transferência Gerenciada e DR de Servidores",
     ["supplement-transferencia-dr-servidor.json"]),
    ("compliance-auditoria", "Compliance, Auditoria e Análise de Acesso",
     ["supplement-compliance-auditoria.json"]),
    ("ec2-ami-snapshots", "EC2 — AMI, Snapshots e Recursos",
     ["supplement-ec2-ami-snapshots.json"]),
    ("cenarios-combinados-3", "Cenários Combinados III (estilo prova)",
     ["supplement-cenarios-combinados-3.json"]),
    ("revisao-pegadinhas", "Revisão de Pegadinhas e Comparações",
     ["supplement-revisao-pegadinhas.json"]),
    ("rodada-relampago", "Rodada Relâmpago — Serviço Certo",
     ["supplement-rodada-relampago.json"]),
    ("simulado-01", "Simulado 1 (25 questões estilo prova)",
     ["supplement-simulado-01.json"]),
]


def _texto_menciona_servico_descontinuado(texto):
    """Verifica se um texto menciona algum serviço descontinuado."""
    if not isinstance(texto, str):
        return False
    normalizado = texto.lower()
    return any(s in normalizado for s in DEPRECATED_SERVICES)


def _campos_texto_da_questao(q):
    """Yields strings dos campos textuais de uma questão."""
    for campo in ("situacao", "stem", "explanation"):
        if campo in q:
            yield q[campo]
    options = q.get("options")
    if isinstance(options, list):
        for opt in options:
            if isinstance(opt, dict):
                yield opt.get("text")
    hints = q.get("hints")
    if isinstance(hints, list):
        for hint in hints:
            if isinstance(hint, str):
                yield hint
    why_not = q.get("whyNots")
    if isinstance(why_not, dict):
        for valor in why_not.values():
            if isinstance(valor, str):
                yield valor


def load_supplement_questions(file_path):
    """Carrega as questões de um arquivo JSON suplementar, rejeitando serviços descontinuados."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or "questions" not in data or not isinstance(data["questions"], list):
        raise ValueError(f"Estrutura JSON inválida em {file_path}: esperada chave 'questions' contendo uma lista.")
    questions = data["questions"]
    for idx, q in enumerate(questions):
        if not isinstance(q, dict):
            raise ValueError(f"Elemento {idx} em {file_path} não é um objeto de questão.")
        services = q.get("services")
        if services is not None and not isinstance(services, list):
            raise ValueError(f"Questão '{q.get('id', idx)}' em {file_path}: 'services' deve ser uma lista.")
        for s in services or []:
            if not isinstance(s, str):
                raise ValueError(
                    f"Questão '{q.get('id', idx)}' em {file_path}: 'services' deve conter apenas strings."
                )
            if s.lower() in DEPRECATED_SERVICES:
                qid = q.get("id", idx)
                raise ValueError(
                    f"Questão '{qid}' em {file_path} referencia serviço descontinuado: {s}. "
                    "Remova ou substitua a questão antes de gerar o banco."
                )
        for texto in _campos_texto_da_questao(q):
            if _texto_menciona_servico_descontinuado(texto):
                qid = q.get("id", idx)
                raise ValueError(
                    f"Questão '{qid}' em {file_path} menciona serviço descontinuado no texto. "
                    "Remova ou substitua a questão antes de gerar o banco."
                )
    return questions


def build_bank_data(manifest, data_dir=HERE):
    """Gera a estrutura do banco de dados a partir do manifesto e diretório fornecido."""
    fases = []
    for fid, titulo, files in manifest:
        qs = []
        for f in files:
            full_path = os.path.join(data_dir, f)
            qs.extend(load_supplement_questions(full_path))
        fases.append({"id": fid, "titulo": titulo, "questions": qs})
    return {
        "cert": "SAA-C03",
        "titulo": "E aí? Bora Aprender AWS?",
        "fases": fases,
    }


def generate_bank_js(bank_data, output_path):
    """Escreve o objeto de banco de dados no formato JavaScript (window.AWS_BANK = ...)."""
    with open(output_path, "w", encoding="utf-8") as out:
        out.write("window.AWS_BANK = ")
        json.dump(bank_data, out, ensure_ascii=False, indent=2)
        out.write(";\n")


def main():
    bank_data = build_bank_data(MANIFEST, HERE)
    output_file = os.path.join(HERE, "bank.js")
    generate_bank_js(bank_data, output_file)

    for fa in bank_data["fases"]:
        print(f"  {fa['titulo']}: {len(fa['questions'])} questões")
    print("total:", sum(len(f['questions']) for f in bank_data["fases"]))


if __name__ == "__main__":
    main()
