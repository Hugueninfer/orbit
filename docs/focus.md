# Jardim de Foco

A seção `/foco` transforma sessões Pomodoro em um jardim pessoal. Escolha uma duração inteira entre 1 e 180 minutos, uma intenção opcional e carvalho, pinheiro ou cerejeira. Cada sessão de foco concluída adiciona exatamente uma árvore. As seis árvores da demo são exemplos fictícios prontos.

O crescimento visual passa por semente, broto, árvore jovem e adulta. A árvore adulta só é concedida após confirmação do servidor. Pausar congela os segundos restantes; encerrar antes do fim não concede árvore. Intervalos opcionais de 5, 10 ou 15 minutos não contam como foco e não geram árvores. Sem penalidades, publicidade ou serviços externos.

## Persistência e recuperação

`focus_sessions` é um agregado PostgreSQL com proprietário, início/prazo UTC, duração, segundos restantes, versão, estado e espécie. Uma árvore é a própria sessão focus completed; não há outro contador ou tabela de prêmios que possa duplicá-la. Índice único parcial impede duas sessões running/paused por proprietário. Comandos usam o bloqueio de usuário já existente, controle de versão e, na criação, Idempotency-Key.

O frontend calcula o contador pelo prazo do servidor, sem gravar a cada segundo. O provider permanece montado durante navegação entre módulos e exibe indicador na topbar. Recarregar/retornar à aba reconcilia com o servidor; não é necessário manter a aba aberta. O sistema acompanha tempo decorrido, não atenção ou atividade de outros aplicativos. A confirmação de conclusão ocorre quando o aplicativo está conectado e visível ou antes de iniciar outra sessão; o instante registrado é o prazo original. Não precisa de cron, worker extra ou notificação push.

Falhas transitórias de conclusão são repetidas a cada 30 segundos em primeiro plano e após reconexão; há também botão para tentar novamente. Respostas confirmadas atualizam o cache imediatamente. Comandos que terminam depois do logout não podem atualizar o cache de uma nova conta. Se uma resposta de início se perder, a leitura do estado resolve a chave de idempotência consumida. Encerrar/pausar depois que o prazo venceu preserva a árvore conquistada.

Jardim e histórico são paginados em 24 registros, com detalhes ao selecionar. As estatísticas contam apenas foco concluído e respeitam o fuso do perfil para “hoje”. Busca geral do Orbit continua restrita aos módulos já indexados; foco é acessível pela navegação própria.

## Interface

Paleta e shell derivados de `orbit_h_bitos_consist_ncia` e do dashboard Stitch. A ilha e árvores são SVG locais, com animação leve e preferência por movimento reduzido respeitada. As novas formas orgânicas, cores de folhagem, sete destinos de navegação móvel e componente de crescimento são extensões autorizadas para esta nova tela, registradas no design.json. Sem dependências novas. Textos pt-BR/en-US/de-DE; dados livres e exemplos fictícios mantêm sua língua original.

## Operação e validação

Migração aditiva `d904f0c05123`, mesma instalação Docker/Render e banco Neon. Nenhuma variável ou conta nova. Executar backup, migração e deploy manual conforme `infra/render/DEPLOY-PT-BR.md`.

Regenerar demo somente offline por `python -m app.export_demo_template` a partir do diretório backend. Dados novos aparecem em novas demonstrações ou após reinício explícito da demo atual. Não alterar dados pessoais ao atualizar exemplos.

Testes: `backend/tests/test_focus.py`, teste de limite SQL de demo, `focusClock.test.ts`, `FocusProvider.test.tsx` e `web/e2e/focus.spec.ts`. O teste de conclusão usa um minuto real enquanto outra página do Orbit está aberta; não existe atalho de premiação em produção.

Operação Neon: usar a conexão direta (host sem `-pooler`) para pg_dump e Alembic. A conexão agrupada é reservada ao aplicativo; ferramentas de manutenção podem alterar o search_path da sessão.
