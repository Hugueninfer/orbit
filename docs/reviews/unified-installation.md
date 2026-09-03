# Revisão independente — instalação unificada

Data: 2026-09-03. Escopo: alterações da branch `feat/unified-installation` sobre `68aeafa`, incluindo os novos testes e contratos gerados, confrontadas com `AGENTS.md` e o plano aprovado.

**Veredito de revisão: nenhum problema concreto de severidade alta ou média encontrado.**

- Backend: bearer explícito prevalece sobre cookie; credenciais inválidas/expiradas não recorrem à sessão pessoal. Reset, cotas e limpeza permanecem restritos ao proprietário demo. Logout demo revoga apenas seu token; logout pessoal rejeita Authorization. Modos anteriores e OIDC permanecem contemplados.
- Frontend: intenção por aba impede restauração pessoal após expiração/logout demo; requisições demo omitem cookies e transições limpam o cache. `/demo` abre a entrada sem criar sessão automaticamente. Identificação visual usa `profile.is_demo`.
- Telegram: demos informam `enabled=false`/`provider_mode=fixture`; processamento e entrega bloqueiam proprietários demo, inclusive vínculos e mensagens pendentes legados.
- Deploy e contratos: Compose, Render e documentação adotam uma instalação e um PostgreSQL; CI provisiona a conta pessoal no mesmo serviço combinado usado pelos dois conjuntos E2E. OpenAPI e tipos TypeScript incluem `combined` e logout demo.

Revisão por leitura de código e testes, sem executar testes ou acessar o banco compartilhado. O executor informou 73 testes backend e 13 frontend aprovados, além de typecheck/build; a alteração final de `enabled` recebeu revisão de código. A aprovação de entrega ainda depende da validação integrada Docker/E2E pelo executor. Nenhum serviço externo foi validado nesta revisão.
