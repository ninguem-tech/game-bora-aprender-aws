# Diretório e Computação de Usuário Final — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03.

## AWS Directory Service (3 opções)
- **AWS Managed Microsoft AD**: um **Active Directory real da Microsoft**, gerenciado pela AWS (mín. 2 domain controllers em AZs diferentes). Pra **AD completo**: >5.000 usuários, **relação de confiança (trust)** com o AD on-premises, e workloads Windows (RDS for SQL Server com auth Windows, FSx for Windows, join de EC2 Windows, WorkSpaces). **Suporta trusts.**
- **AD Connector**: **gateway/proxy** que encaminha as autenticações pro seu **AD on-premises existente**, **sem cachear dados na nuvem**. Use quando quer aproveitar o diretório on-premises com serviços AWS (ex.: join de EC2, login no console) sem criar um diretório novo.
- **Simple AD**: diretório gerenciado baseado em **Samba 4**, **baixo custo/escala**, subconjunto do AD, **≤5.000 usuários**. Suporta contas/grupos, join de EC2 (Linux/Windows), Kerberos SSO, Group Policies. **NÃO suporta relação de confiança (trust).**
- Regra: AD real/grande/trust = **Managed Microsoft AD**; usar AD on-prem existente = **AD Connector**; pequeno/barato/sem trust = **Simple AD**.
- Fontes: https://docs.aws.amazon.com/directoryservice/latest/admin-guide/what_is.html · https://aws.amazon.com/directoryservice/faqs/

## Amazon WorkSpaces
- **Desktops virtuais (VDI) persistentes e gerenciados** na nuvem — Windows ou Linux. Pra trabalhadores remotos que precisam de uma **área de trabalho completa, sempre disponível**, acessível de qualquer lugar. Preço mensal ou por hora.

## Amazon AppStream 2.0
- **Streaming de APLICAÇÕES** (não o desktop inteiro): entrega aplicativos individuais aos usuários via navegador, tipicamente **não-persistente**. Pra "SaaS-ificar" um app desktop sem reescrever código, dar acesso a apps pra estudantes em qualquer computador, demos/treinamentos/trials. Pay-as-you-go.
- NOTA de versão: AppStream 2.0 foi renomeado/agrupado como **"Amazon WorkSpaces Applications"** — mas a prova ainda costuma chamar de AppStream 2.0.
- Fontes: https://docs.aws.amazon.com/appstream2/latest/developerguide/what-is-appstream.html · https://aws.amazon.com/workspaces/applications/

## WorkSpaces vs AppStream (pegadinha)
- **WorkSpaces** = o **DESKTOP inteiro** persistente (VDI).
- **AppStream 2.0** = **um APLICATIVO** transmitido (streaming), geralmente sem persistência.
- Regra: precisa de uma área de trabalho completa = WorkSpaces; precisa só entregar um app específico via streaming = AppStream.

## Resumo de escolha (prova)
- AD real grande com trust = **Managed Microsoft AD**; proxy pro AD on-prem = **AD Connector**; pequeno/barato sem trust = **Simple AD**.
- Desktop virtual persistente = **WorkSpaces**; streaming de aplicativo = **AppStream 2.0**.
