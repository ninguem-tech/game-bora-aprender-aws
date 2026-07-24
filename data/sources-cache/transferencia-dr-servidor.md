# Transferência Gerenciada e DR de Servidores — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03.

## AWS Transfer Family
- **Transferência de arquivos totalmente gerenciada** sobre protocolos padrão: **SFTP, FTPS, FTP e AS2**, direto pra/de **Amazon S3 ou EFS**.
- Caso: **trocar arquivos com terceiros/parceiros** via SFTP (mantendo as configs de cliente existentes), sem operar servidores SFTP próprios. Endpoint de protocolo gerenciado.
- Fontes: https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html

## Transfer Family vs DataSync (pegadinha)
- **Transfer Family**: endpoint de **protocolo padrão (SFTP/FTPS/FTP/AS2)** pra troca de arquivos (geralmente com parceiros) → S3/EFS.
- **DataSync**: **transferência/migração em massa, automatizada**, entre sistemas de armazenamento (NFS, SMB, Hadoop, object storage, S3, EFS, FSx), com verificação de integridade, retry e controle de banda.
- Regra: precisa expor/consumir **SFTP** pra parceiros = **Transfer Family**; migrar/copiar grandes volumes entre storages = **DataSync**.
- Fontes: https://aws.amazon.com/datasync/faqs/ · https://aws.amazon.com/aws-transfer-family/faqs/

## AWS Elastic Disaster Recovery (AWS DRS)
- **DR de servidores**: **replicação contínua em nível de bloco** de servidores (on-premises, VMware/Hyper-V, outras nuvens) pra uma **área de staging de baixo custo** na AWS. No desastre, **lança as máquinas totalmente provisionadas em minutos**, convertendo-as pra rodar nativamente na AWS.
- **RPO de segundos, RTO de minutos.** Suporta **failback** (voltar pra origem). (Sucessor do CloudEndure DR.)
- O passo de **failover** (redirecionar o tráfego) é feito por você; o DRS cuida da recuperação (lançar instâncias) e do failback.
- Fontes: https://docs.aws.amazon.com/drs/latest/userguide/what-is-drs.html · https://aws.amazon.com/disaster-recovery/faqs/

## DRS vs MGN vs Backup (não confundir)
- **DRS (Elastic Disaster Recovery)**: **DR contínuo** — replica servidores o tempo todo pra failover rápido (RPO seg/RTO min).
- **MGN (Application Migration Service)**: **migração** lift-and-shift de servidores pra EC2 (uma vez, no cutover). Visto na fase de Migração.
- **AWS Backup**: **backup e restauração** de dados (RPO/RTO maiores; exige reimplantar infra na recuperação). Visto na fase de DR.
- Regra: failover rápido de servidores = **DRS**; mudar pra nuvem de vez = **MGN**; cópia de dados pra restaurar = **AWS Backup**.

## Resumo de escolha (prova)
- SFTP/FTPS gerenciado com parceiros → S3/EFS = **Transfer Family**.
- Migração/cópia em massa entre storages = **DataSync**.
- DR contínuo de servidores (RPO seg/RTO min) = **Elastic Disaster Recovery (DRS)**.
- Migração lift-and-shift de servidores = **MGN**; backup de dados = **AWS Backup**.
