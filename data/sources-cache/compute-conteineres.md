# Computação e Contêineres — Aprofundamento — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Tipos de Elastic Load Balancer
- **ALB (Application Load Balancer)**: **camada 7** (HTTP/HTTPS). Roteamento por **conteúdo**: path-based, host-based, headers; SSL termination, redirects, autenticação, WebSocket. Ideal pra **web, microsserviços e contêineres**.
- **NLB (Network Load Balancer)**: **camada 4** (TCP/UDP/TLS). **Altíssimo desempenho, baixa latência**, milhões de req/s, **IP estático/Elastic IP** por AZ. Bom pra gaming, streaming, IoT, e quando precisa de IP fixo ou throughput extremo.
- **GWLB (Gateway Load Balancer)**: opera em **camada 3 (gateway)**. Implanta e escala **appliances virtuais de terceiros** (firewalls, IDS/IPS, inspeção de tráfego) de forma transparente (bump-in-the-wire). Encaminha o tráfego pra os appliances inspecionarem.
- **CLB (Classic)**: geração antiga/legada — evitar em projetos novos.
- Pegadinha: roteamento por path/host HTTP = ALB; IP estático/TCP/UDP ultra-rápido = NLB; inserir appliance de segurança de terceiro = GWLB.
- Fontes: https://aws.amazon.com/elasticloadbalancing/features/ · https://aws.amazon.com/compare/the-difference-between-the-difference-between-application-network-and-gateway-load-balancing/

## Contêineres: ECS vs EKS vs Fargate
- **Amazon ECS**: orquestrador de contêineres **AWS-opinativo e simples** (menos decisões, integra fundo com a AWS). Bom quando você quer rodar contêineres em escala sem a complexidade do Kubernetes.
- **Amazon EKS**: **Kubernetes gerenciado** — flexibilidade, APIs open source e ecossistema da comunidade. Escolha quando você quer/precisa de Kubernetes.
- **AWS Fargate**: **motor de computação SERVERLESS pra contêineres** — funciona **com ECS E com EKS**. Você não gerencia servidor: especifica CPU/memória por task e paga só por isso. Isolamento por design.
- **Launch type EC2** (no ECS/EKS): você gerencia a frota de EC2 (patch, tipo de instância, rede) — mais **controle e customização** (GPU, instâncias específicas), em troca de mais gestão.
- Resumo: ECS vs EKS = qual ORQUESTRADOR (simples AWS vs Kubernetes). EC2 vs Fargate = quem cuida do SERVIDOR (você vs serverless).
- Fontes: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html · https://aws.amazon.com/fargate/faqs/

## EC2 Auto Scaling — políticas (conhecimento estável)
- **Dynamic scaling — Target Tracking**: mantém uma métrica num alvo (ex.: CPU média em 50%); a ASG adiciona/remove instâncias sozinha pra manter o alvo. O mais comum/recomendado.
- **Dynamic — Step / Simple scaling**: reage a alarmes do CloudWatch em degraus (escala X quando a métrica passa de Y).
- **Scheduled scaling**: ajusta a capacidade em horários **previsíveis** (ex.: aumentar toda segunda 8h, reduzir à noite).
- **Predictive scaling**: usa ML pra prever a demanda e provisionar antes.
- Auto Scaling cuida de **disponibilidade e elasticidade** (substitui instância não-saudável, mantém capacidade desejada).

## Fargate vs Lambda (contraste rápido)
- **Lambda**: funções curtas orientadas a evento, execução efêmera, paga por invocação/duração.
- **Fargate**: contêineres de longa duração (apps web, microsserviços, batch), controle fino de CPU/memória, sem servidor pra gerenciar.
