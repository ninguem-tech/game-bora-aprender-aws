# Route 53 Avançado — notas verificadas

Recuperado em 2026-06-30. Foco SAA-C03. (Complementa a fase de Rede/políticas de roteamento.)

## Alias record vs CNAME
- **Alias record**: registro específico do Route 53 que aponta pra **recursos AWS** (CloudFront, S3 website, ELB, API Gateway, etc.). **Funciona no zone apex** (ex.: `example.com`, sem o www) — onde CNAME NÃO funciona. **Grátis** pra consultas alias a recursos AWS. Deve ter o mesmo tipo do alvo.
- **CNAME**: aponta um nome pra **qualquer domínio** (não só AWS). **NÃO funciona no zone apex** (só em subdomínios, ex.: `www.example.com`). É **cobrado**.
- Regra de prova: apontar o domínio raiz (apex) pra um ELB/CloudFront = **Alias**; redirecionar um subdomínio pra um host externo = **CNAME**.
- Fontes: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html

## Hosted Zones: público vs privado
- **Public hosted zone**: registros DNS **resolvíveis na internet** (domínio público).
- **Private hosted zone**: DNS **só dentro das VPCs associadas**, sem expor os registros (nomes/IPs) à internet. Pra nomes internos de aplicações.
- Fontes: https://aws.amazon.com/route53/faqs/

## Route 53 Resolver (DNS híbrido)
- Resolvedor DNS recursivo da VPC; permite **encaminhar consultas DNS entre AWS e on-premises** (sobre VPN/Direct Connect), sem montar servidores DNS extras.
- **Inbound endpoint**: permite que o **on-premises** (ou outra VPC) consulte o DNS **da AWS** (consultas ENTRANDO na VPC).
- **Outbound endpoint**: permite que a **VPC** consulte o DNS **on-premises** (consultas SAINDO da VPC), via **forwarding rules** por domínio.
- Mnemônico: Inbound = de fora PRA AWS; Outbound = da AWS PRA fora. (Use ≥2 sub-redes em AZs diferentes pra HA.)
- Fontes: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html

## Health Checks
- Monitoram a saúde de endpoints (web server, etc.). Tipos: **endpoint** (checa um recurso), **calculated** (status de outros health checks), e **CloudWatch alarm** (segue o estado de um alarme).
- Integram com **DNS failover** (política failover): redirecionam o tráfego de um recurso não-saudável pra um saudável. Podem disparar alarme do CloudWatch.
- Fontes: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/welcome-health-checks.html

## Registro de domínio
- Route 53 também é **registrador de domínios** (comprar/gerenciar domínios) e DNS autoritativo. Suporta **DNSSEC** pra assinar a zona (proteção contra spoofing/cache poisoning).

## Resumo de escolha (prova)
- Apex apontando pra recurso AWS = **Alias**; subdomínio pra host qualquer = **CNAME**.
- DNS interno só na VPC = **private hosted zone**; DNS público = **public hosted zone**.
- On-premises resolve DNS da AWS = **Resolver inbound endpoint**; VPC resolve DNS on-prem = **Resolver outbound endpoint**.
- Redirecionar de recurso doente pra saudável = **health check + failover**.
