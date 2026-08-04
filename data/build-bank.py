#!/usr/bin/env python3
"""Builds data/bank.js (window.AWS_BANK) from the PT supplement JSON files.
Add a new fase by appending to MANIFEST. Run: python3 data/build-bank.py"""
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

# Letras das alternativas, atribuídas pela posição depois da redistribuição.
LETRAS_OPCOES = ["A", "B", "C", "D"]

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
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON inválido em {file_path}: {e}") from e
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


DIFICULDADES_VALIDAS = {"intro", "exam", "challenge"}


def validar_questao_schema(questao, contexto=""):
    """Valida o schema que o jogo (src/jogo.js: validarQuestao) espera.

    Roda no BUILD, não só no runtime: um suplemento malformado deve derrubar a
    geração do banco com uma mensagem clara, em vez de entrar silenciosamente
    no bank.js. Também garante os pré-requisitos de redistribuir_gabarito
    (options 2..4, exatamente 1 answer apontando para uma key existente) — sem
    isso, a redistribuição era pulada em silêncio e a alternativa correta
    ficava na posição "A" autoral, virando dica de posição.
    """
    erros = []
    qid = questao.get("id")
    if not isinstance(qid, str) or not qid:
        erros.append("'id' ausente ou não é uma string não vazia")
    stem = questao.get("stem")
    if not isinstance(stem, str) or not stem.strip():
        erros.append("'stem' ausente ou vazio")
    if not isinstance(questao.get("explanation"), str) or not questao.get("explanation", "").strip():
        erros.append("'explanation' ausente ou vazia")
    if "type" in questao and questao["type"] != "single":
        erros.append("'type' deve ser 'single'")
    if "difficulty" in questao and questao["difficulty"] not in DIFICULDADES_VALIDAS:
        erros.append(f"'difficulty' deve ser um de {sorted(DIFICULDADES_VALIDAS)}")

    options = questao.get("options")
    chaves = []
    if not isinstance(options, list) or not 2 <= len(options) <= len(LETRAS_OPCOES):
        erros.append(f"'options' deve ser uma lista de 2 a {len(LETRAS_OPCOES)} alternativas")
    else:
        for idx, opt in enumerate(options):
            if not isinstance(opt, dict):
                erros.append(f"options[{idx}] não é um objeto")
                continue
            if not isinstance(opt.get("key"), str) or not opt["key"]:
                erros.append(f"options[{idx}] sem 'key' string")
            else:
                chaves.append(opt["key"])
            if not isinstance(opt.get("text"), str) or not opt["text"].strip():
                erros.append(f"options[{idx}] sem 'text'")
        if len(chaves) != len(set(chaves)):
            erros.append("'options' contém keys duplicadas")

    answers = questao.get("answers")
    if not isinstance(answers, list) or len(answers) != 1:
        erros.append("'answers' deve ter exatamente 1 resposta (SAA-C03 single)")
    else:
        for resp in answers:
            if not isinstance(resp, str) or (chaves and resp not in chaves):
                erros.append(f"resposta '{resp}' não corresponde a nenhuma option key")

    hints = questao.get("hints")
    if hints is not None and (
        not isinstance(hints, list) or any(not isinstance(h, str) for h in hints)
    ):
        erros.append("'hints' deve ser uma lista de strings")

    why_nots = questao.get("whyNots")
    if why_nots is not None:
        if not isinstance(why_nots, dict):
            erros.append("'whyNots' deve ser um objeto")
        else:
            for chave, valor in why_nots.items():
                if not isinstance(valor, str):
                    erros.append(f"whyNots['{chave}'] deve ser uma string")
                if chaves and chave not in chaves:
                    erros.append(
                        f"whyNots['{chave}'] não corresponde a nenhuma option key "
                        "(seria descartado/mesclado em silêncio na redistribuição)"
                    )

    if erros:
        raise ValueError(
            f"Questão '{qid or '<sem id>'}'{contexto}: " + "; ".join(erros)
        )


