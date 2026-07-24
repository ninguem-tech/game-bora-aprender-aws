# Compliance, Auditoria e Análise de Acesso — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03.

## AWS Artifact
- **Portal self-service pra BAIXAR os relatórios de conformidade DA AWS** (SOC 1/2/3, PCI DSS, ISO, etc.) e acordos legais (ex.: BAA, NDA).
- Prova que a **infraestrutura da AWS** atende aos requisitos de compliance — pra você entregar a auditores/clientes. É sobre a conformidade DA AWS, não da sua aplicação.
- Fontes: https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html

## AWS Audit Manager
- **Audita continuamente o SEU uso da AWS** e **automatiza a coleta de evidências** contra frameworks (SOC 2, PCI DSS, GDPR, HIPAA, etc.), avaliando se seus **controles** (políticas/procedimentos) estão efetivos.
- É sobre a conformidade da SUA carga/configuração rodando na AWS (não da AWS em si).
- Fontes: https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html

## Artifact vs Audit Manager (pegadinha)
- **Artifact** = relatórios de conformidade **DA AWS** (baixar SOC/PCI/ISO).
- **Audit Manager** = auditar e coletar evidências do **SEU** ambiente pra demonstrar a SUA conformidade.

## IAM Access Analyzer
- Usa **raciocínio baseado em lógica** pra analisar políticas baseadas em recurso e **identificar recursos compartilhados com entidades EXTERNAS** (S3 buckets, IAM roles, KMS keys, filas SQS, etc.) — ou seja, **acesso não intencional**. Gera **findings** pra você revisar (intencional vs risco).
- Também faz **análise de acesso interno** (quais principals da org acessam recursos críticos → menor privilégio) e **validação/preview de políticas** (como uma policy afeta acesso público/cross-account antes de aplicar).
- Caso: descobrir que um bucket S3 está acessível por uma conta externa sem querer.
- Fontes: https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html

## Não confundir (recap)
- **IAM Access Analyzer** = acesso EXTERNO/não-intencional a recursos (policies).
- **AWS Config** = conformidade da CONFIGURAÇÃO dos recursos (o quê está/mudou).
- **AWS CloudTrail** = auditoria de chamadas de API (quem fez o quê, quando).
- **Audit Manager** = coleta de evidências de auditoria contra frameworks.
- **Artifact** = relatórios de conformidade da própria AWS.

## Resumo de escolha (prova)
- Baixar relatório SOC/PCI da AWS = **Artifact**.
- Automatizar evidência de auditoria do seu ambiente = **Audit Manager**.
- Achar bucket/role compartilhado com conta externa sem querer = **IAM Access Analyzer**.
- Config = configuração; CloudTrail = chamadas de API.
