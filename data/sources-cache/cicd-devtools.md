# CI/CD e Ferramentas de Desenvolvedor — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## A suíte "Code*" (pipeline de CI/CD)
- **AWS CodeCommit**: **repositório Git gerenciado** (privado). Fonte do código. NOTA de versão: foi de-emphasized em jul/2024 (fechou pra novos clientes), mas **VOLTOU à disponibilidade geral em nov/2025** — novos cadastros abertos de novo.
- **AWS CodeBuild**: serviço de **build gerenciado** — compila, testa e empacota o código **sem servidores de build próprios**; escala a capacidade automaticamente.
- **AWS CodeDeploy**: **automatiza a implantação (deploy)** em EC2, on-premises, **Lambda** e **ECS**. Suporta estratégias: **in-place** (atualiza as instâncias existentes), **blue/green** (sobe ambiente novo e troca o tráfego — rollback fácil), além de **canary/linear** pra Lambda/ECS.
- **AWS CodePipeline**: **orquestra** o fluxo de CI/CD de ponta a ponta — modela **estágios** (source → build → test → deploy), cada um com ações. Puxa fonte de CodeCommit/GitHub/S3/ECR, builda com CodeBuild, implanta com CodeDeploy/Beanstalk/ECS/Fargate.
- Como se encaixam: CodeCommit (código) → CodePipeline (orquestra) → CodeBuild (build/test) → CodeDeploy (deploy).
- Fontes: https://aws.amazon.com/codepipeline/ · https://docs.aws.amazon.com/codebuild/latest/userguide/ · https://aws.amazon.com/blogs/devops/aws-codecommit-returns-to-general-availability/

## Infraestrutura como Código (IaC): CloudFormation vs SAM vs CDK
- **AWS CloudFormation**: IaC **declarativa nativa** em **JSON/YAML** (templates → stacks). Base de tudo. (Visto na fase de Implantação/IaC.)
- **AWS SAM (Serverless Application Model)**: framework IaC **focado em serverless** — sintaxe declarativa compacta (JSON/YAML), atalho do CloudFormation pra Lambda/API Gateway/DynamoDB. **SAM CLI** testa funções localmente antes do deploy.
- **AWS CDK (Cloud Development Kit)**: define a infra em **linguagens de programação** (TypeScript, Python, Java, C#); ao rodar, **compila pra templates CloudFormation**. Pra quem prefere código a YAML, com ampla cobertura de serviços.
- Regra: declarativo YAML/JSON geral = CloudFormation; serverless declarativo compacto = SAM; infra em linguagem de programação = CDK (gera CloudFormation por baixo).
- Fontes: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html · https://aws.amazon.com/cdk/faqs/

## Resumo de escolha (prova)
- Repositório Git gerenciado = **CodeCommit**.
- Build/test sem servidor = **CodeBuild**.
- Automatizar deploy (EC2/Lambda/ECS), blue/green = **CodeDeploy**.
- Orquestrar o pipeline inteiro = **CodePipeline**.
- IaC: YAML declarativo = **CloudFormation**; serverless = **SAM**; linguagem de programação = **CDK**.
