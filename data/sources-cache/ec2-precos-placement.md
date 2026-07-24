# EC2 — Modelos de Preço e Otimização — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Opções de compra do EC2
- **On-Demand**: paga por segundo, **sem compromisso**. Pra carga **imprevisível/curta**, picos, ou benchmark antes de se comprometer. Mais caro por hora.
- **Reserved Instances (RI)**: compromisso com uma **configuração específica** (tipo + região) por **1 ou 3 anos**; desconto de **até ~72%** vs On-Demand. **Standard RI** (maior desconto, menos flexível) vs **Convertible RI** (pode trocar família/tipo, desconto menor). Pode dar **reserva de capacidade** numa AZ.
- **Savings Plans**: compromisso com um **valor em US$/hora** por 1 ou 3 anos; **flexível** quanto à configuração. **Compute Savings Plans** (mais flexível: qualquer região/família, inclui Fargate e Lambda) vs **EC2 Instance Savings Plans** (família específica numa região, desconto maior). Bom quando você consegue se comprometer com GASTO, mas não com instância exata.
- **Spot Instances**: capacidade ociosa com **até 90%** de desconto, mas **pode ser interrompida** (aviso de 2 min). Pra cargas **tolerantes a falha/flexíveis no tempo**: batch, CI/CD, big data, render, processamento sem estado. NÃO pra carga estável crítica que não tolera interrupção.
- **Dedicated Hosts**: servidor físico **dedicado** a você; permite **BYOL** (licenças por socket/core) e atende **compliance**. **Dedicated Instances**: hardware dedicado também, mas menos controle/visibilidade do host físico.
- Regra de prova: imprevisível/curto = On-Demand; estável 1-3 anos com gasto previsível = Savings Plans (ou RI se precisar de instância fixa/reserva de capacidade); interrompível e barato = Spot; licença BYOL/compliance de host físico = Dedicated Hosts.
- Fontes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-purchasing-options.html · https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html

## Placement Groups (estratégias de posicionamento)
- **Cluster**: empacota instâncias **bem juntas numa única AZ** → **baixa latência e alto throughput** de rede entre elas. Pra **HPC** e comunicação nó-a-nó intensa. Risco: se o rack falha, afeta o grupo.
- **Spread**: espalha um **número pequeno** de instâncias em **hardware distinto** (racks separados) → minimiza **falhas correlacionadas**. Pra poucas instâncias **críticas** que não podem cair juntas.
- **Partition**: divide em **partições lógicas**, cada uma com rack/energia/rede próprios; instâncias de partições diferentes não compartilham hardware. Pra **workloads distribuídos grandes e replicados**: **Hadoop, Cassandra, Kafka** — isola o impacto de falha de hardware por partição.
- Mnemônico: Cluster = juntinhos (performance), Spread = separados (poucos críticos), Partition = blocos isolados (big data distribuído).
- Fontes: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html · https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
