# Busca, Análise de Logs e Integração SaaS — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03.

## Amazon OpenSearch Service
- Motor gerenciado de **busca + análise** (era "Amazon Elasticsearch Service"; renomeado pra OpenSearch em 2021). Compatível com OpenSearch/Elasticsearch.
- **Dois casos principais:**
  1. **Análise de logs** (log analytics): ingerir e analisar grandes volumes de dados **time-series gerados por máquina** (logs operacionais, de segurança, comportamento de usuário) — monitorar e fazer **troubleshooting de logs de aplicação**, centralizar logs de CloudWatch, VPC Flow Logs, etc.
  2. **Busca full-text**: catálogo de e-commerce, busca de conteúdo/documentos, CMS — pesquisa textual rápida e relevante.
- **Ingestão**: em tempo real ou batch via **Kinesis Data Firehose**, AWS Glue, Logstash, e integrações zero-ETL com S3/DynamoDB.
- **OpenSearch Dashboards** (ex-Kibana): visualizações e dashboards interativos pra explorar os dados. Tem opção **Serverless**.
- Fontes: https://aws.amazon.com/opensearch-service/ · https://aws.amazon.com/opensearch-service/faqs/

## OpenSearch vs outras ferramentas (posicionamento)
- **OpenSearch**: busca full-text + análise de logs em tempo real, com dashboards (Kibana). Para indexar e buscar/consultar logs frequentemente.
- **CloudWatch Logs Insights**: consulta interativa de logs do CloudWatch (nativo, pay-per-query) — bom pra investigação pontual.
- **Athena**: SQL ad-hoc sobre dados no S3 (batch/data lake).
- **DynamoDB**: chave-valor de baixa latência — NÃO é motor de busca full-text (pra isso, OpenSearch).
- Regra: busca textual/relevância e análise de logs com dashboards = **OpenSearch**.

## Amazon AppFlow
- Serviço **totalmente gerenciado, no-code/low-code**, pra **transferir dados com segurança entre apps SaaS** (Salesforce, SAP, Google Analytics, ServiceNow, Zendesk...) **e serviços AWS** (S3, Redshift) — em poucos cliques.
- Fluxos rodam **por agenda, por evento ou sob demanda**; transformação/máscara/filtro de dados no próprio fluxo. **Criptografa em trânsito** e pode usar **PrivateLink** (sem trafegar pela internet pública).
- Caso: puxar dados do Salesforce pro S3/Redshift pra alimentar dashboards/analytics, ou sincronizar entre SaaS.
- Contraste com **Glue**: AppFlow é especializado em **conectores SaaS no-code**; Glue é ETL serverless mais geral (Spark) com Data Catalog.
- Fontes: https://docs.aws.amazon.com/appflow/latest/userguide/what-is-appflow.html · https://aws.amazon.com/appflow/

## Resumo de escolha (prova)
- Busca full-text (catálogo/documentos) e análise de logs com dashboards = **OpenSearch Service**.
- Investigar logs do CloudWatch pontualmente = **CloudWatch Logs Insights**; SQL no data lake = **Athena**.
- Mover dados de um SaaS (Salesforce) pra AWS sem código = **AppFlow**; ETL geral = **Glue**.
