# Bancos de Dados Especializados (purpose-built) — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03. Tese AWS: "banco certo pro trabalho certo".

## Amazon DocumentDB (compatível com MongoDB)
- Banco de **documentos** JSON/BSON, gerenciado, compatível com MongoDB. Esquema flexível.
- Casos: gestão de conteúdo (CMS), **perfis/preferências de usuário**, catálogos. Quando a app já usa MongoDB e quer migrar gerenciado.
- Fontes: https://aws.amazon.com/documentdb/

## Amazon Neptune (grafo)
- Banco de **grafo** gerenciado: nós (entidades) + arestas (relações). Consulta bilhões de relações em segundos.
- Casos: **redes sociais, motores de recomendação, detecção de fraude, knowledge graphs** — dados altamente conectados.
- Fontes: https://aws.amazon.com/neptune/

## Amazon Keyspaces (para Apache Cassandra)
- Banco **wide-column** compatível com **Cassandra (CQL)**, gerenciado e serverless, escala automática, throughput praticamente ilimitado.
- Casos: apps com **alta taxa de leitura/escrita**, migrar workloads Cassandra existentes sem gerenciar clusters.
- Fontes: https://aws.amazon.com/keyspaces/

## Amazon Timestream (séries temporais)
- Banco de **séries temporais** serverless; armazena/analisa trilhões de eventos por dia, até ~1000x mais rápido que relacional pra esse tipo de dado.
- Casos: **dados de sensores IoT, telemetria industrial, métricas de saúde/uso de app, monitoramento de performance, analytics em tempo real** — qualquer coisa indexada por TEMPO.
- Fontes: https://aws.amazon.com/timestream/

## Amazon MemoryDB (Redis durável)
- Banco **in-memory durável** compatível com Redis: leitura em microssegundos, escrita sub-ms, **durabilidade Multi-AZ** (log transacional).
- Diferença pro ElastiCache: ElastiCache é **cache** (dado pode ser perdido; fica NA FRENTE de um banco). MemoryDB é **banco primário durável** in-memory — não precisa de um banco separado por trás.
- Caso: microsserviços que precisam de performance in-memory E persistência como **banco primário**.
- Fontes: https://aws.amazon.com/memorydb/

## NOTA: Amazon QLDB (ledger) — DESCONTINUADO
- QLDB (banco ledger imutável/verificável) teve **fim de suporte em 31/jul/2025**; AWS recomenda migrar pra **Aurora PostgreSQL**. **NÃO usar como serviço atual** no app. O conceito (histórico imutável/verificável) ainda pode aparecer em provas antigas, mas evitar questão dedicada.
- Fontes: https://docs.aws.amazon.com/qldb/ (avisos de end-of-support)

## Regra de escolha (prova)
- Documento/JSON (MongoDB) = **DocumentDB**; relações/grafo (fraude, recomendação, social) = **Neptune**; Cassandra/wide-column alta escala = **Keyspaces**; séries temporais/IoT = **Timestream**; in-memory durável como primário = **MemoryDB**; cache in-memory (não durável) = **ElastiCache**; chave-valor NoSQL gerenciado de propósito geral = **DynamoDB**.
