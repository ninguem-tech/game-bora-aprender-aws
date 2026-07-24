# Resiliência e Recuperação de Desastres (DR) — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## RTO e RPO (base do assunto)
- **RTO (Recovery Time Objective)**: quanto tempo o sistema pode ficar FORA até voltar. "Em quanto tempo eu recupero."
- **RPO (Recovery Point Objective)**: quanto DADO posso perder, medido em tempo. "Até que ponto no passado eu recupero." RPO depende da frequência de backup/replicação.
- Menor RTO/RPO = melhor, porém mais caro/complexo.

## As 4 estratégias de DR (whitepaper AWS) — ordem CRESCENTE de custo/complexidade e DECRESCENTE de RTO/RPO
1. **Backup & Restore**: mais simples e barato. Faz backups e restaura na região de recuperação quando precisa. **Maior RTO/RPO (horas).** RPO = frequência do backup.
2. **Pilot Light**: cópia do núcleo (core) da infra ligada na região de DR — **dados replicados** continuamente, mas servidores de aplicação DESLIGADOS (criados/ligados na hora). RPO em minutos, RTO em dezenas de minutos.
3. **Warm Standby**: versão **reduzida mas totalmente funcional** já RODANDO na região de DR. Aguenta tráfego reduzido na hora; recuperação = escalar (scale up). RTO menor que pilot light.
4. **Multi-site Active/Active (multi-Region)**: workload implantado e SERVINDO tráfego em várias regiões ao mesmo tempo. **RPO perto de zero, RTO perto de zero.** Mais caro e complexo.
- Mnemônico: Backup&Restore (apagado) → Pilot Light (chama-piloto: dados ligados, app desligado) → Warm Standby (morno: rodando pequeno) → Active/Active (quente: tudo rodando nos dois).
- Fontes: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html · https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-i-strategies-for-recovery-in-the-cloud/

## AWS Backup
- Serviço **centralizado e gerenciado, baseado em política**, pra automatizar backup entre vários serviços AWS (e on-premises). Agenda, retenção, monitoramento central.
- Suporta: EC2, EBS, RDS, Aurora, DynamoDB, EFS, S3, EKS, Storage Gateway, FSx, VMware, entre outros.
- **Backup Vault**: cofre que isola os backups da fonte. **Vault Lock** = WORM (write-once-read-many), protege contra exclusão/alteração (compliance).
- **Cross-Region** e **cross-account** (via Organizations, com conta de backup delegada): copia backups pra outra região/conta — continuidade de negócio e compliance (distância mínima da produção).
- Criptografia integrada com KMS; Backup Audit Manager pra auditoria/compliance.
- Fontes: https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html · https://aws.amazon.com/backup/faqs/

## Blocos de resiliência relacionados (já cobertos em outras fases, aqui pra contraste)
- **Multi-AZ** (ex.: RDS Multi-AZ, ELB entre AZs): alta disponibilidade DENTRO de uma região (falha de AZ). NÃO é DR de região.
- **Multi-Region** (read replica cross-region, S3 CRR, Aurora Global Database): proteção contra falha de REGIÃO inteira → entra no território de DR.
- **Route 53 health checks + failover routing**: redireciona DNS pra região/endpoint saudável quando o primário cai — peça-chave de pilot light/warm standby/active-active.
