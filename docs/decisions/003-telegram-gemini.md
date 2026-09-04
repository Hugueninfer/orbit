# Telegram com Gemini no mesmo serviço Docker

Decisão aprovada pelo usuário em 2026-09-04: enviar mensagens de voz a um bot Telegram para registrar despesas. O usuário forneceu o token do bot e a chave Gemini em arquivo privado. Gemini substitui o gateway de transcrição genérico como caminho padrão quando GEMINI_API_KEY está presente; o adapter HTTP legado continua opcional.

Gemini 3.1 Flash-Lite foi escolhido por aceitar áudio e oferecer cota gratuita. A API rejeitou o 2.5 Flash-Lite para esta conta; o 3.5 Flash-Lite retornou 503 nos testes. O modelo é configurável. Não foi habilitado faturamento, nem contratado serviço adicional. Limites gratuitos e políticas do Google podem mudar.

O webhook autentica um segredo, deduplica update_id e grava no PostgreSQL. Um worker embutido no lifespan do serviço Docker processa a fila serialmente; locks transacionais evitam concorrência entre instâncias durante deploy. O worker retoma pendências ao iniciar. O Render gratuito pode dormir e atrasar o primeiro atendimento; não há promessa de resposta instantânea ou execução contínua gratuita. O job CLI também permanece disponível.

Apenas contas pessoais vinculadas podem enviar dados ao Google. A demo continua offline/simulada. Áudios têm limite de 3 minutos/10 MB; download possui limite efetivo de memória. São enviados ao Gemini o áudio e nomes/IDs das contas, categorias de despesa e cartões ativos, data/moeda e um eventual rascunho. Não são enviados saldos nem histórico financeiro. O nível gratuito do Google pode usar conteúdo para melhorar produtos, como informado na UI e ao usuário antes da configuração.

O modelo retorna JSON estruturado; tipos, referências, centavos e regras financeiras são validados novamente no servidor. Dados ambíguos viram pergunta pelo chat. O usuário responde por texto em até 30 minutos; /cancelar ou um novo áudio encerra o rascunho anterior. Rascunhos vencidos deixam de ser utilizáveis e são apagados na próxima execução do worker. Mensagens repetidas não registram novamente. Um limite local de 50 mensagens processadas por conta em 24 horas reduz consumo; indisponibilidade/cota da API não gera registro parcial nem aciona provedor pago automaticamente.

A tela mantém os cartões, cores e estrutura da referência Stitch de Telegram. O link 'Abrir bot no Telegram' usa um código temporário de vínculo; instruções deixam claro que o áudio é enviado pelo Telegram, não pelo site. Campos operacionais sem função real continuam ausentes.

Referências: https://ai.google.dev/gemini-api/docs/audio, https://ai.google.dev/gemini-api/docs/structured-output, https://ai.google.dev/gemini-api/docs/pricing, https://core.telegram.org/bots/api.

Atualização aprovada em 2026-09-04: quando o usuário omite a forma de pagamento, a captura assume crédito. Um único cartão ativo pode ser escolhido automaticamente; com vários cartões ou nenhum, pede identificação/cadastro. Forma de pagamento explícita prevalece. A lista de Despesas inclui compras no cartão, com identificação Crédito; a aba específica passa a se chamar No crédito. A visão Todas conserva pagamentos de fatura, mas Despesas não os repete. Totais mantêm as regras existentes de caixa/competência. Essa apresentação substitui a separação ambígua das abas da referência visual, preservando seus componentes.
