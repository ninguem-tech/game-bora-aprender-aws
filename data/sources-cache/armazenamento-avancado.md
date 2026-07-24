# Armazenamento — Aprofundamento — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Classes de armazenamento do S3
- **S3 Standard**: acesso frequente, latência de ms, 11 noves de durabilidade, multi-AZ. Padrão.
- **S3 Standard-IA (Infrequent Access)**: dado acessado raramente, mas com acesso em ms quando precisa. Storage mais barato + **taxa de recuperação**. Multi-AZ.
- **S3 One Zone-IA**: igual ao Standard-IA, mas guarda em **uma única AZ** (~20% mais barato). 11 noves, porém **perde o dado se a AZ for destruída**. Bom pra dado recriável/secundário.
- **S3 Intelligent-Tiering**: move o objeto automaticamente entre tiers conforme o acesso, **sem taxa de recuperação** (só uma pequena taxa de monitoramento). Ideal pra **padrão de acesso desconhecido/variável**.
- **S3 Glacier Instant Retrieval**: arquivo que precisa de acesso **imediato em ms** (ex.: imagens médicas, mídia) com custo de archive baixo.
- **S3 Glacier Flexible Retrieval**: arquivo sem acesso imediato; recuperação em **minutos** ou **bulk grátis em 5–12h**. Backup/DR.
- **S3 Glacier Deep Archive**: **mais barato de todos**; recuperação em **12–48h**. Compliance/retenção longa.
- **Lifecycle policy**: regras que **transicionam** objetos entre classes (ex.: Standard → IA aos 30 dias → Glacier aos 90) ou **expiram** (apagam) automaticamente — economia sem trabalho manual.
- Fontes: https://aws.amazon.com/s3/storage-classes/ · https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html

## Tipos de volume EBS
- **gp3 (General Purpose SSD)**: baseline **3.000 IOPS + 125 MiB/s independente do tamanho**; IOPS e throughput configuráveis separadamente; ~20% mais barato que gp2. **Padrão recomendado** pra maioria.
- **gp2 (General Purpose SSD)**: IOPS escalam com o tamanho (3 IOPS/GB). Geração anterior.
- **io1 / io2 (Provisioned IOPS SSD)**: alto desempenho, IOPS provisionados; **io2 Block Express** pra apps críticos (99,999% durabilidade, latência sub-ms). Pra **bancos com IOPS altos/consistentes**.
- **st1 (Throughput Optimized HDD)**: otimizado pra **throughput** (MB/s), dado acessado com frequência e sequencial: big data, log processing, data warehouse, ETL. Não pode ser volume de boot.
- **sc1 (Cold HDD)**: **menor custo por GB**; dado frio, acessado raramente.
- Regra: SSD (gp3/io2) pra IOPS/baixa latência; HDD (st1/sc1) pra throughput/custo em grandes volumes sequenciais.
- Fontes: https://aws.amazon.com/ebs/volume-types/

## Instance Store (efêmero) vs EBS (persistente)
- **Instance Store**: disco físico anexado ao host, altíssimo IOPS, **EFÊMERO** — perde os dados ao parar/terminar a instância. Bom pra cache, scratch, buffer temporário.
- **EBS**: bloco persistente em rede, sobrevive ao stop/terminate (se não marcado pra deletar), snapshots no S3.

## Arquivos: EFS vs FSx
- **Amazon EFS**: file system **NFS pra Linux**, elástico, **regional (multi-AZ)**, compartilhado por muitos EC2 ao mesmo tempo. Cresce/encolhe sozinho.
- **Amazon FSx**: file systems gerenciados específicos — **FSx for Windows File Server** (SMB, apps Windows/Active Directory), **FSx for Lustre** (HPC/ML, alto throughput), **NetApp ONTAP** e **OpenZFS**.
- Regra: Linux compartilhado = EFS; Windows/SMB = FSx for Windows; HPC/ML de alta performance = FSx for Lustre.
- Fontes: https://aws.amazon.com/fsx/when-to-choose-fsx/ · https://aws.amazon.com/efs/
