# Implantação, IaC e Performance Global — notas verificadas

Recuperado em 2026-06-25 (Global Accelerator, Elastic Beanstalk).
CloudFormation e X-Ray reaproveitados de notas verificadas em 2026-06-18.
Distilled, foco em prova SAA-C03.

## AWS CloudFormation (cache 2026-06-18)
- IaC declarativa: templates JSON/YAML → "stacks" de recursos reais; repetível, versionável.
- **StackSets**: implanta um template em várias contas E regiões numa operação só; com permissões service-managed + Organizations, contas novas recebem stacks automaticamente.
- **Drift detection**: compara config viva vs. o esperado no template; NÃO cascateia em nested stacks (rode na nested direto).
- **DeletionPolicy**: `Retain` / `Snapshot` (ex.: RDS/EBS) / `Delete` (padrão). Use Retain pra proteger dado stateful de prod.
- Cross-stack: Outputs `Export` + `Fn::ImportValue`. Change sets pré-visualizam mudanças. CloudFormation é grátis; paga só pelos recursos criados.
- Fontes: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html

## AWS X-Ray (cache 2026-06-18)
- Tracing distribuído: segue requisições atravessando componentes; acha gargalos, latência, erros difíceis.
- Modelo: componentes emitem **segments** → X-Ray agrupa numa **trace** → monta um **service map** (nós = serviços, com latência média e taxa de falha).
- Contraste: CloudWatch = métricas/logs/alarmes agregados; CloudTrail = auditoria de API; X-Ray = caminho por-requisição entre serviços.
- Fontes: https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html

## AWS Global Accelerator (verificado 2026-06-25)
- Fornece **2 IPs estáticos anycast** como ponto de entrada fixo; anunciados de várias edge locations ao mesmo tempo → tráfego entra na rede global da AWS na borda mais próxima do usuário e viaja pela backbone da AWS até o endpoint regional.
- Trabalha em **TCP/UDP** (camada de transporte), faz proxy dos pacotes na borda. Bom pra **não-HTTP**: jogos (UDP), IoT (MQTT), VoIP; e pra HTTP que exige **IP estático** ou **failover regional rápido e determinístico**.
- Casos: clientes/dispositivos que não respeitam cache de DNS; allowlist de poucos IPs fixos em firewalls corporativos; APIs expostas a parceiros por IPs fixos.
- **Global Accelerator ≠ CloudFront.** CloudFront = CDN, melhora conteúdo cacheável e dinâmico **HTTP(S)**, serve de cache na borda. Global Accelerator NÃO faz cache; melhora desempenho/disponibilidade de uma gama ampla de apps TCP/UDP roteando pela rede global. Os dois são serviços separados (podem até se complementar).
- Fontes: https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html · https://aws.amazon.com/global-accelerator/faqs/

## AWS Elastic Beanstalk (verificado 2026-06-25)
- PaaS: você sobe só o **código**; a AWS provisiona e gerencia a infra por baixo — EC2, load balancer, auto scaling, monitoramento. Você mantém controle/visibilidade dos recursos (pode customizar).
- Plataformas: linguagens (Go, Java, Node.js, PHP, Python, Ruby, .NET), servidores de aplicação (Tomcat, Passenger, Puma) e **Docker**.
- **Sem custo adicional pelo Beanstalk**: paga só os recursos AWS subjacentes (EC2, S3, etc.).
- Bom pra: quem é novo na AWS ou quer publicar uma aplicação web rápido, sem montar a infra na mão.
- Contraste: EC2 puro = controle máximo e flexibilidade total (você monta tudo). Beanstalk = equilíbrio entre controle e automação (offload do trabalho operacional). Lambda = serverless, sem servidor pra gerenciar nem app web "sempre ligada".
- Fontes: https://aws.amazon.com/elasticbeanstalk/faqs/ · https://docs.aws.amazon.com/decision-guides/latest/lightsail-elastic-beanstalk-ec2/lightsail-elastic-beanstalk-ec2.html
