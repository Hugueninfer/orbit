# Login pessoal sem Auth0

Pedido: remover a necessidade de configurar Auth0 para publicar e usar o Orbit.

O modo pessoal usa e-mail/senha quando OIDC_AUTHORITY está vazio. Instalações OIDC existentes continuam funcionando; o deploy padrão Render não solicita variáveis OIDC. Demo permanece isolada e usa seu token temporário atual.

Credenciais ficam no PostgreSQL com scrypt (N=131072, r=8, p=1), salt aleatório e comparação constante. Sessões opacas de sete dias usam cookie HttpOnly/Secure/SameSite=Strict; somente seu SHA-256 vai ao banco. Operações com cookie exigem origem autorizada e cabeçalho de proteção CSRF. Tentativas são limitadas no PostgreSQL, incluindo identidades inexistentes, e verificações de senha são serializadas para limitar memória.

Conta e recuperação de senha são operações administrativas por CLI interativa, sem cadastro público, SMTP ou senha padrão. Trocar a senha revoga todas as sessões. A aplicação não publica credenciais nem inclui senhas em argumentos de comando. A primeira conta online será criada pelo usuário com sua própria senha.

## Execução e validação

- [x] Adicionar testes que falhem para login, isolamento, cookies, expiração, CSRF, limite de tentativas e revogação.
- [x] Criar tabelas de credenciais, sessões e limites com migração reversível; implementar CLI e endpoints.
- [x] Adaptar o formulário existente à referência de login Stitch; preservar OIDC opcional e demo.
- [x] Atualizar contratos gerados, Compose, Render, documentação e comando de criação de conta.
- [x] Executar tipos, testes PostgreSQL e navegador desktop/mobile; verificar migração.
- [ ] Confirmar a execução completa no GitHub Actions.

Referências: OWASP Password Storage e Session Management Cheat Sheets. Sem serviço pago ou novo provedor. Recuperação por e-mail e MFA não integram esta mudança.
