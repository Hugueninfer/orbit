# Usar o bot Telegram

1. Entre com sua conta pessoal no Orbit.
2. Em **Finanças**, cadastre sua conta bancária ou cartão. Categorias são opcionais.
3. Em **Telegram Áudio**, gere um código e clique em **Abrir bot no Telegram**. Toque em **Iniciar**. O vínculo expira em 10 minutos enquanto não utilizado.
4. Envie uma mensagem de voz: “Gastei 35 reais no almoço, pela conta Nubank”. Use o nome cadastrado no Orbit.
5. O bot responde com o registro ou pergunta o que falta. Responda por texto em até 30 minutos. Para abandonar o rascunho, envie `/cancelar`; para outra despesa, envie novo áudio.

Confira o lançamento no Orbit e corrija eventuais erros de interpretação. A demo do site continua usando exemplos simulados, sem enviar áudio real.

## Configuração do operador

No ambiente do serviço Docker:

```dotenv
TELEGRAM_BOT_TOKEN=token_do_BotFather
TELEGRAM_BOT_USERNAME=nome_do_bot_sem_arroba
TELEGRAM_WEBHOOK_SECRET=segredo_aleatorio
TELEGRAM_WORKER_ENABLED=true
GEMINI_API_KEY=chave_do_Google_AI_Studio
GEMINI_MODEL=gemini-3.1-flash-lite
```

Cadastre o webhook via `setWebhook` do Telegram apontando para `https://SEU_ORBIT/api/v1/integrations/telegram/webhook`, com `secret_token` igual à variável acima, `allowed_updates=["message"]` e `max_connections=1`. Não descarte updates pendentes em uma reconfiguração. Confirme o destino com `getWebhookInfo`. O bot só recebe despesas de chats privados vinculados, e o token nunca deve entrar no frontend/Git.

Compose aceita as mesmas variáveis pelo `.env`. O worker usa o mesmo processo da aplicação, sem serviço pago adicional, Redis ou Celery. Para operador que preferir seu próprio scheduler, mantenha TELEGRAM_WORKER_ENABLED=false e execute `python -m app.jobs telegram-worker` repetidamente.

A instalação gratuita pode dormir; o primeiro áudio pode demorar. Áudios limitados a 3 minutos/10 MB; no máximo 50 mensagens processadas por conta em 24 horas. As cotas do Google se aplicam separadamente. Se o Gemini estiver indisponível, não há fallback pago nem lançamento parcial: o bot pede nova tentativa. O envio de recibos faz até cinco tentativas, com espera progressiva e respeito ao limite do Telegram; em dúvida confira Finanças antes de reenviar a despesa.

No nível gratuito, áudios/contexto podem ser usados pelo Google para melhorar seus produtos. Consulte https://ai.google.dev/gemini-api/docs/pricing. Não habilite faturamento para usar esta configuração gratuita.
