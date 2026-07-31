# Handoff: Bora Aprender AWS Game

## Contexto geral

Você está continuando a incorporação de melhores ideias do projeto `aws-certifyprep-pwa-2` no jogo `bora-aprender-aws-game` (estudo interativo para certificação AWS SAA-C03). O projeto usa JavaScript vanilla, testes com `node --test` e Python `unittest`, PWA, localStorage e segue Clean Code/Clean Architecture.

## O que já foi entregue

1. **PWA**: `manifest.json`, `sw.js`, ícones 32/180/192/512, registro no `index.html`.
2. **Status de rede + prompt de instalação PWA**.
3. **Streak diário + logs de estudo** (`studyLogs`, `streakDays`).
4. **Export/import de backup JSON** com diálogo acessível.
5. **Modo simulado cronometrado**: 65 questões, 130 min, score AWS 100–1000, corte 720, histórico `examHistory`.
6. **Guia de serviços AWS** com estatísticas por frequência.
7. **Filtros por domínio AWS** na lista de fases.
8. **Sistema de conquistas/badges** com aba própria.
9. **Confete e toasts** em marcos (fase perfeita, simulado aprovado/score máximo).
10. **Readiness gauge** no dashboard.
11. **Modal de boas-vindas** para primeira visita.
12. **Hardening AppSec**: CSP, X-Content-Type-Options, Referrer-Policy, validação de backup contra prototype pollution, chaves desconhecidas e payload grande.
13. **Sanitização do termo de busca de fases**: função `sanitizarTermoBusca` no core remove caracteres de controle, limita a 100 caracteres e normaliza minúsculas; usada no filtro da grade de fases e no `input` de busca.

## Estado dos testes

- `npm test` passa com **112 testes JS + 13 testes Python** (30 suites JS).
- `npm run lint` e `npm run format:check` passam.
- `npm audit` sem vulnerabilidades.

## Arquivos principais

- Lógica: `src/jogo.js`, `src/persistencia.js`, `src/renderizador.js`, `src/app.js`, `src/acessibilidade.js`, `src/teclado.js`, `src/audio.js`
- UI: `index.html`, `assets/css/componentes.css`
- Dados: `data/bank.js`
- Testes: `testes/*.test.js`

## Últimos commits no branch `main`

- `feat: sanitização do termo de busca de fases com limitação e remoção de caracteres de controle.`
- `feat: hardening AppSec — CSP, headers e validação de backup.`
- Anteriores: modal de boas-vindas, confete, filtros/domínios, conquistas, readiness, simulado, PWA, etc.

## Próximas melhorias sugeridas (prioridade aproximada)

1. **Hash/integridade do backup**: gerar checksum simples (SHA-256) no export e validar no import.
2. **Rate limiting local**: impedir importação repetida em curto espaço de tempo.
3. **Modo escuro automático**: detectar `prefers-color-scheme`.
4. **Gráfico de evolução dos simulados**: exibir linha de score ao longo do tempo.
5. **Compartilhar resultado do simulado** como texto/imagem.
6. **Validação mais rígida do schema do banco de questões** (`data/bank.js`).

## Convênções obrigatórias

- Sempre executar `npm run lint && npm run format:check && npm test` antes de finalizar.
- Não expor dados pessoais; usar apenas os handles `positiv` ou `ai2m2ia`.
- Commits no formato `feat:`, `fix:`, `docs:`, `perf:` etc., incluindo `Generated with [Devin]` e Co-Authored-By.
- Não adicionar dependências sem necessidade; se adicionar, preferir pacotes publicados há pelo menos 7 dias.
- Sempre escrever testes para novas regras de domínio.

## Primeira ação recomendada

A próxima melhoria mais alinhada com o contexto AppSec/UX atual é o **hash/integridade do backup JSON** (SHA-256 no export e validação no import). Pergunte ao usuário se deseja começar por ela ou por outra sugestão da lista acima.
