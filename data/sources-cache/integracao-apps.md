# Integração de Aplicações — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Amazon SQS (filas)
- Desacopla produtores e consumidores; o consumidor faz **PULL** das mensagens.
- **Standard**: **at-least-once** (pode duplicar), ordenação **best-effort** (loose-FIFO), throughput quase ilimitado.
- **FIFO**: **ordem estrita** preservada + **exactly-once** (sem duplicata), via `MessageGroupId` e `MessageDeduplicationId`; throughput alto, porém limitado. Use quando a ORDEM e a não-duplicação são críticas (ex.: transações financeiras).
- **Visibility timeout**: ao receber uma mensagem, ela fica **invisível** pros outros consumidores até o timeout expirar ou ela ser deletada. Evita processamento duplicado simultâneo; se o consumidor falhar e não deletar, a mensagem reaparece.
- **Dead-Letter Queue (DLQ)**: quando a mensagem excede o `maxReceiveCount` (falha repetida = "poison message"), o SQS a move pra DLQ (mesmo tipo da origem) pra análise — evita travar a fila.
- Fontes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-types.html

## SQS vs SNS vs EventBridge
- **SQS**: fila (pull), 1 grupo de consumidores processa, desacoplamento e absorção de pico.
- **SNS**: **pub/sub (push)**, fan-out de um evento pra muitos inscritos (filas SQS, Lambda, HTTP, e-mail/SMS).
- **EventBridge**: barramento de eventos com regras por padrão/agenda e roteamento pra muitos alvos; integra eventos de SaaS e serviços AWS.
- Fontes: https://docs.aws.amazon.com/decision-guides/latest/sns-or-sqs-or-eventbridge/sns-or-sqs-or-eventbridge.html

## AWS Step Functions (orquestração)
- Orquestra fluxos de trabalho como **máquina de estados** (serverless): passos sequenciais/paralelos, **branching**, **retry/catch de erro**, timeouts — sem você escrever a lógica de cola na mão.
- Coordena Lambda, ECS, SNS, SQS, DynamoDB, etc. **Standard Workflows** (longa duração, duráveis, exactly-once) vs **Express Workflows** (alto volume, curta duração).
- Use quando há vários passos com dependências/erros a tratar — em vez de encadear Lambdas chamando Lambda na mão.
- Fontes: https://aws.amazon.com/step-functions/

## Amazon API Gateway (tipos)
- **REST API**: completo — API keys, usage plans, validação de request, cache, mais recursos. Pra APIs que precisam desses controles.
- **HTTP API**: mais **simples, barato e de baixa latência**; ótimo pra proxy a Lambda/HTTP. Menos recursos que a REST.
- **WebSocket API**: conexão **bidirecional persistente** pra tempo real (chat, notificações push, dashboards ao vivo).
- Fontes: https://aws.amazon.com/api-gateway/

## Amazon MQ
- **Message broker gerenciado** (Apache **ActiveMQ** e **RabbitMQ**), compatível com protocolos padrão: **JMS, AMQP, MQTT, STOMP, OpenWire**.
- Use pra **MIGRAR aplicações existentes** que já dependem desses protocolos/brokers tradicionais, sem reescrever. Pra apps NOVAS, SQS/SNS são mais simples e escaláveis.
- Regra de prova: "migrar broker on-premises com AMQP/JMS/MQTT sem mudar o código" = **Amazon MQ**; app nova cloud-native = SQS/SNS.
- Fontes: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-difference-from-amazon-mq-sns.html
