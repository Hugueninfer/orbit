# Telegram com Gemini — plano de implementação

Objetivo aprovado: enviar áudio ao bot Telegram, interpretar uma despesa e registrá-la no Orbit; pedir esclarecimento no chat quando necessário. Uma instalação Docker gratuita, PostgreSQL existente, nenhuma conta paga adicional. Gemini no nível gratuito, conforme cota da chave do usuário; sem habilitar faturamento. Áudio/contexto enviados ao Google somente para contas pessoais vinculadas. Demo continua simulada.

## Contratos e decisões

- Provedor `GeminiExpenseProvider.extract(audio: bytes, context: dict) -> dict` em `backend/app/gemini.py`; HTTPX para generateContent, JSON estruturado, áudio OGG inline e texto de esclarecimento em `context['message']`. Retorno compatível com `record_extraction`: despesa ou compra, ou `needs_clarification/question` com rascunho incompleto. Nunca inventar identificadores/valores; validar referências contra contexto. `context`: today, locale, currency, accounts, categories, cards e pending.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WORKER_ENABLED`. Provedor HTTP legado permanece compatível.
- Worker embutido no lifespan, thread única, fila PostgreSQL com processamento serial e tentativas espaçadas. Webhook só grava na fila; inicialização retoma pendências após reinício. Sem Redis/worker pago. Falhas registram apenas classe, nunca URLs com credenciais.
- Esclarecimentos preservam rascunho por até 30 minutos em Inbox, sempre do mesmo usuário/chat; texto posterior complementa esse rascunho, novo áudio inicia nova despesa. O mesmo update_id nunca grava duas vezes.
- UI preserva referência visual `orbit_integra_o_telegram_udio_finan_as`; adiciona link direto ao bot e instruções de áudio. Nenhuma migração destrutiva nem envio de dados da demo a provedores reais.

## Tarefas

- [x] Provedor Gemini e testes de contrato HTTP: áudio, JSON inválido, referências desconhecidas, esclarecimento e falha 429. Rodar testes antes (falha por implementação ausente), implementar e repetir.
- [x] Integração do provider, esclarecimento durável, worker e deep link. Testar webhook→fila→extração→despesa, duplicidade, isolamento e execução/reinício do worker em PostgreSQL local de testes. Nenhum teste financeiro em produção.
- [x] UI, variáveis de Compose, guia operacional, OpenAPI gerado. Verificar typecheck/build, Ruff/mypy e testes backend relevantes.
- [ ] Revisão independente; merge/push já autorizados no fluxo de deploy. Configurar segredos no Render, publicar Docker e só então registrar webhook. Validar getWebhookInfo, saúde e estado autenticado; usuário abre /start para concluir vínculo (não inventar chat_id).

## Verificação externa

Credenciais ficam no checkout principal em `.env.telegram` (ignorado, 0600), nunca neste plano nem no Git. Validar bot com getMe e Gemini com áudio sintético sem informações pessoais. Manter o banco pessoal livre de despesas de teste. Ativação usa `https://orbit-x1i7.onrender.com/api/v1/integrations/telegram/webhook` e segredo aleatório.

Revisão independente identificou e corrigiu perda de rascunho em falha temporária, tentativas de recibo muito rápidas e envio após desvinculação. As três regressões foram reproduzidas antes das correções.
