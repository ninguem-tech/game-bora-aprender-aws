# Contêineres a Fundo — ECR e Orquestração — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03. (Aprofunda a fase de Compute/Contêineres.)

## Amazon ECR (Elastic Container Registry)
- **Registro de imagens de contêiner** gerenciado (Docker/OCI): armazena, versiona e distribui imagens. Integra com **ECS, EKS** e ferramentas de CI/CD.
- Recursos: **scan de vulnerabilidade** das imagens, controle de acesso via IAM, criptografia, replicação. É de onde o ECS/EKS puxa a imagem pra rodar.
- Fontes: https://docs.aws.amazon.com/AmazonECR/latest/userguide/

## Hierarquia do ECS (não confundir)
- **Task definition**: o **blueprint** (JSON) da aplicação — qual **imagem**, CPU/memória, portas, volumes, variáveis. É o "molde".
- **Task**: uma **instância em execução** de uma task definition (a menor unidade no ECS; pode ter 1+ contêineres).
- **Service**: mantém o **número desejado de tasks** rodando ao mesmo tempo; se uma task falha/para, o scheduler sobe outra pra manter o desejado. Integra com **ELB** e suporta **auto scaling**.
- **Cluster**: agrupamento lógico que fornece a **capacidade de infraestrutura** pras tasks/services.
- Resumo: task definition (molde) → task (instância) → service (mantém N tasks) → cluster (infra).
- Fontes: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html · https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html

## Fargate vs Fargate Spot
- **Fargate**: capacidade **on-demand** serverless pra contêineres (você paga por CPU/memória da task, sem gerenciar servidor).
- **Fargate Spot**: roda tasks em **capacidade ociosa** com **até 70% de desconto**, mas **interrompível** (aviso de 2 minutos quando a AWS precisa da capacidade de volta).
- Casos do Spot: workloads **tolerantes a interrupção** — batch, dev/staging, e qualquer coisa sem requisito de alta disponibilidade/baixa latência. Dá pra **misturar** Fargate on-demand + Fargate Spot (base estável + burst barato).
- Fontes: https://aws.amazon.com/fargate/faqs/ · https://aws.amazon.com/blogs/compute/deep-dive-into-fargate-spot-to-run-your-ecs-tasks-for-up-to-70-less/

## ECS Service Auto Scaling
- Ajusta automaticamente o **número de tasks** do service. **Target tracking** é o modo mais simples: você define um alvo numa métrica e o ECS mantém.
- Métricas comuns: **ECSServiceAverageCPUUtilization**, **ECSServiceAverageMemoryUtilization**, **ALBRequestCountPerTarget** (requisições por task via ALB). Também há step scaling, scheduled e métricas custom (ex.: mensagens numa fila SQS).
- Fontes: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html

## Recap (da fase anterior)
- **ECS** (orquestrador AWS-opinativo simples) vs **EKS** (Kubernetes gerenciado). **Fargate** (serverless, sem gerenciar a frota) vs **launch type EC2** (você gerencia as instâncias). Fargate funciona com ECS E EKS.

## Resumo de escolha (prova)
- Guardar/escanear imagens de contêiner = **ECR**.
- Molde da aplicação = **task definition**; manter N cópias rodando = **service**; infra = **cluster**.
- Contêiner serverless on-demand = **Fargate**; tolerante a interrupção, barato = **Fargate Spot**.
- Escalar o nº de tasks por métrica = **ECS Service Auto Scaling (target tracking)**.
