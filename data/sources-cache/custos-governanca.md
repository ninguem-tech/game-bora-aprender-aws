# Custos e Governança — notas com fonte (verificado 2026-06)

Notas destiladas e com fonte para autorar as questões de custo. Verificadas na doc oficial
em junho/2026 (a base de treino pode estar desatualizada — sempre conferir o que envelhece).

## Ferramentas de custo (mnemônico)
- **Pricing Calculator** = ESTIMA custo de algo ainda NÃO construído (planejamento/ROI/migração).
- **Cost Explorer** = ANALISA e PREVÊ o gasto REAL, visual; até 13 meses de histórico, previsão, recomendações de RI/Savings Plans.
- **AWS Budgets** = ALERTA quando o gasto real OU previsto cruza um limite.
- **Cost and Usage Report (CUR)** = EXPORTA o dado de billing mais granular (linha a linha, por hora/recurso/tag) num bucket S3 → Athena/QuickSight. (Naming novo: "Data Exports / CUR 2.0".)
- Fonte: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html · https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html · https://docs.aws.amazon.com/pricing-calculator/latest/userguide/what-is-pricing-calculator.html

## Savings Plans vs Reserved
- **Compute Savings Plans**: compromisso de gasto/hora (1 ou 3 anos), até ~72% off; flexível entre famílias/regiões e EC2/Fargate/Lambda. **Reserved Instances** (Standard) travam mais a configuração em troca de desconto um pouco maior. **Spot** = até 90% off, pode ser interrompido.

## AWS Compute Optimizer — VERIFICADO 2026-06 (escopo cresceu)
- Right-sizing pra: **EC2, EC2 Auto Scaling groups, EBS, Lambda, ECS no Fargate, e RDS/Aurora**; **recomendações de licença** (SQL Server no EC2); recomendações de **recursos ociosos** pra DynamoDB, ElastiCache, MemoryDB, DocumentDB, WorkSpaces, SageMaker.
- (Minha base dizia "EC2/ASG/EBS/Lambda/Fargate" — faltava RDS/Aurora + licenças. Corrigido.)
- Fonte: https://docs.aws.amazon.com/compute-optimizer/latest/ug/supported-resources.html · https://aws.amazon.com/compute-optimizer/faqs/

## AWS Trusted Advisor — VERIFICADO 2026-06 (são 6 categorias, NÃO 5)
- Categorias: **otimização de custos, performance, resiliência (tolerância a falhas), segurança, excelência operacional, e limites de serviço**. (Minha base dizia 5 — faltava "excelência operacional". Corrigido.) Disponibilidade dos checks varia por plano de Suporte.
- Fonte: https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html · https://aws.amazon.com/premiumsupport/technology/trusted-advisor/

## Cost Allocation Tags / Consolidated Billing
- **Cost Allocation Tags**: marcam recursos (Team/Project/Environment); ativadas no billing, o Cost Explorer/CUR agrupam custo por tag.
- **Consolidated Billing** (AWS Organizations): fatura única na conta pagadora + descontos por volume sobre o uso AGREGADO das contas.
