#!/usr/bin/env python3
"""Analytics and quality metrics for the AWS question bank.

Reads data/bank.js (window.AWS_BANK = {...};) and prints a report with:
  - Question count per domain (domainLabel)
  - Service coverage (services[])
  - Difficulty distribution
  - Hint and whyNots coverage
  - Questions missing explanation
  - Average options per question

Usage:
  python3 data/analytics-bank.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BANK_JS = os.path.join(HERE, "bank.js")

# Acima destes limites, o formato da questão entrega a resposta sem que o
# jogador precise saber AWS. Mantidos em sincronia com testes/banco_dados.test.js.
LIMITE_CONCENTRACAO_GABARITO = 0.40
LIMITE_DELTA_COMPRIMENTO = 5


def extract_json_from_js(path):
    """Extract the JSON object from a window.AWS_BANK = {...}; assignment."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    match = re.search(r'window\.AWS_BANK\s*=\s*(\[.*\]|\{.*\})\s*;?\s*$', content, re.DOTALL)
    if not match:
        raise ValueError(f"Could not find window.AWS_BANK = ... in {path}")
    return json.loads(match.group(1))


def count_by_domain(questions):
    """Return a dict mapping domainLabel to count."""
    counts = {}
    for q in questions:
        label = q.get("domainLabel") or "(sem domínio)"
        counts[label] = counts.get(label, 0) + 1
    return counts


def count_services(questions):
    """Return a dict mapping service name to how many questions mention it."""
    counts = {}
    for q in questions:
        services = q.get("services") or []
        for s in services:
            counts[s] = counts.get(s, 0) + 1
    return counts


def count_difficulty(questions):
    """Return a dict mapping difficulty level to count."""
    counts = {}
    valid = {"intro", "exam", "challenge"}
    for q in questions:
        d = q.get("difficulty")
        if d not in valid:
            d = "(indefinida)"
        counts[d] = counts.get(d, 0) + 1
    return counts


def count_answer_positions(questions):
    """Return a dict mapping the correct answer's key to how often it is the answer.

    Concentração em uma única letra significa que a posição virou a resposta: o
    jogador acerta chutando sempre a mesma tecla, sem ler o enunciado.
    """
    counts = {}
    for q in questions:
        answers = q.get("answers") or []
        if len(answers) != 1:
            continue
        counts[answers[0]] = counts.get(answers[0], 0) + 1
    return counts


def measure_answer_length_bias(questions):
    """Compare the length of the correct option against the distractors.

    Se a alternativa correta é sistematicamente mais longa, o comprimento vira
    uma dica que sobrevive a qualquer embaralhamento de posição.
    """
    correct_lengths = []
    wrong_lengths = []
    longest_is_correct = 0
    considered = 0
    for q in questions:
        options = q.get("options") or []
        answers = q.get("answers") or []
        if len(answers) != 1 or len(options) < 2:
            continue
        correct = next((o for o in options if o.get("key") == answers[0]), None)
        if correct is None:
            continue
        wrong = [len(o.get("text") or "") for o in options if o is not correct]
        if not wrong:
            continue
        considered += 1
        tamanho_correta = len(correct.get("text") or "")
        correct_lengths.append(tamanho_correta)
        wrong_lengths.extend(wrong)
        if all(tamanho_correta > w for w in wrong):
            longest_is_correct += 1

    if not considered:
        return {"considered": 0}

    media_correta = sum(correct_lengths) / len(correct_lengths)
    media_incorreta = sum(wrong_lengths) / len(wrong_lengths)
    return {
        "considered": considered,
        "avg_correct": round(media_correta, 1),
        "avg_wrong": round(media_incorreta, 1),
        "delta": round(media_correta - media_incorreta, 1),
        "longest_is_correct": longest_is_correct,
        "longest_is_correct_pct": round(100 * longest_is_correct / considered, 1),
    }


def analyze(questions):
    """Run all analyses and return a structured report."""
    total = len(questions)
    if total == 0:
        return {"total": 0}

    with_hints = sum(1 for q in questions if q.get("hints"))
    with_why_nots = sum(1 for q in questions if q.get("whyNots"))
    with_explanation = sum(1 for q in questions if q.get("explanation"))
    with_situacao = sum(1 for q in questions if q.get("situacao"))
    options_counts = [len(q.get("options", [])) for q in questions]
    avg_options = sum(options_counts) / total if options_counts else 0

    return {
        "total": total,
        "domain_counts": count_by_domain(questions),
        "service_counts": count_services(questions),
        "difficulty_counts": count_difficulty(questions),
        "answer_positions": count_answer_positions(questions),
        "length_bias": measure_answer_length_bias(questions),
        "with_hints": with_hints,
        "with_hints_pct": round(100 * with_hints / total, 1),
        "with_why_nots": with_why_nots,
        "with_why_nots_pct": round(100 * with_why_nots / total, 1),
        "with_explanation": with_explanation,
        "with_explanation_pct": round(100 * with_explanation / total, 1),
        "with_situacao": with_situacao,
        "with_situacao_pct": round(100 * with_situacao / total, 1),
        "avg_options": round(avg_options, 2),
        "min_options": min(options_counts) if options_counts else 0,
        "max_options": max(options_counts) if options_counts else 0,
    }


