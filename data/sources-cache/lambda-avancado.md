# AWS Lambda — Aprofundamento — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Limites principais
- **Timeout máximo: 15 minutos** (900s). Se o trabalho passa disso, Lambda NÃO é a ferramenta — use **Fargate/ECS, Step Functions ou Batch**.
- **Memória**: até **10.240 MB** (10 GB). Aumentar memória também aumenta CPU/rede proporcionalmente (ajuste de desempenho).
- **/tmp**: armazenamento efêmero (512 MB padrão, configurável até 10 GB).
- Fontes: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html · https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html

## Concorrência: Reserved vs Provisioned
- **Reserved concurrency**: reserva um teto de execuções concorrentes pra uma função (e esse pool fica SÓ pra ela; outras funções não usam). Usos: **garantir** que uma função crítica sempre tenha capacidade, ou **limitar/throttle** uma função pra não esgotar a conta. **NÃO elimina cold start.**
- **Provisioned concurrency**: pré-inicializa N ambientes de execução → **sem cold start**, resposta em dezenas de ms. Pra **workloads interativos sensíveis a latência** (APIs web/mobile). Tem custo extra.
- Dá pra usar os DOIS juntos (ex.: provisioned pra a base de dias de semana + reserved pra absorver picos de fim de semana).
- **Cold start**: a primeira invocação (ou ao escalar) precisa inicializar o ambiente → latência extra; provisioned concurrency evita isso.
- Fontes: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html · https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html

## Modelos de invocação / fontes de evento
- **Síncrona** (API Gateway, ALB): o chamador espera a resposta. Erro volta pro chamador.
- **Assíncrona** (S3, SNS, EventBridge): Lambda enfileira o evento, processa, faz **retry automático** (2x) e, em falha, pode mandar pra **DLQ** ou **destinations**. O chamador não espera.
- **Event source mapping / poll-based** (SQS, Kinesis Data Streams, DynamoDB Streams): o Lambda **faz polling** da fonte e invoca a função com **lotes (batches)** de registros.
- Fontes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-invocation.html

## Tratamento de erro
- **Dead-Letter Queue (DLQ)**: captura eventos de invocações ASSÍNCRONAS que falharam (destino SQS ou SNS) pra análise/reprocessamento.
- **Lambda Destinations**: roteia resultado de invocação assíncrona (sucesso/falha) pra SQS, SNS, Lambda ou EventBridge.

## Lambda Layers
- Empacotam **bibliotecas/dependências** (ou um runtime customizado) separadas do código da função; **compartilháveis entre funções**, reduzem o tamanho do pacote de deploy e centralizam dependências comuns.

## Lambda em VPC
- Pode-se configurar a função pra acessar recursos privados numa VPC (ex.: RDS). Ela ganha ENIs nas sub-redes; precisa de rota/NAT ou VPC endpoints pra acessar serviços AWS/internet.

## Regra de prova
- Job curto orientado a evento (< 15 min) = Lambda. Job longo/contínuo = Fargate/ECS/Batch. Latência interativa sem cold start = provisioned concurrency. Garantir/limitar capacidade = reserved concurrency.
