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
    if not os.path.exists(BANK_JS):
        print(f"ERRO: {BANK_JS} não encontrado. Execute 'python3 data/build-bank.py' primeiro.",
              file=sys.stderr)
        sys.exit(1)

    bank = extract_json_from_js(BANK_JS)
    all_questions = []
    for fase in bank.get("fases", []):
        all_questions.extend(fase["questions"])

    report = analyze(all_questions)
    total = report["total"]
    print(f"\n  Fases: {len(bank['fases'])}")
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

    print_report(report, bank.get("titulo", bank.get("cert", "AWS Bank")))


if __name__ == "__main__":
    main()