def _ordem_deterministica(semente, quantidade):
    """Permutação determinística de 0..quantidade-1 derivada de uma semente textual.

    Determinística de propósito: o mesmo conjunto de suplementos sempre gera o
    mesmo bank.js, sem diffs espúrios entre execuções ou máquinas.
    """
    digest = hashlib.sha256(str(semente).encode("utf-8")).digest()
    disponiveis = list(range(quantidade))
    ordem = []
    for passo, restantes in enumerate(range(quantidade, 0, -1)):
        escolhido = digest[passo % len(digest)] % restantes
        ordem.append(disponiveis.pop(escolhido))
    return ordem


def redistribuir_gabarito(questao, posicao_alvo):
    """Reordena as alternativas para que a correta caia em `posicao_alvo`.

    Os autores escrevem os suplementos com a alternativa correta em "A"; sem esta
    etapa, a posição vira a resposta e o jogador aprende a chutar uma letra fixa
    em vez de ler o enunciado. As letras são reatribuídas pela nova posição e
    `answers`/`whyNots` são remapeados junto.
    """
    options = questao.get("options")
    answers = questao.get("answers")
    if not isinstance(options, list) or not 2 <= len(options) <= len(LETRAS_OPCOES):
        return questao
    if not isinstance(answers, list) or len(answers) != 1:
        return questao
    if not all(isinstance(o, dict) and isinstance(o.get("key"), str) for o in options):
        return questao

    correta = next((o for o in options if o.get("key") == answers[0]), None)
    if correta is None:
        return questao

    distratoras = [o for o in options if o is not correta]
    ordem = _ordem_deterministica(questao.get("id", ""), len(distratoras))
    embaralhadas = [distratoras[i] for i in ordem]

    alvo = posicao_alvo % len(options)
    nova_ordem = embaralhadas[:alvo] + [correta] + embaralhadas[alvo:]

    mapa_chaves = {}
    novas_options = []
    for indice, opcao in enumerate(nova_ordem):
        letra = LETRAS_OPCOES[indice]
        mapa_chaves[opcao["key"]] = letra
        nova_opcao = dict(opcao)
        nova_opcao["key"] = letra
        novas_options.append(nova_opcao)

    nova_questao = dict(questao)
    nova_questao["options"] = novas_options
    nova_questao["answers"] = [mapa_chaves[k] for k in answers]

    why_nots = questao.get("whyNots")
    if isinstance(why_nots, dict):
        remapeado = {mapa_chaves.get(k, k): v for k, v in why_nots.items()}
        nova_questao["whyNots"] = {k: remapeado[k] for k in sorted(remapeado)}

    return nova_questao


def build_bank_data(manifest, data_dir=HERE):
    """Gera a estrutura do banco de dados a partir do manifesto e diretório fornecido.

    Cada questão passa por validar_questao_schema ANTES da redistribuição e os
    IDs são checados quanto à unicidade global — falhas derrubam o build com
    contexto (arquivo + id), em vez de gerar um bank.js sutilmente quebrado.
    """
    fases = []
    contadores = {}
    ids_vistos = {}
    fids_vistos = set()
    for fid, titulo, files in manifest:
        if fid in fids_vistos:
            raise ValueError(
                f"ID de fase duplicado no MANIFEST: '{fid}' aparece mais de uma vez."
            )
        fids_vistos.add(fid)
        qs = []
        for f in files:
            full_path = os.path.join(data_dir, f)
            for questao in load_supplement_questions(full_path):
                validar_questao_schema(questao, contexto=f" (em {f})")
                qid = questao["id"]
                if qid in ids_vistos:
                    raise ValueError(
                        f"ID de questão duplicado: '{qid}' aparece em "
                        f"{ids_vistos[qid]} e em {f}."
                    )
                ids_vistos[qid] = f
                total_opcoes = len(questao["options"])
                posicao = contadores.get(total_opcoes, 0)
                contadores[total_opcoes] = posicao + 1
                qs.append(redistribuir_gabarito(questao, posicao))
        fases.append({"id": fid, "titulo": titulo, "questions": qs})
    return {
        "cert": "SAA-C03",
        "titulo": "E aí? Bora Aprender AWS?",
        "fases": fases,
    }


