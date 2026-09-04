# Jardim de Foco Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar Pomodoro persistente com árvores colecionáveis e jardim interativo.

**Architecture:** FocusSession é agregado por proprietário; sessões focus concluídas são as próprias árvores, sem contador de premiações. API serializa comandos por usuário, usa versões e idempotência. React usa prazo do servidor e SVG sem biblioteca adicional.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL, React, TypeScript, SVG, Docker.

**Spec:** docs/superpowers/specs/2026-09-04-focus-garden.md

## Global Constraints

- Uma instalação PostgreSQL/Docker; sem novos serviços pagos.
- pt-BR/en-US/de-DE e componentes Select existentes.
- Demonstrações isoladas por visitante, fixture imutável e expiração de 24 horas.
- Deploy direto Render Docker; CI independente.

### Task 1: Timer persistente e isolamento
Files: backend/app/focus.py, models.py, identity.py, main.py; migrations/versions/d904_focus.py; tests/test_focus.py.
Interface: GET /focus retorna active, server_now, stats; GET /focus/history?garden=true&offset=0 retorna items/has_more; POST /focus/start com duração, espécie, intenção e Idempotency-Key; POST /focus/{id}/{pause,resume,complete,cancel} com version.
- [x] Testar iniciar, pausa e retomada usando clock.now congelado; assert restante não diminui durante pausa.
- [x] Testar complete antes do prazo retorna 409; ao fim retorna completed e segunda chamada não duplica árvore.
- [x] Testar outro proprietário retorna 404; duas sessões ativas retornam 409; versões antigas retornam 409.
- [x] Implementar tabela, índice único parcial, migração e comandos; executar pytest tests/test_focus.py.

### Task 2: Jardim interativo
Files: web/src/pages/Focus.tsx; components/focus/{Tree,FocusTimer}.tsx; focusClock.ts e teste; locales/focus.ts; styles/focus.css; App.tsx.
Interface: tipos derivados OpenAPI, contador calcula max(0,ceil((deadline-serverNow)/1000)); paused usa remaining_seconds.
- [x] Testar cálculo com relógio avançado, pausa e limite zero antes da implementação.
- [x] Implementar escolha, crescimento, conclusão, intervalo e cancelar confirmado. Persistir rascunho de intenção em estado React ao trocar idioma.
- [x] Integrar rota, navegação móvel acessível e jardim/histórico paginado com detalhes.
- [x] Verificar TypeScript, testes e navegação móvel/desktop com Playwright.

### Task 3: Demo, revisão e entrega
Files: backend/app/demo_focus.py, seed.py, demo fixture; docs/focus.md; docs/design/design.json.
- [x] Acrescentar árvores fictícias e regenerar fixture pelo exportador offline; executar testes demo inclusive limite de SQL.
- [x] Executar backend Ruff/mypy/pytest, frontend testes/build, geração OpenAPI e Docker build.
- [x] Revisão independente; corrigir problemas concretos e repetir verificações afetadas.
- [x] Backup PostgreSQL, migrar, integrar main, push e deploy direto Render; validar em demo descartável.

Validação: backend completo 134 testes e 2 casos adicionais de concorrência/reset; 42 testes frontend; testes Playwright desktop/mobile e sessão real de 1 minuto; Ruff/mypy; build Docker. Revisão independente corrigiu recuperação offline e reutilização de chave após resposta perdida. Backup validado e migração aplicada antes do deploy.

Entrega: commit 9c0cd6765b3990c6470f28fab5e81e9a4c94db73 publicado no Render, deploy dep-dadeaf9t0dsc7388nnig Live em 1m02s. Migração d904f0c05123. Demo online validou seis árvores, oito notas e iniciar/repetir/pausar/retomar/cancelar; encerrada após verificação.
