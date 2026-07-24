# Bancos de Dados — Aprofundamento — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## Amazon Aurora
- Banco relacional gerenciado, **compatível com MySQL e PostgreSQL**, alta performance/HA.
- **Armazenamento**: dados gravados são replicados **sincronamente em 6 cópias, distribuídas por 3 AZs** (volume de cluster numa região). Tolerante a falha, auto-recupera.
- **Réplicas de leitura**: até **15 Aurora Replicas** por cluster, distribuídas pelas AZs; baixa latência de réplica (compartilham o mesmo volume).
- **Aurora Global Database**: abrange **múltiplas regiões** (até 5), leitura global de baixa latência + DR cross-region com RTO em minutos. Cada região pode hospedar 15 réplicas.
- Tem versão **Serverless v2** (escala capacidade automaticamente).
- Fontes: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html · https://aws.amazon.com/rds/aurora/faqs/

## RDS: Multi-AZ vs Read Replica (pegadinha clássica)
- **Multi-AZ** = ALTA DISPONIBILIDADE. Standby **síncrono** em outra AZ, failover automático em falha. O standby **NÃO serve leitura** — é só pra resiliência/durabilidade.
- **Read Replica** = ESCALAR LEITURA. Réplica(s) **assíncrona(s)**, read-only, pra distribuir carga de leitura. Pode ser cross-Region. Clientes leem da réplica, escrevem no primário.
- Resumo: Multi-AZ resolve disponibilidade; Read Replica resolve throughput de leitura. São complementares (uma read replica pode até ser Multi-AZ).
- Fontes: https://aws.amazon.com/rds/features/multi-az/ · https://aws.amazon.com/rds/features/read-replicas/

## Amazon ElastiCache (Redis OSS / Valkey vs Memcached)
- **Memcached**: simples, multi-threaded, **sem persistência, sem replicação/HA**. Bom pra cache simples e **dados de sessão** onde perder os dados não é crítico; escala horizontal fácil.
- **Redis OSS / Valkey**: rico em recursos — **réplicas de leitura, Multi-AZ, persistência (AOF), pub/sub, sorted sets** (ex.: leaderboards), transações. Use quando precisa de HA, persistência ou estruturas avançadas.
- NOTA de versão: a ElastiCache hoje oferece três engines — **Valkey** (fork open-source do Redis, adicionado em 2024), **Redis OSS** e **Memcached**. Réplicas de leitura existem só em Valkey/Redis OSS, não no Memcached.
- Regra de prova: persistência/HA/estruturas avançadas = Redis (ou Valkey); cache simples e descartável = Memcached.
- Fontes: https://aws.amazon.com/elasticache/redis-vs-memcached/ · https://aws.amazon.com/elasticache/faqs/

## DynamoDB — recursos avançados
- **DAX (DynamoDB Accelerator)**: cache **in-memory** gerenciado pra DynamoDB, latência de **microssegundos** (até 10x mais rápido), pra cargas **read-intensive**. NÃO serve pra write-heavy; leituras **strongly consistent** passam direto (bypassam o cache).
- **Global Tables**: replicação **multi-Region ativo-ativo**; escrita numa região é replicada automaticamente nas outras réplicas. (Escrita em réplica bypassa o DAX.)
- **DynamoDB Streams**: captura eventos de mudança (insert/update/delete) em ordem; aciona consumidores em tempo real (ex.: Lambda) — base de arquitetura orientada a eventos/CDC.
- Fontes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html · https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
