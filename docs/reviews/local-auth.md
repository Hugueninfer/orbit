# Revisão do login local — 2026-09-03

Escopo: substituição da dependência obrigatória de Auth0 por login pessoal local, mantendo demo isolada e OIDC opcional. Revisão independente somente leitura pelo revisor `local_auth_review`.

Dois achados importantes foram corrigidos e reavaliados:

- O modelo de entrada herdava remoção de espaços. Agora preserva a senha integralmente; somente o e-mail é normalizado. O teste HTTP com senha contendo espaços falhou antes da correção e passou depois.
- A resposta de conta bloqueada revelava sua existência. Agora realiza o mesmo hash fictício e retorna o mesmo 401 genérico de conta inexistente; 429 é reservado ao limite global. Há regressão para resposta, ausência de Retry-After e persistência do bloqueio.

Revisor confirmou o fechamento dos dois pontos, sem outros achados Critical/Important. Senhas reais e contas online não foram criadas durante a validação. A conta de navegador é fictícia e existe somente na instalação local isolada de teste.
