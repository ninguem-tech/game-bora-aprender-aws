# S3 — Recursos Avançados — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Versionamento
- Mantém **múltiplas versões** do mesmo objeto → protege contra **exclusão/sobrescrita acidental** (a versão antiga continua lá; delete cria um "delete marker").
- **Pré-requisito** pra **Replication** e **Object Lock**.

## Replicação (CRR e SRR)
- **CRR (Cross-Region Replication)**: replica objetos pra um bucket em **outra região**. Casos: **DR/conformidade geográfica**, menor latência de acesso em outra região, manter cópia longe da produção. **Incorre custo de transferência inter-região**.
- **SRR (Same-Region Replication)**: replica pra um bucket na **MESMA região**. Casos: **agregar logs** de vários buckets, replicar prod→test, conformidade/residência de dados na mesma região. **Sem custo de transferência** (mesma região).
- **Requisitos**: versionamento ligado na **origem E no destino**; replicação é **assíncrona**; objetos existentes não são replicados por padrão (precisa S3 Batch Replication). Se a origem tem Object Lock, o destino também precisa ter.
- Fontes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html · https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html

## Object Lock (WORM)
- Modelo **WORM (write-once-read-many)**: impede sobrescrita/exclusão de uma versão de objeto. Pra compliance regulatório e proteção contra ransomware/exclusão. **Exige versionamento**.
- Dois mecanismos: **Retention period** (período FIXO de tempo travado) e **Legal hold** (sem prazo fixo, vale até ser removido manualmente). Um objeto pode ter um, outro ou ambos.
- Dois **modos de retenção**: **Governance** (usuários com permissão especial `s3:BypassGovernanceRetention` podem alterar/remover) vs **Compliance** (NINGUÉM, nem a root, pode alterar/apagar até o período expirar).
- Fontes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html

## Transfer Acceleration (S3TA)
- Acelera **uploads/downloads de longa distância** usando as **edge locations** e a **backbone** da AWS (em vez da rota pública variável). Ganho de 50–500% pra objetos grandes e usuários distantes do bucket.
- Caso: usuários globais enviando arquivos pra um bucket numa região distante; combina bem com **multipart upload**.
- Fontes: https://aws.amazon.com/s3/transfer-acceleration/

## Presigned URL
- URL **temporária** que concede permissão por tempo limitado pra **baixar OU enviar** um objeto específico, **sem o terceiro ter credenciais/permissões AWS**. Quem gera assina com suas credenciais.
- Expiração: console **1 min–12h**; via SDK/CLI até **7 dias**.
- Caso: deixar um usuário fazer upload direto pro S3 a partir do navegador/app sem expor credencial.
- Fontes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html

## Event Notifications
- O S3 publica eventos (ex.: objeto criado/removido) pra **Lambda, SNS, SQS** (e EventBridge). Base de arquitetura orientada a evento (ex.: processar imagem ao subir).
- **Pegadinha**: **fila SQS FIFO NÃO é suportada** como destino de event notification (só SQS standard).
- Fontes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
