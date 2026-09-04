# Notas & Diário

Uma nota pode estar em uma pasta e também ter uma data de diário. O diário aceita vários registros por dia. As pastas são simples (um nível), com nome e cor; excluí-las move suas notas para Sem pasta. Favoritas, pesquisa no título/texto, lixeira com restauração e exclusão confirmada completam a organização. O editor aceita texto formatado, listas/checklists, links, citações, código, cores e tamanhos. Interface em português, inglês e alemão; conteúdo escrito pelo usuário é preservado.

## Persistência e velocidade

As listas retornam no máximo 30 previews por página; o conteúdo completo só é carregado ao abrir a nota. O editor Tiptap OSS é carregado com a rota /notas, não no login/dashboard. A digitação atualiza o editor localmente, e o autosave agrupa alterações após 800ms. Escritas são serializadas e usam versões otimistas: uma resposta antiga nunca substitui texto recém-digitado. Navegação por links aguarda a gravação; falhas mantêm o usuário na nota. Rascunhos pendentes ficam no sessionStorage, separados por owner/nota, com aviso de fechamento da aba enquanto há texto não salvo. Isso não constitui suporte offline completo: não fechar a aba ignorando esse aviso. Conflitos permitem salvar como nova nota ou descartar explicitamente e recarregar.

O servidor aceita apenas documentos JSON limitados a 200 KB, 100.000 caracteres, 5.000 nós e profundidade 20, com tipos, estrutura, atributos, cores, links e tamanhos validados. O clipboard normaliza estilos externos antes de inserir no editor. A visualização usa o schema Tiptap, sem injetar HTML bruto. Relações pasta/nota usam owner composto. Nenhuma nota vai para outro serviço. Não há anexos nem colaboração simultânea neste incremento.

## Deploy e demo

Migração aditiva `c713a0f92d81` cria notes/note_folders e índices por owner, atualização e data. Mesmo PostgreSQL, Docker e Render, sem nova variável. Fazer backup e executar scripts/migrate-remote.sh antes do deploy manual. Reset/expiração removem as novas tabelas na ordem correta. A fixture da demo inclui Faculdade, Presentes, dois registros de diário e uma nota com checklist. Regenerar com app.export_demo_template quando seed.py mudar.

Referência visual: receita generic_collection, tarefas desktop e backlog mobile do Stitch. Desvio explícito necessário: composição de três painéis e toolbar de escrita para o novo fluxo solicitado. A navegação mobile passa a seis destinos, em uma linha.

Editor: https://tiptap.dev/docs/editor/getting-started/install/react
