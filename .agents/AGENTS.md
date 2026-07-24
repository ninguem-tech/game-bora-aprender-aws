# Diretrizes para Agentes de IA e Desenvolvedores (.agents/AGENTS.md)

Este documento estabelece os padrões e princípios obrigatórios para desenvolvimento, refatoração e manutenção de código no projeto **Bora Aprender AWS Game**. O objetivo é garantir um código legível, modular, testável, seguro e sustentável a longo prazo.

---

## 1. Clean Code (Código Limpo)

### 1.1 Nomenclatura Clara e Expressiva
- Use nomes descritivos para variáveis, funções e arquivos. Evite abreviações genéricas (`d`, `arr`, `tmp`, `fn`).
- Prefira nomes baseados no domínio da aplicação (ex: `validarQuestao`, `calcularPontuacaoXP`, `sistemaLeitner`).
- Funções que retornam valores booleanos devem começar com prefixos afirmativos (`is`, `has`, `deve`, `pode`).

### 1.2 Funções Pequenas e de Responsabilidade Única (SRP)
- Cada função deve realizar apenas uma tarefa bem definida e fazê-la com excelência.
- Se uma função acumula múltiplas etapas (ex: validar, formatar e salvar), divida-a em funções auxiliares puras.
- Evite efeitos colaterais ocultos: funções de cálculo ou validação não devem alterar variáveis globais inadvertidamente.

### 1.3 Manutenibilidade e Legibilidade
- Mantenha funções curtas e focadas.
- Escreva código autoexplicativo em vez de poluir com comentários redundantes. Reserve comentários para explicar o **porquê** de regras de negócio complexas, não o **como**.
- Elimine código morto, trechos comentados e declarações não utilizadas.
- Mantenha padrão estrito de formatação e indentação em todo o projeto.

---

## 2. Clean Architecture (Arquitetura Limpa)

### 2.1 Separação de Camadas e Responsabilidades
O projeto deve seguir a separação clara de responsabilidades:

1. **Camada de Domínio / Regras de Negócio (Core)**
   - **Localização**: `src/` (ex: `src/jogo.js`).
   - **Escopo**: Contém as regras puras do jogo: algoritmo de Repetição Espaçada (Leitner), cálculo de pontuação/XP, modos de jogo (Salvar o Pet, Sobrevivência), validação de esquema de dados.
   - **Regra de Ouro**: O núcleo do domínio **NÃO** deve depender do DOM (como `window`, `document` ou eventos de tela). Ele deve ser 100% executável via Node.js em ambiente de testes ou CLI.

2. **Camada de Dados / Conteúdo**
   - **Localização**: `data/` (ex: `data/bank.js`).
   - **Escopo**: Armazena as questões, fases e metadados da certificação AWS SAA-C03.
   - **Escopo**: Fornece estruturas de dados limpas e validadas para a camada de domínio.

3. **Camada de Interface do Usuário (UI / Apresentação)**
   - **Localização**: `index.html`, scripts de UI e estilos em `assets/`.
   - **Escopo**: Responsável apenas por renderizar a interface, capturar eventos do usuário e atualizar o DOM com base nos estados calculados pelo núcleo do jogo (`src/jogo.js`).

### 2.2 Desacoplamento e Inversão de Dependência
- Passe dependências como parâmetros para funções em vez de acessá-las via escopo global rígido sempre que possível.
- Torne a lógica de estado testável sem depender da inicialização do navegador.

---

## 3. Testes Unitários (Unit Testing)

### 3.1 Escopo e Princípios
- Testes unitários devem validar funções individuais e isoladas da camada de domínio.
- Devem ser rápidos, independentes entre si e determinísticos (mesma entrada gera sempre a mesma saída).
- Executados via `node --test` utilizando o runner nativo do Node.js e `node:assert/strict`.

### 3.2 Estrutura dos Testes (Padrão AAA: Arrange, Act, Assert)
Todo teste unitário deve seguir a estrutura AAA:
- **Arrange (Preparar)**: Configurar os dados de entrada fictícios e o estado necessário.
- **Act (Agir)**: Executar a função sob teste.
- **Assert (Verificar)**: Validar o resultado com asserções estritas (`assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`).

### 3.3 Cobertura Necessária para Testes Unitários
- **Caminho Feliz (Happy Path)**: Garantir o comportamento esperado para entradas válidas.
- **Casos de Borda (Edge Cases)**: Testar listas vazias, números negativos, limites máximos/mínimos (ex: caixa Leitner limitada a 5).
- **Entradas Inválidas / Erros**: Verificar se a função lida adequadamente com dados incompletos ou malformados.

---

## 4. Testes de Integração (Integration Testing)

### 4.1 Escopo e Objetivos
- Testes de integração devem validar o funcionamento conjunto entre múltiplos módulos ou entre o banco oficial de dados (`data/bank.js`) e as funções de domínio (`src/jogo.js`).
- Garantir que a integração do banco de questões atenda a todos os requisitos de integridade da certificação AWS SAA-C03.

