# Monitoramento e Observabilidade — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## CloudWatch — métricas
- **Basic monitoring**: padrão, **grátis**, intervalos de **5 minutos** (EC2). Habilitado automaticamente.
- **Detailed monitoring**: **opt-in e pago**, intervalos de **1 minuto** (EC2). Pra reação mais rápida (ex.: Auto Scaling mais ágil).
- **Custom metrics**: métricas que você publica (via agente ou PutMetricData), cobradas como custom.

## Pegadinha clássica: memória e disco do EC2
- O EC2, por padrão, **NÃO publica métricas de uso de MEMÓRIA (RAM) nem de DISCO** (são métricas do SO/in-guest).
- Pra ter memória/disco no CloudWatch, **instale o unified CloudWatch agent** — ele coleta `mem_used_percent`, `disk used_percent`, etc., e envia como **custom metrics**.
- O agent também coleta logs e métricas in-guest de EC2 e de servidores **on-premises**.
- Fontes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html · https://aws.amazon.com/premiumsupport/knowledge-center/cloudwatch-memory-metrics-ec2/

## CloudWatch Logs e Logs Insights
- **CloudWatch Logs**: centraliza logs de aplicações/serviços/instâncias.
- **CloudWatch Logs Insights**: serviço interativo pra **consultar, analisar e visualizar** os logs (query), pra troubleshooting operacional.

## Alarmes
- **Alarme** dispara quando uma métrica cruza um limite por N períodos. **Ações**: notificar via **SNS**, ação de **Auto Scaling** (escalar), ação de EC2 (parar/reiniciar/recuperar) e enviar evento ao **EventBridge**.
- **Composite alarm**: combina vários alarmes com **lógica booleana** (AND/OR) num indicador agregado de saúde — **reduz ruído** (notifica no nível agregado, não a cada alarme). 1 composite pode monitorar 100 alarmes.
- Mudança de estado de alarme → **EventBridge** → aciona Lambda, SSM Automation, SQS, Step Functions, etc. (automação de resposta/auto-remediação).
- Fontes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html · https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html

## A tríade da observabilidade (reforço)
- **CloudWatch** = métricas, logs e alarmes (saúde/desempenho em tempo real).
- **CloudTrail** = auditoria de chamadas de API (quem fez o quê, quando).
- **X-Ray** = tracing distribuído (caminho de uma requisição entre serviços).
- Fontes: https://docs.aws.amazon.com/decision-guides/latest/monitoring-on-aws-how-to-choose/monitoring-on-aws-how-to-choose.html
