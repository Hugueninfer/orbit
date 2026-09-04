# Coleção de dez árvores

Ao iniciar uma sessão de foco, o servidor sorteia um dos dez modelos. O modelo é salvo na sessão e não muda ao recarregar, trocar de dispositivo ou concluir. A seleção manual de espécie foi substituída pelo sorteio; o campo antigo ainda é aceito para compatibilidade, mas não dirige os novos sorteios.

Cada conta tem um ciclo privado sem repetição. Depois de usar os dez modelos, a próxima sessão inicia automaticamente outro ciclo, sem repetir o último modelo anterior. “Reiniciar sorteio” abre as dez opções novamente, preserva jardim e sessão ativa e mantém a exclusão da última árvore. Sessões canceladas já consumiram seu sorteio; intervalos e pausas não consomem um novo modelo.

O catálogo SVG tem dez receitas estáveis, IDs 0–9, com formatos, cores e folhagem distintos de carvalho, pinheiro e cerejeira. IDs são contrato visual permanente. Não mudar a aparência de IDs existentes ao expandir a coleção. Árvores antigas sem variant_id mantêm seu desenho original.

A demo contém dez árvores concluídas, uma de cada modelo, em ordem aleatória a cada entrada/reinício. A base continua pré-preparada e é copiada em lote; somente a associação dos dez modelos aos exemplos é embaralhada em memória. Nenhum gerador de imagens ou serviço pago é necessário. Base atual: 201 registros. Demos abertas antes da atualização recebem os exemplos ao reiniciar explicitamente ou criar nova demo.

Persistência: `focus_collections` guarda modelos usados, último sorteio, ciclo e versão. `focus_sessions.variant_id` é nullable para compatibilidade. Comandos compartilham bloqueio por proprietário, controle otimista e idempotência; a restrição de uma sessão ativa permanece. Reset do ciclo não reinicia a cota de gravações da demo. Migração aditiva `e105a3ee0010`; backup e Alembic usam conexão direta Neon, sem pooler.

Validação cobre esgotar o catálogo, não repetir a última após reset, idempotência, reabertura da sessão, reset sem apagar jardim, sorteio independente entre contas, legado sem variant_id e preservação das demais funcionalidades. UI nos três idiomas, responsiva e com movimento reduzido.