def print_report(report, bank_title):
    """Print a human-readable report."""
    total = report["total"]
    print(f"\n{'='*60}")
    print(f"  RELATÓRIO DE MÉTRICAS — {bank_title}")
    print(f"{'='*60}")
    print(f"  Total de questões: {total}")

    print(f"\n  --- Cobertura pedagógica ---")
    print(f"  Com hints:          {report['with_hints']:4d}  ({report['with_hints_pct']}%)")
    print(f"  Com whyNots:        {report['with_why_nots']:4d}  ({report['with_why_nots_pct']}%)")
    print(f"  Com explanation:    {report['with_explanation']:4d}  ({report['with_explanation_pct']}%)")
    print(f"  Com situacao:       {report['with_situacao']:4d}  ({report['with_situacao_pct']}%)")

    print(f"\n  --- Opções de resposta ---")
    print(f"  Média de opções: {report['avg_options']}")
    print(f"  Mínimo:          {report['min_options']}")
    print(f"  Máximo:          {report['max_options']}")

    print(f"\n  --- Viés do gabarito ---")
    posicoes = report.get("answer_positions") or {}
    total_gabarito = sum(posicoes.values())
    for letra, count in sorted(posicoes.items()):
        pct = 100 * count / total_gabarito if total_gabarito else 0
        bar = "█" * max(1, count // 4)
        print(f"  Resposta {letra:2s} {count:4d}  ({pct:5.1f}%)  {bar}")
    vies = report.get("length_bias") or {}
    if vies.get("considered"):
        print(f"  Comprimento médio — correta: {vies['avg_correct']}  "
              f"incorretas: {vies['avg_wrong']}  (Δ {vies['delta']:+})")
        print(f"  Correta é a mais longa em {vies['longest_is_correct']} "
              f"({vies['longest_is_correct_pct']}%)")

    print(f"\n  --- Distribuição por domínio AWS ---")
    for domain, count in sorted(report["domain_counts"].items(), key=lambda x: -x[1]):
        bar = "█" * max(1, count // 2)
        print(f"  {domain:35s} {count:3d}  {bar}")

    print(f"\n  --- Distribuição de dificuldade ---")
    for diff, count in sorted(report["difficulty_counts"].items(), key=lambda x: -x[1]):
        bar = "█" * max(1, count // 2)
        print(f"  {diff:15s} {count:3d}  {bar}")

    print(f"\n  --- Top 15 serviços mais mencionados ---")
    top_services = sorted(report["service_counts"].items(), key=lambda x: -x[1])[:15]
    max_count = top_services[0][1] if top_services else 1
    for svc, count in top_services:
        bar_len = max(1, int(30 * count / max_count))
        bar = "█" * bar_len
        print(f"  {svc:30s} {count:3d}  {bar}")

    print(f"\n{'='*60}\n")


def main():
    # Alguns consoles (ex.: Windows com codepage legado) não usam UTF-8 por
    # padrão; sem isso, os prints com █/⚠️ abaixo levantam UnicodeEncodeError
    # e derrubam o relatório no meio. reconfigure não existe em todo stream
    # (ex.: capturas de teste com io.StringIO) — daí o hasattr.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if not os.path.exists(BANK_JS):
        print(f"ERRO: {BANK_JS} não encontrado. Execute 'python3 data/build-bank.py' primeiro.",
              file=sys.stderr)
        sys.exit(1)

    bank = extract_json_from_js(BANK_JS)
    fases = bank.get("fases", [])
    all_questions = []
    for fase in fases:
        all_questions.extend(fase.get("questions", []))

    report = analyze(all_questions)
    total = report["total"]
    print(f"\n  Fases: {len(fases)}")
    print(f"  Questões: {total}")

    if total == 0:
        print("  Nenhuma questão encontrada no banco.")
        sys.exit(1)

    # Warn on gaps
    missing_expl = total - report["with_explanation"]
    if missing_expl:
        print(f"  ⚠️  Alerta: {missing_expl} questão(ões) sem explanation.")
    missing_domain = report["domain_counts"].get("(sem domínio)", 0)
    if missing_domain:
        print(f"  ⚠️  Alerta: {missing_domain} questão(ões) sem domainLabel.")

    posicoes = report.get("answer_positions") or {}
    total_gabarito = sum(posicoes.values())
    for letra, count in sorted(posicoes.items()):
        if total_gabarito and count / total_gabarito > LIMITE_CONCENTRACAO_GABARITO:
            pct = round(100 * count / total_gabarito, 1)
            print(f"  ⚠️  Alerta: a resposta '{letra}' concentra {pct}% do gabarito "
                  f"(limite: {round(100 * LIMITE_CONCENTRACAO_GABARITO)}%). "
                  "A posição virou a resposta.")

    vies = report.get("length_bias") or {}
    if vies.get("considered") and vies["delta"] > LIMITE_DELTA_COMPRIMENTO:
        print(f"  ⚠️  Alerta: a alternativa correta é em média {vies['delta']} caracteres "
              f"mais longa que as incorretas (limite: {LIMITE_DELTA_COMPRIMENTO}). "
              "O comprimento está entregando a resposta.")

    print_report(report, bank.get("titulo", bank.get("cert", "AWS Bank")))


if __name__ == "__main__":
    main()
