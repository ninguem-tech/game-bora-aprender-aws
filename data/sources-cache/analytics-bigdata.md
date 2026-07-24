# Analytics e Big Data — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## Amazon Athena
- **Serverless**: consulta dados no **S3 com SQL (ANSI)** direto, sem carregar/mover dado, sem infra. Pague por **TB escaneado** (~US$5/TB).
- Bom pra **consultas ad-hoc/interativas e exploração** sobre dados em S3 (ex.: logs de web/app pra troubleshooting). Lê estruturado, semi e não-estruturado.
- Usa o **Glue Data Catalog** como metastore (esquema das tabelas).
- Fontes: https://docs.aws.amazon.com/athena/latest/ug/when-should-i-use-ate.html · https://aws.amazon.com/athena/faqs/

## Amazon Redshift
- **Data warehouse** gerenciado, colunar e MPP. Brilha em **consultas complexas com muitos JOINs em tabelas enormes** e relatórios de BI corporativo sobre dados históricos consolidados de várias fontes.
- Dados são carregados/modelados no warehouse (diferente do Athena, que lê o S3 in-place). Opções **provisionada** e **serverless**.
- **Redshift Spectrum**: consulta dados direto no S3 sem carregar.
- Fontes: https://aws.amazon.com/redshift/faqs/

## Amazon EMR (Elastic MapReduce)
- **Cluster gerenciado** pra frameworks distribuídos de big data: **Hadoop, Spark, Presto, Hive**. Roda código/aplicações customizadas, controla compute/memória/storage.
- Use quando precisa de processamento distribuído em larga escala, ML, transformações pesadas, ou portar workloads Hadoop/Spark. Mais controle (e mais gestão) que Athena/Glue.

## AWS Glue
- **ETL serverless** (Apache Spark gerenciado): extrai, transforma e carrega dados pra data lakes/warehouses. Sem servidor pra gerenciar.
- **Glue Data Catalog**: repositório central de metadados (bancos/tabelas: local, esquema, propriedades) — usado por Athena, Redshift Spectrum, EMR.
- **Crawler**: varre os dados (ex.: no S3), classifica, infere o esquema e popula o Data Catalog automaticamente.

## AWS Lake Formation
- Governa, protege e compartilha o **data lake** de forma central. Modelo de **permissões estilo banco de dados** sobre o Glue Data Catalog, com controle **fino: nível de linha, coluna e célula**, por usuário/role.
- Camada de governança/segurança por cima do data lake (S3 + Glue Catalog).

## Amazon QuickSight
- **BI serverless**: dashboards, visualizações, análise ad-hoc, com ML embutido. Conecta a Athena, S3, Redshift, RDS, arquivos (CSV/Excel), bancos on-premises e SaaS.
- Motor **SPICE** (in-memory) acelera consultas; alternativa é direct query.
- **Não é ETL completo** — é a camada de visualização/relatório, não de transformação pesada.
- Fontes: https://docs.aws.amazon.com/whitepapers/latest/big-data-analytics-options/amazon-quicksight.html

## Mnemônico de escolha (prova)
- SQL ad-hoc direto no S3, serverless, sem carregar = **Athena**.
- Data warehouse, JOIN complexo em tabelões, BI corporativo = **Redshift**.
- Hadoop/Spark/Presto, processamento distribuído customizado = **EMR**.
- ETL serverless + catálogo de metadados/esquema = **Glue** (+ Crawler + Data Catalog).
- Governança/permissão fina do data lake = **Lake Formation**.
- Dashboards/visualização pra usuário de negócio = **QuickSight**.
