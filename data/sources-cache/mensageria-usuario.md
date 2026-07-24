# Mensageria ao Usuário Final (E-mail e Notificações) — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## Amazon SES (Simple Email Service)
- Serviço **só de E-MAIL**, com API e interface **SMTP**. Pra **enviar e-mail** a partir de aplicações: transacional (confirmação, reset de senha, recibo) e em massa (marketing/newsletter), e integra com apps de terceiros (CRM) via SMTP.
- Também pode **RECEBER e-mail** (inbound) e acionar ações (ex.: salvar no S3, chamar Lambda).
- Cuida de **deliverability**: monitora bounce e complaint rate (taxa de rejeição/reclamação) — importante pra reputação de envio.
- Fontes: https://aws.amazon.com/ses/ · https://docs.aws.amazon.com/ses/latest/dg/

## Amazon SNS (Simple Notification Service) — canais ao usuário
- **Pub/sub** + envio de notificações: **SMS** (texto pra celular), **push mobile** (via APNs/FCM pra apps iOS/Android), **e-mail**, **HTTP/S**, e fan-out pra **SQS/Lambda** (já visto na fase de integração).
- Tópicos **Standard** (alto throughput, best-effort) e **FIFO** (ordem + sem duplicata, pra fan-out ordenado a filas SQS FIFO).
- Caso ao usuário: enviar um SMS de alerta, um push pro app, ou notificar vários inscritos de uma vez.
- Fontes: https://aws.amazon.com/sns/

## SES vs SNS (pegadinha)
- **SES** = serviço dedicado de **E-MAIL** (transacional/marketing, SMTP, deliverability).
- **SNS** = **notificações pub/sub** multi-canal (SMS, push, e-mail simples, HTTP, fan-out pra filas).
- Regra: enviar e-mail rico/em massa de aplicação = **SES**; mandar SMS/push ou notificar muitos inscritos/sistemas = **SNS**.

## NOTA: Amazon Pinpoint — FIM DE SUPORTE (omitido)
- O **Amazon Pinpoint** (engajamento de cliente: campanhas, segmentação, jornadas multicanal) terá **fim de suporte em 30/out/2026**; a AWS direciona pra **AWS End User Messaging** (+ SES/SNS). **NÃO usar como serviço atual** no app. Pode aparecer em provas antigas, mas evitar questão dedicada.
- Fontes: https://docs.aws.amazon.com/pinpoint/latest/userguide/migrate.html

## Resumo de escolha (prova)
- Enviar/receber e-mail de aplicação (transacional/marketing) = **SES**.
- Enviar SMS, push mobile, ou notificar vários inscritos/sistemas = **SNS**.
- (Campanhas de marketing multicanal: era Pinpoint → migrando pra AWS End User Messaging; evitar.)
