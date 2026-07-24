# Rede — Aprofundamento — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## Route 53 — políticas de roteamento
- **Simple**: um único recurso; padrão. Sem health check no roteamento.
- **Weighted (ponderado)**: distribui tráfego por proporções/percentuais que você define. Bom pra **balanceamento, testes A/B e canary** (mandar 5% pra versão nova).
- **Latency (latência)**: recursos em várias regiões → manda o usuário pra região de **menor latência**.
- **Failover (ativo-passivo)**: manda pro recurso primário se ele estiver **saudável** (health check); se cair, vai pro secundário.
- **Geolocation (geolocalização)**: roteia pela **localização do USUÁRIO** (continente/país) — ex.: conteúdo/idioma por país, conformidade.
- **Geoproximity**: roteia pela **localização do RECURSO**, com **bias** opcional pra expandir/encolher a área e deslocar tráfego de uma região pra outra.
- **Multivalue answer**: responde com até **8 registros saudáveis aleatórios**, com health check — melhora disponibilidade/distribuição. NÃO substitui um load balancer.
- Pegadinha: geolocation = onde está o USUÁRIO; geoproximity = onde está o RECURSO (+ bias).
- Fontes: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html

## VPC Endpoints — Gateway vs Interface
- **Gateway Endpoint**: só pra **S3 e DynamoDB**. **Grátis**. Usa **prefix list** na route table pra rotear o tráfego de forma privada (sem internet/NAT). NÃO usa PrivateLink. NÃO é acessível de on-premises, de VPC peered em outra região, nem via Transit Gateway.
- **Interface Endpoint (AWS PrivateLink)**: cria uma **ENI com IP privado** na sua sub-rede; serve a uma **lista crescente de serviços AWS** (e serviços de terceiros/próprios). **Tem custo** (por hora + dado processado). **Acessível de on-premises** (VPN/Direct Connect) e de **VPC peered**.
- Regra de prova: acesso privado a S3/DynamoDB sem custo = **Gateway**. Acesso privado a outros serviços, ou de on-premises/peered = **Interface (PrivateLink)**.
- Fontes: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html · https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html

## Security Group vs Network ACL (NACL)
- **Security Group**: **stateful**, nível de **instância (ENI)**. Só regras de **allow** (deny implícito). Tráfego de resposta é **liberado automaticamente** (não precisa regra de volta).
- **NACL**: **stateless**, nível de **sub-rede**. Tem regras de **allow E deny**, avaliadas por número (ordem). Precisa definir regras **inbound E outbound separadamente** (a resposta é sujeita às regras). Bom pra **bloquear explicitamente** um IP/range (o SG não consegue negar).
- Pegadinha: SG não tem regra de DENY; pra bloquear um IP específico, é NACL.
- Fontes: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html · https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html

## NAT Gateway
- Permite que instâncias em **sub-rede privada** acessem a internet **de saída** (updates, APIs externas) **sem** ficarem acessíveis de fora (inbound). Gerenciado, fica em sub-rede pública, precisa de rota.
- Alternativa antiga: NAT instance (EC2 autogerenciada). NAT Gateway é gerenciado, escalável e mais recomendado.

## VPC Flow Logs
- Captura metadados do tráfego IP (origem/destino, portas, aceito/rejeitado) das ENIs/sub-redes/VPC → CloudWatch Logs ou S3. Pra monitorar, auditar e troubleshooting de conectividade/segurança. Não captura o conteúdo (payload).
