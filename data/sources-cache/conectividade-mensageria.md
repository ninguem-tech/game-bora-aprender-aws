# Conectividade Híbrida e Mensageria — notas verificadas

Recuperado em 2026-06-25. Foco SAA-C03.

## AWS Direct Connect (DX)
- Conexão de rede **dedicada e privada** do data center on-premises pra AWS (não passa pela internet pública). Baixa latência, banda consistente, throughput previsível.
- Mais cara e demora pra provisionar (link físico). Usada pra workloads grandes/sensíveis a latência, transferência alta e constante.
- **NÃO é criptografada por padrão** (é privada, mas não IPsec); pra criptografia pode-se rodar VPN por cima.

## AWS Site-to-Site VPN
- Túnel **IPsec criptografado** entre on-premises e a VPC (Virtual Private Gateway ou Transit Gateway), **sobre a internet pública**. Rápido e barato de subir.
- Latência/banda variam com a internet. Dois túneis por conexão pra redundância.

## DX + VPN (padrão clássico de prova)
- **DX como primário + Site-to-Site VPN como backup/failover.** Se o DX cair, o tráfego falha pra VPN automaticamente (via BGP). Combina a baixa latência/banda do DX com o failover barato da VPN. DX é sempre preferido quando ativo.
- Fontes: https://aws.amazon.com/directconnect/faqs/ · https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-direct-connect-site-to-site-vpn.html

## AWS Transit Gateway (TGW)
- **Hub central** que conecta muitas VPCs e redes on-premises (via VPN/DX) numa topologia hub-and-spoke, no lugar de uma malha de VPC peering ponto-a-ponto (que não escala). Roteamento centralizado entre milhares de VPCs/contas.

## Amazon Kinesis Data Streams (KDS)
- Streaming em **tempo real**, ordenado por shard, com **replay** (retém os dados; consumidores leem por PULL). Consumidores fazem processamento on-demand (Lambda, EC2, KCL).
- Use quando precisa de processamento customizado/tempo real, múltiplos consumidores, replay, ordenação.

## Amazon Data Firehose (ANTIGO Kinesis Data Firehose — renomeado fev/2024)
- **Entrega** streaming, totalmente gerenciado, **sem código**. Faz PUSH dos dados pra destinos: **S3, Redshift, OpenSearch, Splunk** etc. Faz buffer (por tamanho/tempo), pode transformar/comprimir/criptografar. Near-real-time (não é instantâneo por causa do buffer).
- Escala sozinho, sem administração. Pode ler de um Kinesis Data Stream existente e entregar no destino.
- Regra de prova: "entregar stream direto no S3/Redshift sem escrever código" = **Data Firehose**. "Processar em tempo real com replay/consumidores próprios" = **Data Streams**.
- Fontes: https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html · https://aws.amazon.com/about-aws/whats-new/2024/02/amazon-data-firehose-formerly-kinesis-data-firehose/

## SNS fan-out (com SQS)
- Padrão **fan-out**: um tópico SNS publica pra várias filas SQS (e outros) inscritas. Um evento → muitos consumidores desacoplados, cada um processando no seu ritmo. SNS = push pub/sub; SQS = fila pull desacoplada.

## Amazon Cognito
- **User Pool = AUTENTICAÇÃO**: diretório de usuários, sign-up/sign-in, emite tokens JWT (OAuth 2.0). Federa com Google/Apple/Facebook, OIDC, SAML. Responde "QUEM é o usuário".
- **Identity Pool = AUTORIZAÇÃO**: troca o token por **credenciais AWS temporárias** (via IAM roles) pra acessar serviços AWS (S3, DynamoDB). Suporta usuário anônimo/guest. Responde "O QUE o usuário pode acessar na AWS".
- Podem ser usados juntos (login no user pool → troca no identity pool por credencial AWS) ou separados.
- Fontes: https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html
