# Governança Multi-Conta e Escala — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## AWS Organizations
- Gerencia **várias contas AWS** de forma central. **Organizational Units (OUs)**: agrupam contas em unidades lógicas (ex.: Prod, Dev, Sandbox), permitindo aplicar políticas diferentes por grupo.
- **SCPs** (Service Control Policies): guardrails/teto de permissões aplicados a OUs/contas (visto na fase de Operações/IAM). **Consolidated billing**: fatura única + partilha de descontos (visto em Fundamentos).
- Fontes: https://docs.aws.amazon.com/organizations/latest/userguide/

## AWS Control Tower
- **Configura e governa um ambiente multi-conta automaticamente**: cria uma **landing zone** (ambiente multi-conta bem-arquitetado, baseado em boas práticas de segurança/compliance) em menos de 1h. Orquestra **Organizations + Service Catalog + IAM Identity Center**.
- É a **camada de automação/governança** EM CIMA do Organizations (Organizations = a fundação/estrutura; Control Tower = a automação que aplica as boas práticas).
- **Guardrails (controls)** — dois tipos:
  - **Preventivos**: usam **SCPs** pra PROIBIR ações que violam a política; **herdam pela hierarquia de OUs**. Ex.: bloquear regiões não autorizadas.
  - **Detectivos**: usam **AWS Config rules** pra DETECTAR/reportar não-conformidade (não bloqueiam); NÃO herdam pela OU. Ex.: detectar bucket S3 público.
- Use quando quer montar do zero (ou padronizar) um ambiente de várias contas com governança pronta.
- Fontes: https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html · https://docs.aws.amazon.com/prescriptive-guidance/latest/designing-control-tower-landing-zone/guardrails.html

## AWS Resource Access Manager (RAM)
- **Compartilha recursos com segurança ENTRE contas** (e dentro de OUs/Organization), em vez de duplicar o recurso em cada conta.
- Recursos compartilháveis comuns: **sub-redes de VPC**, **Transit Gateway**, regras do **Route 53 Resolver**, **License Manager**, e mais.
- Cria uma **resource share**: você cria o recurso UMA vez e compartilha; pro consumidor, o recurso aparece no próprio console como se fosse dele. Reduz overhead operacional e mantém consistência.
- Fontes: https://docs.aws.amazon.com/ram/latest/userguide/what-is.html

## AWS Service Catalog
- Cria e gerencia um **catálogo curado de produtos aprovados** (templates IaC, geralmente CloudFormation) que os usuários finais podem **implantar em autosserviço**, dentro das permissões/guardrails definidos.
- Padroniza ambientes, acelera entrega e garante governança/compliance: os usuários só lançam o que foi aprovado (ex.: um EC2 pré-configurado, uma VPC baseline).
- Fontes: https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html

## Resumo de escolha (prova)
- Agrupar contas + aplicar política por grupo = **Organizations (OUs/SCPs)**.
- Montar/governar ambiente multi-conta automático com boas práticas (landing zone, guardrails) = **Control Tower**.
- Compartilhar um recurso (ex.: sub-rede) entre contas sem duplicar = **RAM**.
- Catálogo de produtos aprovados pra autosserviço dos usuários = **Service Catalog**.
