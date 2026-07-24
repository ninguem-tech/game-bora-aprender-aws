# Computação — Opções Adicionais e Híbridas — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## Compute simplificado / gerenciado
- **Amazon Lightsail**: **VPS pré-configurado** com bundles (instância + opções de storage/DB/rede) e **preço mensal fixo e previsível**. Pra **projetos simples**: sites, blogs, apps pequenos, estudantes/hobbyistas — quando você NÃO precisa da escala/complexidade do EC2.
- **AWS App Runner**: serviço **totalmente gerenciado** pra **aplicações web e APIs em contêiner**. Você entrega a imagem (ou o código-fonte) e ele **builda, implanta, escala e balanceia** automaticamente. Pra apps web request-response sem gerenciar infra (mais simples que montar ECS/Fargate na mão).
- **AWS Batch**: serviço gerenciado pra **computação em lote (batch)** em larga escala — roda centenas de milhares de jobs, **provisiona dinamicamente** o tipo/quantidade ideal de compute (CPU/memória otimizado) conforme os jobs. Pra processamento batch/HPC, simulações, ETL pesado.
- Fontes: https://aws.amazon.com/lightsail/faq/ · https://aws.amazon.com/apprunner/faqs/ · https://docs.aws.amazon.com/whitepapers/latest/aws-overview/compute-services.html

## Híbrido / Edge (latência e residência de dados)
- **AWS Outposts**: **racks de hardware da AWS instalados NO SEU data center** (ou colocation). Roda compute/storage da AWS **on-premises**, conectado de forma transparente aos serviços na nuvem. Pra workloads que **precisam ficar on-premises** (residência de dados, baixa latência local) mas integrados à AWS. Você instala no seu DC; a AWS gerencia o hardware.
- **AWS Local Zones**: infraestrutura **da AWS** (AWS é dona/opera) que estende uma região pra **perto de grandes centros urbanos**, com latência de poucos ms. Pra renderização de vídeo, gaming, virtual desktops. **Multi-acesso** (5G OU Wi-Fi, qualquer operadora).
- **AWS Wavelength**: compute/storage da AWS **DENTRO da rede 5G das operadoras de telecom**. Latência de 1 dígito de ms pra usuários **5G**. Pra game streaming, AR/VR, veículos autônomos, IoT. **Acessível só pela rede 5G** da operadora parceira.
- Diferença-chave:
  - **Outposts** = no SEU data center (on-premises).
  - **Local Zones** = infra da AWS perto da cidade, acesso por qualquer rede (5G/Wi-Fi).
  - **Wavelength** = dentro da rede 5G da operadora, acesso só via 5G.
- Fontes: https://aws.amazon.com/about-aws/global-infrastructure/localzones/faqs/ · https://aws.amazon.com/wavelength/faqs/ · https://aws.amazon.com/blogs/compute/aws-local-zones-and-aws-outposts-choosing-the-right-technology-for-your-edge-workload/

## Regra de escolha (prova)
- Site/app simples, preço fixo = **Lightsail**.
- App web/API em contêiner totalmente gerenciada = **App Runner**.
- Jobs em lote em larga escala = **Batch**.
- AWS no SEU data center (on-premises) = **Outposts**.
- Baixa latência perto da cidade, qualquer rede = **Local Zones**.
- Baixa latência pra usuários 5G, dentro da operadora = **Wavelength**.