### 4.2 Requisitos de Integração
- **Integridade do Banco Oficial**: Garantir que `AWS_BANK` possua formato válido, código de certificação correto, fases preenchidas e questões estruturadas adequadamente.
- **Fluxos Completos de Regras de Jogo**: Testar a progressão completa de uma partida (ex: inicializar modo Sobrevivência -> responder questões -> verificar fim de jogo ao zerar vidas).
- **Ciclo Leitner Completo**: Testar adição de cartões ao baralho Leitner, avanço de caixas no acerto e retorno à Caixa 1 com incremento de lapsos no erro.

---

## 5. Segurança de Aplicação (AppSec / Application Security)

### 5.1 Prevenção contra XSS (Cross-Site Scripting)
- **Manipulação Segura do DOM**: Evite inserir textos dinâmicos ou conteúdos de questões via `innerHTML` sem antes higienizar o conteúdo. Dê preferência a `textContent` ou `innerText` ao renderizar valores oriundos de dados externos ou inputs do usuário.
- **Escape de Caracteres Especiais**: Garanta que seletores e valores exibidos na interface passem por encode de entidades HTML quando necessário.

### 5.2 Gestão de Segredos e Proteção de Dados (Secrets & Privacy)
- **Sem Credenciais no Repositório (Zero Hardcoded Secrets)**: Nenhuma chave de API, token de acesso, credencial AWS ou segredo deve ser incluído no código-fonte, scripts, testes ou comentários.
- **Proteção de Privacidade (PII)**: Respeite a política de privacidade estrita do projeto. Não inclua nem versione dados pessoais identificáveis (PII), como nomes reais ou endereços de e-mail pessoais.

### 5.3 Validação de Entradas e Prevenção contra Injeções
- **Validação Rigorosa de Esquema**: Todas as entradas de dados (arquivos de banco de questões JSON, importações de backups ou dados salvos em `localStorage`) devem ser validadas pelas funções de integridade (`validarBancoDados` e `validarQuestao`) antes de serem processadas pelo core da aplicação.
- **Prevenção de Poluição de Protótipos (Prototype Pollution)**: Evite clonagem ou mesclagem profunda de objetos não tratada (ex: manipulação direta de `__proto__`, `constructor` ou `prototype`).

### 5.4 Segurança nas Ferramentas de Build e Dependências
- **Verificação de Dependências**: Mantenha as poucas dependências do projeto atualizadas e execute auditorias com `npm audit`.
- **Scripts de Build Seguros**: Garanta que scripts utilitários (como `data/build-bank.py`) executem de forma isolada, validando integridade de arquivos de entrada e saída.

---

## 6. Modelo de Licenciamento, Uso e Monetização

### 6.1 Licenciamento do Projeto (GNU AGPLv3 e CC BY-NC-SA 4.0)
O projeto **Bora Aprender AWS Game** adota um modelo de licenciamento de código aberto que permite adaptações e derivações sob compartilhamento pela mesma licença (*ShareAlike*):
- **Código-Fonte (Lógica e Software)**: Licenciado sob a **GNU Affero General Public License v3.0 (GNU AGPLv3)** — qualquer modificação, melhoria ou versão derivada (mesmo executada em serviços de rede/nuvem/SaaS) deve manter o código aberto sob a mesma licença AGPLv3.
- **Conteúdo, Mídias e Banco de Questões**: Licenciado sob **Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional (CC BY-NC-SA 4.0)** — permite a criação de obras derivadas, traduções, adaptações e *skins* regionais/culturais, desde que atribuam a autoria original, não sejam comercializados e sejam distribuídos sob a mesma licença (CC BY-NC-SA 4.0).

### 6.2 Proibição de Paywalls e Condicionamento Financeiro
- **Acesso Gratuito Incondicional**: O jogo principal, seu código base, seus materiais e qualquer obra derivada **NUNCA** podem ter seu uso ou acesso condicionados a pagamento ou ser trancados atrás de paywalls restritivos.
- **Manutenção do Espírito Aberto**: Quem derivar o projeto deve manter exatamente o mesmo espírito de código aberto, livre acesso e utilidade comunitária.

### 6.3 Solicitação de Apoio Financeiro e Doações
- **Apoio Voluntário e Doações**: Solicitar apoio financeiro (como doações, financiamento coletivo ou apoio da comunidade) é permitido e incentivado para sustentar o desenvolvimento.
- **Vedação ao Condicionamento**: Pedir dinheiro nunca pode ser uma condição para liberar o uso ou acessar a aplicação e seus materiais derivados.

---

## 7. Práticas Obrigatórias para Agentes de IA e Contribuidores

1. **Nunca quebre a suíte de testes existente**: Antes de finalizar qualquer alteração, execute obrigatoriamente `npm test` para validar que todos os testes continuam passando sem exceção.
2. **Escreva testes para todo novo comportamento**: Novas regras de jogo, funções utilitárias ou validações DEVEM ser acompanhadas por seus respectivos testes unitários em `testes/`.
3. **Mantenha os testes legíveis e organizados**: Utilize blocos `describe` e `it` com descrições claras em português que documentem o comportamento esperado da aplicação.
4. **Respeite as políticas de privacidade e segurança (AppSec)**: Não inclua dados pessoais, emails reais nem credenciais sensíveis no código, configurações ou commits.

---

## 8. Comandos de Verificação

```bash
# Executar todos os testes da aplicação (unitários e de integração)
npm test
```
