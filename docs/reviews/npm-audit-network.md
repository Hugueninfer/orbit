# Auditoria npm: diagnóstico e correção de execução

A release `1.0.0` (commit `71ac8f3`, execução `33828419199`) passou em lint, testes backend, testes frontend e build. A etapa npm audit falhou com código 1 após 301 segundos. O log remoto completo exige autenticação e não estava acessível; o código de saída sozinho não prova a causa.

Reprodução local com o mesmo lockfile: npm 9 retornou `network timeout` no endpoint `security/audits/quick`; Node24/npm11, correspondente ao CI, retornou `network timeout` em `security/advisories/bulk`. O status público do npm indicava operação normal durante a investigação, portanto não se afirma uma indisponibilidade global confirmada.

O runner agora limita tempo, repete apenas falhas de rede e emite uma anotação clara para o GitHub. Relatórios válidos com vulnerabilidades altas/críticas falham imediatamente. Falhas persistentes, configuração inválida e relatórios inválidos nunca liberam publicação. A consulta automática redundante do npm ci foi desativada, mantendo obrigatória a etapa separada de auditoria.

Cinco testes executam o runner real com um executável npm controlado na fronteira externa: recuperação de timeout; vulnerabilidade bloqueada sem retry; indisponibilidade persistente bloqueada após três tentativas; erro de configuração sem retry; relatório inválido com exit0 rejeitado. Todos passaram. Revisão independente não encontrou problemas significativos nesse escopo. Nenhuma dependência ou regra do produto foi alterada.
