# Orbit: uma instalação e um banco

Decisão aprovada pelo usuário em 2026-09-03: uma aplicação/URL, um PostgreSQL, conta pessoal criada manualmente por CLI, demonstração temporária isolada para cada visitante, sem cadastro público ou CRUD de usuários. Substitui recomendações anteriores de duas instalações/bancos. Auth0 continua dispensável.

## Contratos

- `APP_MODE=combined` é o padrão dos novos deploys; modos `personal` e `demo` permanecem compatíveis.
- Conta pessoal não expira; demos expiram e usam `owner_id` separado no mesmo banco. Limpeza, reset e cotas atingem somente demos.
- Bearer demo explícito sempre prevalece sobre cookie pessoal. Bearer inválido/expirado nunca retorna dados pessoais por fallback.
- Login pessoal por cookie HttpOnly, criação/reset de senha somente CLI. Logout demo revoga somente a demo; logout pessoal não aceita credenciais demo.
- Frontend conserva a intenção de acesso por aba. Demo expirada ou logout não abre a conta pessoal por cookie residual. `/demo` permite abrir a entrada da demonstração mesmo no navegador já autenticado.
- Integrações reais atendem apenas contas pessoais; demo usa fixtures, inclusive quando o provedor pessoal está habilitado.
- Um serviço Docker/Render e uma conexão Neon. Não excluir bancos/volumes existentes nem fundir dados automaticamente.

## Execução e validação

1. Backend: escrever testes de coexistência/cookies + bearer/isolation/reset/limpeza/logout/Telegram; observar falhas; implementar `combined`, preservar CLI/OIDC e modos antigos. Rodar testes PostgreSQL, Ruff e mypy.
2. Frontend: validar entrada combinada, troca de sessão, expiração e logout em desktop/mobile. Atualizar login conforme referência Stitch, labels por `profile.is_demo`, limpar cache ao trocar identidade; regenerar contrato OpenAPI.
3. Deploy/documentação: um serviço, um banco, provisionamento manual; atualizar Compose, Render, CI e guias, registrar decisão e diferença visual.
4. Construir imagem Docker e executar testes completos e E2E na mesma instalação; revisão independente focada em isolamento. Corrigir achados, verificar diff e preparar commit/push e ZIP. Publicação online dependerá da configuração do provedor pelo usuário, sem inventar credenciais.

## Registro

- Plano aprovado pela resposta “ok faça isso”. Implementação isolada na branch `feat/unified-installation`.
- As tarefas compartilham o contrato `combined` e `profile.is_demo`; backend cuida da API, frontend consome contrato regenerado, deploy define o mesmo modo. Preservar defaults explícitos dos testes legados.
- Revisão de consistência: backend e frontend devem rejeitar fallback demo→pessoal; Compose/CI devem usar o mesmo serviço/URL; documentação reflete apenas deploy validado e mantém fontes originais.


## Resultado validado

Implementados os três contratos (backend, frontend e deploy) e revisão independente sem achados altos/médios. Imagem Docker `3cb2ace4383f`, 74 testes backend no runtime Python 3.14/PostgreSQL, 13 testes frontend e 14 jornadas desktop/mobile. Guias e referências de continuidade atualizados. Nenhum banco externo apagado ou mesclado; nenhuma conta pessoal real criada automaticamente. Evidências detalhadas em `../validation.md`.
