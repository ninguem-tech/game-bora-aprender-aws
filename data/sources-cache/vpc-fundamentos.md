# VPC — Fundamentos de Rede — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## Blocos básicos
- **VPC**: rede virtual isolada na sua conta, definida por um bloco **CIDR** (ex.: 10.0.0.0/16).
- **Subnet (sub-rede)**: faixa de IPs dentro da VPC, **fica em UMA AZ**. Distribuir sub-redes por AZs dá resiliência.

## Sub-rede pública vs privada (a definição que cai na prova)
- **Pública**: a route table da sub-rede tem uma **rota pra um Internet Gateway** (`0.0.0.0/0 → igw`). Instâncias com IP público conseguem falar com a internet.
- **Privada**: a route table **NÃO tem rota pro IGW**. Mesmo que a instância tenha IP público, sem a rota ela não acessa a internet.
- O que torna a sub-rede pública é a ROTA pro IGW — não um atributo mágico.
- Fontes: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html · https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html

## Route Table (tabela de rotas)
- Conjunto de **rotas**: cada rota tem um **destino** (CIDR/prefix list) e um **alvo** (IGW, NAT gateway, peering, VGW, endpoint...).
- **Longest prefix match**: quando várias rotas casam, vence a **mais específica** (prefixo mais longo). A rota `local` (dentro da VPC) é sempre presente e tem prioridade pro tráfego interno.

## Internet Gateway (IGW)
- Componente que dá **acesso à internet** pras sub-redes públicas; faz **NAT pro IPv4 público** das instâncias. Um IGW por VPC. Precisa da rota na route table pra valer.

## NAT Gateway (reforço)
- Permite que instâncias em sub-rede **privada** acessem a internet **de saída** (updates/APIs) sem ficarem acessíveis de fora. Fica em sub-rede **pública**; a route table da privada manda `0.0.0.0/0 → nat`.

## Bastion host / jump server
- Instância numa sub-rede **pública** usada como **ponte segura** pra administrar instâncias em sub-redes **privadas** (SSH/RDP). O admin acessa o bastion e, dele, alcança os recursos privados — sem expor as instâncias privadas direto à internet.
- (Alternativa moderna sem porta aberta: **SSM Session Manager**, visto na fase de Operações.)
- Fontes: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/vpc-bastion-host.html

## VPC Peering
- Conecta **duas VPCs** pra se comunicarem com IP privado (mesma conta/região, ou cross-account/cross-region).
- **NÃO é transitivo**: se A↔B e A↔C, B NÃO fala com C via A — precisa de peering direto B↔C. (Pra muitas VPCs, use **Transit Gateway** como hub, visto na fase de conectividade.)
- **CIDR não pode se sobrepor**: não dá pra fazer peering se os blocos CIDR das VPCs se sobrepõem.
- Fontes: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