def generate_bank_js(bank_data, output_path):
    """Escreve o objeto de banco de dados no formato JavaScript (window.AWS_BANK = ...).

    Escreve em arquivo temporário e troca por `os.replace` (atômico): bank.js é o
    único artefato de conteúdo do jogo, e uma falha no meio da serialização não
    pode deixá-lo truncado. `newline="\\n"` evita reescrever o arquivo inteiro em
    CRLF quando o build roda no Windows.
    """
    payload = json.dumps(bank_data, ensure_ascii=False, indent=2)
    # Endurecimento da serialização (defensivo — o conteúdo atual é limpo):
    # - "</" vira "<\/" (escape de solidus, JSON válido e idêntico após parse)
    #   para que "</script>" num texto jamais encerre a tag se o arquivo for
    #   inline algum dia;
    # - U+2028/U+2029 são separadores de linha Unicode que quebram string
    #   literals em engines pré-ES2019 — escapados numericamente.
    payload = payload.replace("</", "<\\/")
    payload = payload.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

    temporario = output_path + ".tmp"
    try:
        with open(temporario, "w", encoding="utf-8", newline="\n") as out:
            out.write("window.AWS_BANK = ")
            out.write(payload)
            out.write(";\n")
        os.replace(temporario, output_path)
    finally:
        # Se a escrita/replace falhou no meio, não deixa o .tmp para trás.
        if os.path.exists(temporario):
            os.remove(temporario)


def _validar_arquivo_gerado(output_path, bank_data):
    """Relê o bank.js recém-escrito e confere a integridade do arquivo de saída.

    generate_bank_js grava com escrita atômica (tmp + os.replace), o que evita
    um arquivo truncado, mas não pega um erro de lógica que produza um JSON
    sintaticamente válido e ainda assim errado (ex.: fase ou questão faltando).
    Cobre o lado "arquivo de saída" do requisito de integridade do AGENTS.md —
    o lado "entrada" já é coberto por validar_questao_schema.
    """
    with open(output_path, "r", encoding="utf-8") as f:
        conteudo = f.read()
    match = re.match(r"window\.AWS_BANK = (.*);\n?$", conteudo, re.DOTALL)
    if not match:
        raise ValueError(
            f"Integridade do arquivo gerado falhou: {output_path} não está no "
            "formato esperado 'window.AWS_BANK = ...;'."
        )
    religado = json.loads(match.group(1))

    fases_esperadas = len(bank_data["fases"])
    fases_lidas = len(religado.get("fases", []))
    if fases_lidas != fases_esperadas:
        raise ValueError(
            f"Integridade do arquivo gerado falhou: {fases_esperadas} fases em "
            f"memória, {fases_lidas} relidas de {output_path}."
        )

    questoes_esperadas = sum(len(f["questions"]) for f in bank_data["fases"])
    questoes_lidas = sum(len(f.get("questions", [])) for f in religado.get("fases", []))
    if questoes_lidas != questoes_esperadas:
        raise ValueError(
            f"Integridade do arquivo gerado falhou: {questoes_esperadas} questões "
            f"em memória, {questoes_lidas} relidas de {output_path}."
        )


def main():
    bank_data = build_bank_data(MANIFEST, HERE)
    output_file = os.path.join(HERE, "bank.js")
    generate_bank_js(bank_data, output_file)
    _validar_arquivo_gerado(output_file, bank_data)

    for fa in bank_data["fases"]:
        print(f"  {fa['titulo']}: {len(fa['questions'])} questões")
    print("total:", sum(len(f['questions']) for f in bank_data["fases"]))


if __name__ == "__main__":
    main()
