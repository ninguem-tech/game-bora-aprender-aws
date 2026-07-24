# Segurança — Detecção e Proteção — notas verificadas

Recuperado em 2026-06-27. Foco SAA-C03.

## O quarteto de detecção (não confundir)
- **Amazon GuardDuty** = **detecção de AMEAÇAS**. Analisa (com ML) VPC Flow Logs, CloudTrail e DNS logs pra achar atividade maliciosa: recon de atacante, instância/conta/bucket/cluster EKS comprometido, malware. Sem agente, liga e monitora.
- **Amazon Inspector** = **gestão de VULNERABILIDADES**. Escaneia EC2, funções Lambda e imagens de container (ECR) buscando vulnerabilidades de software (CVEs) e exposição de rede não intencional. Contínuo e automatizado.
- **Amazon Macie** = **descoberta de DADOS SENSÍVEIS**. Usa ML/pattern matching pra achar PII/PHI e segredos em buckets **S3**.
- **AWS Security Hub** = **central/correlação**. Agrega e correlaciona achados do GuardDuty, Inspector e Macie, faz checagem de postura/compliance (CSPM) contra padrões (CIS, PCI DSS, AWS FSBP). É o painel único de postura de segurança.
- Mnemônico: GuardDuty = ameaça/comportamento; Inspector = vulnerabilidade/CVE; Macie = dado sensível no S3; Security Hub = junta tudo.
- (Bônus: Amazon Detective investiga/aprofunda a causa raiz dos achados — não confundir com Security Hub, que agrega.)
- Fontes: https://aws.amazon.com/guardduty/faqs/ · https://aws.amazon.com/security-hub/faqs/

## DDoS e camada de aplicação
- **AWS Shield Standard**: **grátis**, automático pra todos. Protege contra DDoS de **infraestrutura (camadas 3 e 4)** — SYN/UDP flood, reflection.
- **AWS Shield Advanced**: **pago** (assinatura). DDoS expandido pra EC2, ELB, CloudFront, Route 53 e Global Accelerator; **mitigação L7 automática**, visibilidade avançada, **Shield Response Team (SRT)** e proteção de custo contra picos por DDoS. Usa o AWS WAF nas proteções de camada de aplicação.
- **AWS WAF**: firewall de aplicação web (**camada 7**). Filtra HTTP(S), bloqueia **SQL injection, XSS**, faz rate limiting e regras por IP/geo. Anexa a **CloudFront, ALB, API Gateway, AppSync**.
- Pegadinha: ataque DDoS volumétrico de rede = Shield; exploração da aplicação web (SQLi/XSS) ou regra HTTP = WAF.
- Fontes: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html · https://aws.amazon.com/shield/faqs/

## Criptografia: KMS vs CloudHSM
- **AWS KMS**: gerenciado, **HSM multi-tenant**, fácil e barato, integrado a quase tudo na AWS. HSMs com certificação **FIPS 140-3 Nível 3**. Padrão pra criptografia na AWS.
- **AWS CloudHSM**: **HSM dedicado single-tenant** sob seu controle exclusivo, **FIPS 140-3 Nível 3**, com interfaces **PKCS#11 / JCE / KSP**. Mais caro e mais gestão. Use só quando a conformidade exige HSM single-tenant validado e controle total das chaves, ou quando precisa dessas interfaces programáticas.
- Regra de prova: precisa de HSM dedicado/single-tenant ou PKCS#11 por compliance = **CloudHSM**; caso geral = **KMS**.
- Fontes: https://aws.amazon.com/kms/faqs/ · https://aws.amazon.com/cloudhsm/faqs/
