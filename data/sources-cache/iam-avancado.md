# IAM e Identidade — Aprofundamento — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## User vs Role
- **IAM User**: identidade permanente com **credenciais de longa duração** (senha, access keys). Pra uma pessoa/app específico. Access key fixa = risco se vazar.
- **IAM Role**: identidade **assumível**, entrega **credenciais TEMPORÁRIAS** (via STS), sem chave de longa duração. Assumida por: usuários, **serviços AWS** (EC2 via instance profile, Lambda), contas externas, ou usuários federados.
- **Role pra EC2/Lambda (instance profile)**: o serviço recebe credenciais temporárias automaticamente — **nunca embuta access key no código/instância**. Boa prática nº 1.

## STS / AssumeRole
- **STS AssumeRole** retorna credenciais temporárias (access key + secret + **session token**). Usado pra **acesso cross-account** e pra serviços/federados assumirem um papel.
- Permissões da sessão = **interseção** da policy do role com policies de sessão (não dá pra ganhar mais que a policy do role permite).
- Variações: `AssumeRoleWithSAML` (federação SAML), `AssumeRoleWithWebIdentity` (OIDC/Cognito/Google).

## Identity-based vs Resource-based policy
- **Identity-based**: anexada a user/group/role — diz **o que aquela identidade pode fazer**.
- **Resource-based**: anexada ao **recurso** (ex.: **S3 bucket policy**, **trust policy do role**, política de fila SQS) — diz **QUEM (qual principal) pode acessar** o recurso. Útil pra **cross-account** (o recurso libera um principal de outra conta).
- A **trust policy** do role é uma resource-based policy: define quem pode assumir o role.

## Permissions Boundary vs SCP
- **Permissions boundary**: managed policy que define o **MÁXIMO** de permissões que a policy de identidade pode conceder a UM user/role. Efetivo = **interseção** (boundary ∩ identity policy). Usado pra **delegar com segurança** a criação de roles/policies a devs (eles não conseguem escalar além do teto).
- **SCP (Organizations)**: teto pra a **conta inteira** (todos os principals). Veja [[pseudonym-identity-policy]]? não — ver fase de governança.
- Se houver boundary + SCP + identity policy, **TODOS** precisam permitir (allow) pra ação valer (e qualquer deny explícito vence).
- Diferença: SCP restringe a conta toda numa policy só; boundary restringe um principal específico.
- Fontes: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html · https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html

## IAM Identity Center vs Federação SAML
- **IAM Identity Center** (sucessor do AWS SSO): **SSO central pra múltiplas contas AWS** e apps, com MFA, **permission sets**, e conexão a um IdP externo (SAML 2.0/SCIM) OU diretório próprio. Recomendado como serviço primário de acesso da força de trabalho.
- **Federação IAM (SAML 2.0)**: confiança entre o IdP corporativo e a AWS; usuários federados assumem role via `AssumeRoleWithSAML` — sem criar IAM Users. Use quando o Identity Center não couber.
- Regra: muitas contas + SSO central pra funcionários = IAM Identity Center; integrar um diretório corporativo existente direto na IAM = federação SAML.
- Fontes: https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html · https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_saml.html

## Boas práticas rápidas
- **MFA** em todas as contas privilegiadas; proteger e **não usar a conta root** no dia a dia.
- Princípio do **menor privilégio**; preferir roles a access keys; rotacionar credenciais.
