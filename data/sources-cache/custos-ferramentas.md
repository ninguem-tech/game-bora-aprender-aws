# Otimização de Custos — Ferramentas Avançadas — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03. (Complementa a fase "Custos e Governança", focando no que faltava.)

## AWS Cost Anomaly Detection
- Usa **machine learning** pra aprender o padrão histórico de gasto e detectar **gastos anômalos** (picos fora do esperado), com **análise de causa raiz** e alertas.
- Segmenta por **serviço, conta vinculada, cost allocation tag ou cost category**. Monitores gerenciados se adaptam conforme a organização cresce.
- Caso: ser avisado proativamente de um pico inesperado (ex.: recurso esquecido ligado) sem definir limite fixo.
- Fontes: https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/

## Cost Allocation Tags
- **Tags** (chave-valor, ex.: `ambiente=prod`, `time=marketing`) aplicadas aos recursos. Você as **ativa** no console de Billing; depois elas aparecem no **Cost Explorer e no CUR**, permitindo **quebrar o custo por tag** (por projeto/time/ambiente).
- Caso: descobrir quanto cada time/projeto gasta. Há tags geradas pela AWS e tags definidas pelo usuário.

## AWS Budgets + Budget Actions
- **Budgets**: define orçamentos de custo/uso com **alertas** quando passa de um limite (recap da fase anterior).
- **Budget Actions** (controle automático): ao exceder o limite, executa uma **ação** — automática ou com aprovação. Três tipos: aplicar uma **IAM policy**, aplicar uma **SCP**, ou **parar instâncias EC2/RDS** específicas. Caso: cortar gasto automaticamente quando estoura o orçamento (ex.: parar instâncias num ambiente de dev).
- Fontes: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html

## AWS Compute Optimizer
- Recomendações de **rightsizing** baseadas em ML pra **EC2, Auto Scaling groups, EBS, ECS (Fargate), Lambda e RDS** (MySQL/PostgreSQL/Aurora). Identifica recursos **superdimensionados** (economia), **subdimensionados** (performance) e **ociosos** (idle).
- Períodos de análise (lookback): 14 dias (padrão), 32 ou 93 dias.
- Caso: "qual o tamanho/instância ideal pros meus recursos?" → Compute Optimizer.
- Fontes: https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html

## Amazon S3 Storage Lens
- **Visibilidade org-wide do armazenamento S3**: uso, tendências de atividade e **recomendações acionáveis** pra otimizar custo, performance e proteção de dados. Dashboard no console. Métricas grátis + métricas avançadas (pagas, com insight por prefixo, exportação pro CloudWatch).
- Caso: enxergar e otimizar o S3 de toda a organização num painel só.
- Fontes: https://aws.amazon.com/s3/storage-lens/

## Cost Explorer vs Cost and Usage Report (CUR)
- **Cost Explorer**: ferramenta visual pra **analisar e prever** custos/uso (UI, gráficos, até 13 meses de histórico + forecast). Bom pra análise rápida e dashboards.
- **CUR (Cost and Usage Report)**: o **dado bruto mais detalhado**, linha a linha, entregue no **S3** — pra análise profunda e integração com **Athena/Redshift/QuickSight**.
- Regra: análise visual rápida = Cost Explorer; dado granular pra processar = CUR.
- Fontes: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html

## Resumo de escolha (prova)
- Pico de gasto anômalo (ML, sem limite fixo) = **Cost Anomaly Detection**.
- Custo por time/projeto/ambiente = **Cost Allocation Tags**.
- Alerta de orçamento + ação automática (parar EC2/RDS, aplicar SCP) = **Budgets + Budget Actions**.
- Tamanho ideal de recurso (rightsizing/idle) = **Compute Optimizer**.
- Visibilidade e otimização do S3 = **S3 Storage Lens**.
- Análise visual de custo = **Cost Explorer**; dado bruto detalhado = **CUR**.
