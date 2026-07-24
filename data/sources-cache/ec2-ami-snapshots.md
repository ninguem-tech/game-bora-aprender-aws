# EC2 — AMI, Snapshots e Recursos — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03.

## AMI (Amazon Machine Image)
- **Imagem/molde** pra lançar uma instância EC2: contém o **SO + software** pré-configurado e o **block device mapping**. Pode ser da AWS, pública, compartilhada, do Marketplace, ou **sua própria** (golden image).
- **Golden image**: pré-configurar uma AMI com tudo instalado → lançar instâncias idênticas e rápidas (consistência, menos user data).
- **É específica da região**: pra lançar a MESMA config em outra região, **copie a AMI** pra lá.
- Fontes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html

## EBS Snapshots
- **Backup point-in-time** de um volume EBS, guardado no **S3** (gerenciado). **Incremental**: só os blocos ALTERADOS desde o último snapshot são salvos (economia).
- **Cópia cross-Region e cross-account**: pra DR/isolamento (copiar snapshot pra outra região/conta e re-criptografar com outra chave). NOTA: copiar pra nova região ou re-criptografar com nova chave KMS gera **cópia completa** (não incremental).
- Podem ser **criptografados** (KMS). **Data Lifecycle Manager (DLM)** automatiza criação/retenção/cópia de snapshots e AMIs.
- Fontes: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html

## Famílias de instância EC2
- **General purpose** (ex.: M, T): equilíbrio compute/memória/rede — web servers, apps de propósito geral.
- **Compute optimized** (ex.: C): CPU alta — batch, media transcoding, game servers, HPC compute-bound.
- **Memory optimized** (ex.: R, X): muita RAM — bancos in-memory, análise de grandes datasets em memória, apps enterprise (SAP).
- **Storage optimized** (ex.: I, D): alto I/O sequencial/aleatório em storage local — big data, data warehouse, NoSQL de alto IOPS.
- **Accelerated computing** (ex.: P, G, Inf): **GPU/FPGA/aceleradores** — ML/treino, inferência, gráficos, HPC.
- Regra: escolha a família pela dimensão que o workload mais consome (CPU, memória, storage, GPU).
- Fontes: https://aws.amazon.com/ec2/instance-types/

## Elastic IP (EIP)
- **IPv4 público ESTÁTICO** alocado à sua conta até você liberar. Pode ser **remapeado rapidamente pra outra instância** pra mascarar a falha de uma instância/software. (Cobrado quando ocioso/não associado.)
- Fontes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html

## User data / Instance metadata
- **User data**: script/comandos executados no **lançamento** da instância (bootstrap: instalar pacotes, configurar). Limite **16 KB** (raw). 
- **Instance metadata (IMDS)**: dados sobre a própria instância (ID, IP, IAM role, etc.) acessíveis de dentro dela.
- Fontes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html

## Resumo de escolha (prova)
- Molde pra lançar instância idêntica = **AMI** (copie pra outra região se precisar lá).
- Backup incremental de volume, cópia cross-region pra DR = **EBS snapshot**.
- Família por dimensão dominante: CPU=**Compute**, RAM=**Memory**, IOPS local=**Storage**, GPU=**Accelerated**, equilíbrio=**General purpose**.
- IP público fixo que remapeia na falha = **Elastic IP**. Bootstrap no boot = **user data**.
