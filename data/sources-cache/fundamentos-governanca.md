# Fundamentos e Governança da Conta — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03. (Fase de fundamentos PENDENTE — verificado, mas a leva pivotou pra cenários combinados.)

## AWS Well-Architected Framework — 6 pilares
1. **Excelência operacional** (operational excellence)
2. **Segurança** (security)
3. **Confiabilidade** (reliability)
4. **Eficiência de desempenho** (performance efficiency)
5. **Otimização de custos** (cost optimization)
6. **Sustentabilidade** (sustainability) — adicionado em 2021
- Fontes: https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html

## Modelo de Responsabilidade Compartilhada
- **AWS = segurança DA nuvem** ("security OF the cloud"): hardware, software, rede e instalações que rodam os serviços.
- **Cliente = segurança NA nuvem** ("security IN the cloud"): seus dados, IAM/controle de acesso, criptografia, config de security group, e — em IaaS (EC2) — o SO convidado, patches e a aplicação.
- **Varia por tipo de serviço**: IaaS (EC2) = cliente cuida de mais (SO, firewall, app); serviços abstraídos (S3, DynamoDB) = AWS opera infra/SO, cliente cuida de dados, classificação e permissões IAM.
- Fontes: https://aws.amazon.com/compliance/shared-responsibility-model/

## Consolidated Billing (AWS Organizations)
- Uma fatura pra várias contas; **management account paga**. **Sem custo adicional**.
- Combina o uso de todas as contas → compartilha **descontos por volume, Reserved Instances e Savings Plans** → conta final menor que contas isoladas.
- **Consolidated billing** (só fatura única) vs **All features** (padrão recomendado: inclui SCPs e demais recursos de governança).
- Fontes: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html

## Planos de Suporte — ATENÇÃO (muito voláteis em 2026, EVITAR no banco por ora)
- **Basic**: grátis (conta, billing, aumento de cota, docs, fóruns).
- **MUDANÇA 2026/2027**: Developer e Business **serão descontinuados em 1/jan/2027**, substituídos por **Business Support+** (resposta ~30 min, IA-assistida, ~US$29/mês mín.). **Enterprise On-Ramp** também será descontinuado (migra pra Enterprise). **Enterprise Support**: TAM dedicado, resposta de 15 min pra casos críticos.
- **Recomendação pro app**: NÃO criar questões detalhadas de plano de suporte agora — os tiers estão mudando e datam rápido. Reavaliar depois de jan/2027.
- Fontes: https://docs.aws.amazon.com/awssupport/latest/user/aws-support-plans.html · https://docs.aws.amazon.com/awssupport/latest/user/support-plans-eos.html

## Regiões / AZs / Edge (estável)
- **Região**: área geográfica isolada (ex.: sa-east-1 São Paulo). **AZ**: um ou mais data centers isolados dentro da região (resiliência local). **Edge locations / PoPs**: pontos do CloudFront/Global Accelerator perto do usuário. **Local Zones**: estendem a região pra perto de grandes centros urbanos (baixa latência).
