# Migração e Transferência — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## AWS DMS (Database Migration Service)
- Migra bancos pra AWS com **mínimo downtime** — a fonte continua operacional durante a migração. Suporta replicação contínua (CDC).
- **Homogênea** (mesmo engine: Oracle→RDS Oracle, MySQL→Aurora MySQL): esquema já compatível → migração em um passo.
- **Heterogênea** (engines diferentes: Oracle→PostgreSQL, SQL Server→MySQL): **dois passos** → (1) converter o esquema/código com **AWS SCT** (Schema Conversion Tool) ou **DMS Schema Conversion**; (2) migrar os dados com o DMS.
- **SCT / DMS Schema Conversion**: converte esquema e a maioria dos objetos de código (views, procedures, functions, tipos); o que não dá pra converter automaticamente é marcado pra ajuste manual.
- Fontes: https://aws.amazon.com/dms/faqs/ · https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html

## AWS DataSync (transferência ONLINE)
- Transfere **arquivos/objetos** pra serviços de armazenamento AWS (S3, EFS, FSx) pela rede, gerenciado. **Incremental** (só o que mudou), comprime, agenda e se recupera de queda de rede.
- É a **primeira escolha** quando HÁ banda/conectividade disponível. Também migra entre regiões/contas.
- Fontes: https://aws.amazon.com/datasync/

## AWS Snow Family / Snowball Edge (transferência OFFLINE)
- Dispositivo físico pra transportar **terabytes a petabytes** quando **falta banda/conectividade** (internet lenta, cara ou inexistente). Também faz edge computing.
- Regra de prova: sem banda / volume enorme / prazo curto = **Snowball (offline)**. Com banda = **DataSync (online)**.
- **NOTA de versão (7/nov/2025)**: Snowball Edge passou a ser disponível **só pra clientes existentes**; novos clientes são direcionados a DataSync, **AWS Data Transfer Terminal** (transferência física segura) ou parceiros. O CONCEITO (offline pra alto volume sem banda) ainda cai na prova.
- Fontes: https://aws.amazon.com/snowball/faqs/ · https://aws.amazon.com/blogs/storage/aws-snow-device-updates/

## AWS Storage Gateway (acesso HÍBRIDO contínuo)
- Appliance on-premises que conecta apps locais ao armazenamento na nuvem, com **cache local de baixa latência**. Manda só o dado alterado, comprimido.
- Quatro tipos: **S3 File Gateway** (NFS/SMB → S3), **FSx File Gateway** (acesso a FSx for Windows), **Volume Gateway** (volumes em bloco iSCSI, backup na nuvem) e **Tape Gateway** (substitui fita física por backup virtual em S3/Glacier — VTL).
- Casos: levar backups/arquivos pra nuvem, reduzir storage local com file share na nuvem, dar acesso de baixa latência a dados na AWS. É CONTÍNUO/híbrido — diferente de DMS/DataSync/Snow, que são de migração pontual.
- Fontes: https://docs.aws.amazon.com/storagegateway/latest/userguide/WhatIsStorageGateway.html

## AWS Application Migration Service (MGN)
- **Lift-and-shift / rehost**: replica servidores on-premises (ou de outra nuvem) em **nível de bloco** e os converte pra rodar nativamente em **EC2**, com mínimo downtime no cutover.
- É o sucessor do antigo Server Migration Service (SMS). Use pra migrar servidores inteiros "como estão" rapidamente.
- Contraste: DMS migra BANCOS; MGN migra SERVIDORES (a VM inteira).
