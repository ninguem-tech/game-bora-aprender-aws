# Prompt: Auditoria e Melhoria de Acessibilidade e Responsividade — WCAG 2.2 AA

Este prompt adota a **WCAG 2.2 nível AA**, atual recomendação do W3C, e as práticas oficiais de componentes e navegação por teclado do [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/). A WCAG 2.2 acrescenta, entre outros pontos, requisitos de foco não obscurecido e tamanho mínimo de alvos de interação. [Referência oficial do W3C](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

---

## Objetivo

Auditar e aprimorar a **acessibilidade** e a **responsividade** do projeto **Bora Aprender AWS Game**, garantindo conformidade prática com a **WCAG 2.2 nível AA** e funcionamento correto em celulares, tablets, notebooks e desktops, sem alterar os fluxos, regras de negócio, conteúdo educacional ou identidade visual do jogo.

A implementação deve beneficiar pessoas que utilizam:

- Navegação exclusivamente por teclado;
- Leitores de tela;
- Ampliação de texto e zoom;
- Temas de alto contraste;
- Preferência por movimento reduzido;
- Navegação por toque em diferentes tamanhos de tela;
- Tecnologias assistivas;
- Diferentes formas de percepção de cores, sons e animações.

A abordagem de layout deve ser **mobile-first**, sem framework CSS, bundler ou dependências externas.

Acessibilidade e responsividade devem ser incorporadas à arquitetura existente, e não implementadas como uma camada improvisada sobre a interface.

---

## 1. Contexto do projeto

O projeto utiliza:

- HTML, CSS e JavaScript puro;
- Aplicação SPA sem framework;
- Módulos UMD carregados por `<script src>`;
- `src/jogo.js` como camada de domínio;
- `src/renderizador.js` como camada de apresentação;
- `src/acessibilidade.js` para preferências e anúncios;
- `src/teclado.js` para atalhos;
- `src/app.js` como orquestrador;
- Estilos em `assets/css/`: `variaveis.css`, `base.css`, `componentes.css`, `telas.css` e `animacoes.css`;
- Testes com `node:test` e `node:assert/strict`;
- Nenhuma dependência externa em runtime.

Respeitar integralmente o `AGENTS.md`.

---

## 2. Etapa obrigatória de auditoria

Antes de modificar qualquer arquivo:

### 2.1 Auditoria de acessibilidade

1. Inspecionar `index.html`, todos os arquivos de `assets/css/` e os módulos de UI em `src/`.
2. Mapear cada tela e estado interativo:

   - Home;
   - Lista e filtros de fases;
   - Quiz;
   - Salvar o Pet;
   - Sobrevivência;
   - Leitner;
   - Resumos;
   - Sobre;
   - Tema;
   - Escala de fonte;
   - Áudio;
   - Atalhos.

3. Criar uma lista dos problemas encontrados, classificando-os como:

   - Bloqueador;
   - Alto;
   - Médio;
   - Baixo.

4. Relacionar cada problema ao critério relevante da WCAG 2.2 quando aplicável.
5. Registrar o estado inicial antes de implementar as correções.

### 2.2 Auditoria responsiva

1. Inspecionar `index.html` e todos os arquivos em `assets/css/`.
2. Identificar:

   - Larguras fixas;
   - Overflow horizontal;
   - Textos truncados;
   - Botões pequenos ou sobrepostos;
   - Grades que não se adaptam;
   - Elementos que escapam do card;
   - Problemas causados por textos longos;
   - Uso inadequado de `100vh`;
   - Problemas com teclado virtual;
   - Problemas em orientação paisagem;
   - Elementos ocultos por safe areas.

3. Registrar os problemas encontrados por viewport e severidade.

**Não modificar o código antes de concluir o diagnóstico completo (2.1 e 2.2).**

---

## 3. Viewports e condições obrigatórias de teste

Validar, no mínimo:

- 320 × 568 — celular pequeno;
- 360 × 800 — Android compacto;
- 390 × 844 — celular moderno;
- 412 × 915 — Android grande;
- 568 × 320 — celular em paisagem;
- 768 × 1024 — tablet vertical;
- 1024 × 768 — tablet horizontal;
- 1280 × 720 — notebook;
- 1440 × 900 — desktop.

Também testar:

- Zoom de 200%;
- Escala de fonte máxima do jogo;
- Textos longos;
- Orientação vertical e horizontal;
- `prefers-reduced-motion`;
- Tema claro e escuro.

Os breakpoints devem ser definidos pelo comportamento do conteúdo, não por modelos específicos de aparelho.

---

## 4. Requisitos de acessibilidade

### 4.1 HTML semântico

- Manter `lang="pt-BR"`.
- Garantir landmarks apropriados: `header`, `main`, `footer` e navegação quando aplicável.
- Preservar uma hierarquia coerente de títulos.
- Preferir elementos HTML nativos a ARIA personalizada.
- Utilizar botões reais para ações e links reais para navegação.
- Não usar elementos genéricos clicáveis.
- Garantir nomes acessíveis claros e únicos para todos os controles.

### 4.2 Gerenciamento de foco na SPA

Sempre que uma nova tela ou questão for renderizada:

- Mover o foco de maneira previsível para o título principal ou para o container `<main>`.
- Não deixar o foco preso em um elemento removido do DOM.
- Manter o foco visível.
- Não mover o foco durante digitação ou leitura sem uma ação explícita do usuário.
- Ao voltar à tela anterior, restaurar o foco ao controle que originou a navegação quando isso for apropriado.
- Garantir que o foco nunca fique oculto por outro elemento.

Centralizar essa lógica em funções pequenas e reutilizáveis dentro de `src/acessibilidade.js`.

### 4.3 Navegação por teclado

Garantir que todo o jogo possa ser operado usando somente teclado:

- `Tab` e `Shift+Tab` percorrem os controles em ordem lógica.
- `Enter` e `Espaço` ativam botões conforme o comportamento HTML nativo.
- `Escape` retorna ao início somente quando não conflitar com outro componente.
- Atalhos numéricos e por letras não podem disparar durante digitação em `input`, `textarea`, `select` ou elementos editáveis.
- Atalhos não podem disparar duas ações para a mesma tecla.
- Nenhum fluxo pode depender exclusivamente do mouse, hover, gesto ou toque.
- Não criar armadilhas de foco.

Atualizar instruções visuais e acessíveis sobre os atalhos.

### 4.4 Estados e propriedades acessíveis

Atualizar programaticamente os estados dos controles:

- `aria-pressed` para tema, áudio e outros botões de alternância;
- `aria-current` ou estado equivalente para a seção ativa;
- `aria-expanded` quando houver conteúdo expansível;
- `aria-disabled` somente quando necessário, preservando também o atributo nativo `disabled`;
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` e um nome acessível para a barra de progresso;
- Estado selecionado para filtros, abas e escolha do pet.

Não adicionar ARIA redundante ou incompatível com a semântica nativa.

### 4.5 Leitores de tela e conteúdo dinâmico

- Manter uma região `aria-live` adequada para mensagens curtas.
- Anunciar:

  - Mudança de tela;
  - Número e posição da questão;
  - Dica revelada;
  - Resposta correta ou incorreta;
  - XP recebido;
  - Alteração de vidas;
  - Progresso do Pet;
  - Cartão Leitner reagendado;
  - Fim da fase ou partida.

- Evitar anúncios excessivos ou repetidos.
- Não inserir blocos inteiros da página dentro da região live.
- Mensagens visuais importantes também devem estar disponíveis para leitores de tela.
- Emojis relevantes devem possuir contexto textual; emojis decorativos não devem gerar ruído.

### 4.6 Contraste e uso de cores

Validar os temas claro e escuro:

- Texto normal: contraste mínimo de 4.5:1.
- Texto grande: contraste mínimo de 3:1.
- Componentes, bordas e indicadores essenciais: contraste mínimo de 3:1.
- O foco visível deve possuir contraste suficiente.
- Acerto e erro não podem ser comunicados apenas por verde ou vermelho.
- Sempre combinar cor com texto, ícone ou outra indicação visual.

Se alguma cor precisar mudar, preservar ao máximo a identidade visual atual.

### 4.7 Ampliação, zoom e reflow

Garantir funcionamento (detalhamento de layout na seção 5):

- Com zoom de 200%;
- Com ampliação de texto de até 200%;
- Em largura equivalente a 320 CSS pixels;
- Sem perda de conteúdo ou controles;
- Sem sobreposição;
- Sem rolagem horizontal para conteúdo textual comum;
- Sem truncar textos importantes.

A escala de fonte configurável do jogo deve continuar persistida e funcional.

### 4.8 Movimento e animações

Adicionar suporte a:

```css
@media (prefers-reduced-motion: reduce)
```

Quando a preferência estiver ativa:

- Remover ou reduzir animações do Pet;
- Remover transições decorativas;
- Evitar movimentos contínuos;
- Preservar o significado visual dos estados;
- Não depender da animação para comunicar progresso, acerto ou erro.

Nenhuma animação pode piscar em frequência perigosa.

### 4.9 Alvos de interação

- Garantir tamanho mínimo de 24 × 24 CSS pixels para alvos interativos, conforme WCAG 2.2 AA.
- Preferir aproximadamente 44 × 44 pixels nos controles principais e em interfaces móveis.
- Manter espaçamento suficiente entre alvos próximos.
- Verificar botões de filtros, controles de fonte, tema, áudio e respostas.

### 4.10 Áudio

- Não reproduzir áudio automaticamente ao carregar a aplicação.
- Preservar o controle de silenciamento.
- Atualizar nome e estado acessível do botão de áudio.
- Nenhuma informação pode depender exclusivamente de som.
- Feedback sonoro deve sempre possuir equivalente visual e textual.

---

## 5. Requisitos de responsividade

### 5.1 Estrutura geral

- Utilizar abordagem mobile-first.
- Preservar o limite de leitura confortável em telas largas.
- Usar unidades flexíveis como `%`, `rem`, `min()`, `max()` e `clamp()`.
- Evitar dimensões fixas que provoquem overflow.
- Usar `min-width: 0` em filhos de Flexbox ou Grid quando necessário.
- Garantir que palavras, URLs e conteúdos extensos possam quebrar linha.
- Não reduzir texto abaixo de um tamanho legível para fazê-lo caber.
- Não esconder conteúdo essencial em telas pequenas.

### 5.2 Altura da viewport

Quando necessário, preferir unidades modernas:

```css
min-height: 100dvh;
```

Fornecer fallback apropriado para navegadores sem suporte.

Não depender exclusivamente de `100vh`, especialmente em navegadores móveis com barras dinâmicas.

### 5.3 Safe areas

Preservar suporte a:

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

Nenhum controle pode ficar sob notch, barra de gestos ou área insegura.

### 5.4 Cabeçalho e controles

- O cabeçalho deve se reorganizar em telas estreitas.
- Logo, botão de início e controles não podem se sobrepor.
- Controles de fonte, tema e áudio devem permanecer acessíveis.
- Permitir quebra ou reorganização dos controles quando necessário.
- Manter alvos de toque confortáveis.
- A barra de progresso e o XP devem continuar legíveis.

### 5.5 Cards e conteúdo

- O card principal deve usar toda a largura disponível em celulares.
- Ajustar padding com `clamp()` quando apropriado.
- Questões e explicações longas não podem escapar do card.
- Feedbacks, dicas e situações devem se adaptar sem rolagem horizontal.
- Conteúdo educacional não deve ser truncado.

### 5.6 Botões e opções

- Botões de resposta devem ocupar largura adequada em celulares.
- Texto e badges de atalhos devem quebrar linha corretamente.
- Botões lado a lado devem virar coluna quando não houver espaço.
- Nenhum botão pode depender de hover.
- Estados de foco, ativo, correto, incorreto e desabilitado devem continuar visíveis.
- Alvos principais devem ter aproximadamente 44 × 44 CSS pixels.

### 5.7 Abas, filtros e busca

- As abas dos modos devem permanecer utilizáveis em telas estreitas.
- Se houver rolagem horizontal intencional, ela deve ser clara, acessível e limitada ao componente.
- Avaliar se quebra de linha é melhor que rolagem.
- Chips de filtros devem se reorganizar sem sobreposição.
- O campo de busca deve permanecer inteiramente visível quando o teclado virtual abrir.

### 5.8 Grades e estatísticas

Adaptar responsivamente:

- `.dashGrid`;
- `.faseGrid`;
- `.petGrid`;
- `.stat`;
- `.row2`;
- `.modeTabs`;
- Blocos Leitner.

Regras esperadas:

- Estatísticas devem reduzir o número de colunas quando necessário.
- A grade de pets deve continuar legível em celulares pequenos.
- Botões de avaliação do Leitner podem virar coluna.
- Nenhum valor ou rótulo pode ser cortado.

### 5.9 Orientação paisagem

Em celulares na horizontal:

- Evitar que o cabeçalho consuma a maior parte da tela.
- Garantir acesso ao conteúdo principal.
- Permitir rolagem vertical normal.
- Não ocultar botões de resposta ou navegação.
- Não exigir retorno à orientação vertical.

---

## 6. Arquitetura, CSS e segurança

### 6.1 Arquitetura JavaScript

- Manter `src/jogo.js` completamente independente do DOM.
- Concentrar utilitários de acessibilidade em `src/acessibilidade.js`.
- Manter atalhos em `src/teclado.js` com dependências injetadas.
- Manter renderização em `src/renderizador.js`.
- Manter wiring e event delegation em `src/app.js`.
- Não introduzir framework ou bundler.
- Preservar exportações UMD e compatibilidade com Node.
- Não duplicar regras de negócio.
- Criar funções pequenas, nomeadas em português e com JSDoc.

### 6.2 Organização do CSS

- Manter estilos nos arquivos existentes:

  - `variaveis.css`;
  - `base.css`;
  - `componentes.css`;
  - `telas.css`;
  - `animacoes.css`.

- Colocar regras responsivas no arquivo correspondente ao componente ou tela.
- Evitar criar um arquivo genérico cheio de correções desconectadas.
- Evitar `!important`, salvo quando tecnicamente justificado.
- Evitar duplicação de media queries.
- Preferir CSS Grid e Flexbox.
- Não usar JavaScript para cálculos de layout que possam ser feitos em CSS.
- Não adicionar frameworks como Bootstrap ou Tailwind.
- Não alterar regras de negócio ou conteúdo do banco.

### 6.3 Segurança

- Manter uso de `textContent` para conteúdo textual sempre que possível.
- Não transformar a implementação de acessibilidade em vetor de XSS.
- Dados dinâmicos usados em `innerHTML` devem continuar limitados ao banco validado.
- Não adicionar scripts externos, trackers ou serviços de terceiros.
- Não incluir credenciais ou dados pessoais.

---

## 7. Testes automatizados

Criar ou ampliar `testes/acessibilidade.test.js`.

Adicionar testes determinísticos para, no mínimo:

1. Alternância e aplicação do tema.
2. Escala mínima e máxima de fonte.
3. Estado acessível do botão de áudio.
4. Atualização segura da região `aria-live`.
5. Gerenciamento de foco após renderização.
6. Comportamento com elemento de foco inexistente.
7. Atalhos ignorados durante digitação.
8. Teclas de resposta disparando apenas uma ação.
9. Escape retornando ao início.
10. Preferência por movimento reduzido, quando testável sem dependências externas.

Utilizar:

- `node:test`;
- `node:assert/strict`;
- Padrão AAA;
- Mocks pequenos de DOM quando necessários;
- Nenhuma dependência externa apenas para simular o DOM.

Todos os testes existentes devem continuar passando.

---

## 8. Validação manual obrigatória

Testar no navegador, em cada viewport principal (seção 3):

- Navegação completa usando somente teclado;
- Ordem de foco;
- Foco visível;
- Home;
- Cabeçalho;
- Lista de fases;
- Busca e filtros;
- Quiz;
- Dicas;
- Respostas e feedback;
- Pet;
- Sobrevivência;
- Leitner;
- Resumos;
- Sobre;
- Tema claro e escuro;
- Escala de fonte;
- Áudio;
- Zoom de 200%;
- Largura de 320 CSS pixels;
- Orientação vertical e horizontal;
- `prefers-reduced-motion`;
- Leitor de tela VoiceOver, quando disponível.

Verificar também:

- Ausência de overflow horizontal no documento;
- Ausência de elementos sobrepostos;
- Ausência de texto truncado;
- Ordem visual coerente;
- Rolagem funcional;
- Alvos de toque;
- Persistência das preferências;
- Console sem erros.

Não considerar apenas screenshots: interagir com os controles em cada breakpoint relevante.

Executar uma inspeção automatizada de acessibilidade se alguma ferramenta já estiver disponível no ambiente, mas não considerar a automação suficiente: contraste, foco, teclado e anúncios devem ser verificados manualmente.

---

## 9. Critérios de aceitação

### Acessibilidade

- [ ] Conformidade prática com WCAG 2.2 nível AA.
- [ ] Todos os fluxos operáveis somente por teclado.
- [ ] Nenhuma armadilha de foco.
- [ ] Foco reposicionado corretamente após mudanças de tela.
- [ ] Foco sempre claramente visível e nunca obscurecido.
- [ ] Leitores de tela recebem anúncios úteis e não repetitivos.
- [ ] Todos os controles possuem nome, função e estado acessíveis.
- [ ] Abas, filtros, toggles e progresso expõem seus estados.
- [ ] Contraste mínimo atendido nos temas claro e escuro.
- [ ] Acerto, erro e progresso não dependem somente de cor ou som.
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Testes novos de acessibilidade implementados.

### Responsividade

- [ ] Aplicação utilizável a partir de 320 CSS pixels.
- [ ] Nenhum overflow horizontal no documento.
- [ ] Nenhum conteúdo essencial truncado ou oculto.
- [ ] Cabeçalho funcional em celular, tablet e desktop.
- [ ] Todas as telas se adaptam às larguras testadas.
- [ ] Grades alteram colunas de maneira coerente.
- [ ] Botões lado a lado viram coluna quando necessário.
- [ ] Aplicação funciona nas duas orientações.
- [ ] Escala máxima de fonte não quebra a interface.
- [ ] Safe areas móveis são respeitadas.
- [ ] Teclado virtual não impede busca ou navegação.
- [ ] Tema claro e escuro funcionam em todos os tamanhos.

### Comuns

- [ ] Layout funcional com zoom de 200% e largura de 320 CSS pixels.
- [ ] Alvos de interação atendem ao mínimo da WCAG 2.2 (24 × 24), com ~44 × 44 nos controles principais.
- [ ] Navegação por teclado continua funcional em todas as viewports.
- [ ] Nenhuma alteração nas regras de XP, Pet, Sobrevivência ou Leitner.
- [ ] Nenhuma dependência externa foi adicionada.
- [ ] Nenhuma regressão visual ou funcional relevante.
- [ ] `npm test` passa integralmente.
- [ ] Não há erros de console.
- [ ] Árvore Git limpa, exceto pelas alterações intencionais.

---

## 10. Entrega esperada

Ao finalizar, apresentar:

1. Resumo da auditoria inicial (acessibilidade e responsividade).
2. Problemas encontrados: severidade, critério WCAG relacionado e viewports afetados.
3. Arquivos modificados.
4. Estratégia de breakpoints adotada.
5. Correções implementadas.
6. Testes adicionados.
7. Resultado completo de `npm test`.
8. Resultado da validação manual, com evidências em cada viewport.
9. Limitações que ainda exijam avaliação humana.
10. Checklist final dos critérios de aceitação.

Não declarar conformidade absoluta apenas porque uma ferramenta automatizada não encontrou erros. Diferenciar claramente:

- Verificações automatizadas;
- Verificações manuais executadas;
- Pontos que ainda dependem de avaliação humana.

A tarefa somente estará concluída depois da validação funcional em navegadores, não apenas pela inspeção estática do CSS.

---

## Referências oficiais

- [WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Novidades da WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
