# Segurança de Rede, Certificados e Investigação — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## AWS Certificate Manager (ACM)
- Provisiona certificados **SSL/TLS públicos GRÁTIS** e os implanta em serviços integrados: **ELB, CloudFront, API Gateway**.
- **Renovação automática gerenciada** (com validação por DNS) — tenta renovar ~45 dias antes de expirar; o **ARN do certificado permanece o mesmo** na renovação. Elimina a gestão manual de certificados.
- (Pra cert privado interno há o ACM Private CA.) Certificado = identidade/criptografia em trânsito (TLS); NÃO confundir com KMS/CloudHSM, que gerenciam CHAVES de criptografia.
- Fontes: https://aws.amazon.com/certificate-manager/faqs/ · https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html

## AWS Network Firewall
- **Firewall de rede gerenciado, stateful, com IDS/IPS** pra VPC. Filtra o tráfego no **perímetro da VPC** — de/para Internet Gateway, NAT Gateway, VPN ou Direct Connect.
- Inspeciona além de IP/porta (pode filtrar por domínio, protocolo, payload). Mais amplo que SG/NACL (que são L3/L4) e diferente do WAF (que é HTTP de aplicação).

## Network Firewall vs WAF (pegadinha)
- **WAF**: firewall de **aplicação web (camada 7)** — filtra requisições **HTTP/S** (SQLi, XSS), anexado a **CloudFront/ALB/API Gateway**.
- **Network Firewall**: firewall de **rede** no perímetro da **VPC** (todo o tráfego que entra/sai), com IDS/IPS.
- Regra: proteger uma APP web de exploits HTTP = WAF; filtrar o tráfego de rede da VPC inteira = Network Firewall.
- Fontes: https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html

## AWS Firewall Manager
- **Gerencia centralmente** políticas de firewall **entre várias contas e VPCs** (via Organizations): regras de **WAF**, **Shield Advanced**, **Network Firewall** e **security groups**.
- Caso: aplicar e manter uma política de WAF/firewall consistente em toda a organização, com contas novas herdando automaticamente.
- Fontes: https://docs.aws.amazon.com/waf/latest/developerguide/fms-chapter.html

## Amazon Detective
- **Investiga** achados de segurança: coleta logs automaticamente e usa **ML + análise estatística + teoria de grafos** pra montar uma visão ligada dos dados, ajudando a achar a **causa raiz** e o alcance de um incidente.
- Ingere achados de **GuardDuty, Inspector, IAM Access Analyzer, Config, Firewall Manager** etc. e correlaciona.
- **Detective (investigar/causa raiz) ≠ Security Hub (agregar/priorizar) ≠ GuardDuty (detectar ameaça).** Os três se complementam.
- Fontes: https://aws.amazon.com/detective/faqs/

## Secrets Manager (reforço)
- Cofre de segredos com **rotação automática** nativa (via Lambda), replicação entre regiões, integração com bancos. Pra senha de banco, API key, token. (Parameter Store guarda segredo leve sem rotação automática.)

## Resumo de escolha (prova)
- Certificado TLS grátis com auto-renovação = **ACM**.
- Firewall de rede no perímetro da VPC (IDS/IPS) = **Network Firewall**.
- Firewall de app web (SQLi/XSS) = **WAF**.
- Política de firewall central entre contas = **Firewall Manager**.
- Investigar/achar causa raiz de incidente = **Detective**.
- Segredo com rotação automática = **Secrets Manager**.
