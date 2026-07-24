# Operações e Governança — notas verificadas

Recuperado em 2026-06-25 (Systems Manager, AWS Config). Foco SAA-C03.

## AWS Systems Manager (SSM)
- **Parameter Store**: armazenamento hierárquico de configuração e segredos leves. Tipos String, StringList (texto puro) e **SecureString** (criptografado com KMS). Versionamento, controle por IAM, integra com EC2/Lambda/ECS/CloudFormation. Barato.
- **Parameter Store vs Secrets Manager**: Secrets Manager é feito pra segredos com **rotação automática** nativa (via Lambda), replicação entre regiões, credenciais de banco. Parameter Store = config simples/segredo leve, sem rotação automática. Regra de prova: rotação automática = Secrets Manager.
- **Session Manager**: shell interativo nas instâncias via agente SSM (conexão de saída) — **sem abrir porta 22, sem chave SSH, sem bastion**. Acesso por IAM, auditável. Reduz superfície de ataque.
- **Patch Manager**: aplica patches na frota em escala + visibilidade de conformidade (quem está atualizado). Baselines + janelas de manutenção.
- **Run Command**: executa comandos remotos em instâncias sem SSH.
- Fontes: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html · https://aws.amazon.com/blogs/security/how-to-choose-the-right-aws-service-for-managing-secrets-and-configurations/

## AWS Config
- Registra continuamente a configuração dos recursos e mantém **resource timeline** (como o recurso estava/mudou no tempo). Avalia conformidade via **Config rules**.
- **Config rule**: representa a configuração desejada de um recurso; avalia mudanças e marca conforme/não-conforme; mostra tendência e qual mudança causou o drift.
- **Conformance pack**: coleção de Config rules + ações de remediação empacotadas numa entidade única; implantável numa conta/região OU em toda a organização (via Organizations). Simplifica compliance em escala.
- **Config vs CloudTrail**: Config = O QUE mudou na configuração do recurso (e histórico). CloudTrail = QUEM chamou qual API, quando, de onde. Complementares numa investigação (o quê + quem + quando).
- Fontes: https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html · https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html

## Organizations / SCP (reforço)
- **SCP (Service Control Policy)**: teto de permissões (guardrail) sobre OUs/contas. NÃO concede acesso — só limita o máximo. Mesmo com IAM liberando, se a SCP nega, a ação não acontece. Casos: proibir desligar CloudTrail, bloquear regiões não autorizadas. Quem concede permissão é o IAM dentro da conta.

## EventBridge (antigo CloudWatch Events)
- Barramento de eventos: regras casam padrão de evento (ex.: mudança de estado EC2) OU agenda (cron) e roteiam pra alvos (Lambda, SNS, SQS, Step Functions). Base de automação orientada a eventos.
