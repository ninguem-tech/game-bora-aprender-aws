# CloudFront e Edge — notas verificadas

Recuperado em 2026-06-28. Foco SAA-C03.

## Acesso seguro à origem S3: OAC (atual) vs OAI (legado)
- **OAC (Origin Access Control)**: forma **atual e recomendada** de restringir o bucket S3 pra ser acessível **só via CloudFront** (não direto pela URL do S3). Suporta **todas as regiões**, **SSE-KMS**, SigV4, credenciais de curta duração + rotação, resource-based policy. Protege contra confused deputy.
- **OAI (Origin Access Identity)**: forma **legada**, com limitações (não suporta SSE-KMS, nem POST com SigV4 em certas regiões). Use OAC em projetos novos.
- Fluxo OAC: dá permissão de leitura do bucket ao OAC do CloudFront + remove acesso público/direto ao S3.
- Fontes: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Conteúdo privado: Signed URLs vs Signed Cookies
- **Signed URL**: controla acesso a **um arquivo individual**. Use quando cada item precisa de uma URL assinada própria (ex.: download pago específico) ou o cliente não suporta cookies.
- **Signed Cookies**: controla acesso a **vários arquivos restritos** sem mudar as URLs. Use pra streaming/áreas com muitos arquivos (ex.: liberar toda a biblioteca pra um assinante).
- Ambos: definem **expiração** (data/hora de fim), opcional início, e opcional **restrição por IP**.
- Fontes: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html

## Restrição geográfica (Geo Restriction)
- Bloqueia/permite acesso por **país** (allowlist ou blocklist) a todo o conteúdo da distribuição. Aplica-se à **distribuição inteira** (não por path/behavior). Pra licenciamento/conformidade por região.

## Cache TTL
- **Minimum / Default / Maximum TTL** controlam quanto tempo o objeto fica em cache antes do CloudFront checar a origem. **Default TTL padrão = 86400s (1 dia)**. Cache policy define a chave de cache.

## CloudFront Functions vs Lambda@Edge
- **CloudFront Functions**: **JavaScript leve**, roda **só em eventos do viewer** (viewer request/response), startup sub-ms, escala a milhões de req/s, **~1/6 do preço** do Lambda@Edge. Pra: **manipular headers, reescrever/redirecionar URL, normalizar cache key, autorização simples**. SEM chamadas de rede externas.
- **Lambda@Edge**: Node.js/Python, roda em **viewer E origin** (request/response), mais poder de computação, **permite chamadas de rede externas**, gerar/manipular conteúdo (inclusive em cache miss antes da origem). Maior custo e latência.
- Regra: tarefa curtinha de header/URL no viewer = CloudFront Functions; lógica mais pesada, chamada externa ou manipulação na origem = Lambda@Edge.
- Fontes: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html

## Padrões comuns (prova)
- **Site estático**: S3 (privado) + CloudFront com **OAC** + (opcional) WAF na distribuição. Acelera e protege.
- **CloudFront + WAF**: o WAF (camada 7) anexa à distribuição CloudFront pra filtrar SQLi/XSS na borda; **Shield** protege contra DDoS.
