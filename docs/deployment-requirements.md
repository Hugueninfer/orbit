# Orbit — Portfólio, uso pessoal e deploy econômico

Diretriz registrada em 3 de setembro de 2026. Complementa a especificação funcional v1.1 e a referência visual Stitch. Nenhuma infraestrutura foi provisionada; as opções de provedores abaixo são recomendações, não serviços já contratados ou implementados.

## Prioridades estabelecidas pelo usuário

1. O Orbit é, acima de tudo, um projeto de portfólio que demonstra capacidade de desenvolvimento ponta a ponta.
2. Também deve funcionar para uso pessoal diário, com dados persistentes, confiabilidade e boa experiência mobile.
3. Simplicidade de implementação, manutenção e operação orienta as decisões.
4. Priorizar custo recorrente zero; uma assinatura ou serviço pago não pode ser indispensável para executar o núcleo do projeto.
5. Execução e deploy por Docker são requisitos obrigatórios, não apenas comodidades do ambiente de desenvolvimento.
6. Prever uma conta/experiência demo para avaliadores e testes, com dados fictícios e isolados dos dados pessoais.
7. Demonstrar conhecimento de AWS de forma proporcional ao objetivo e ao orçamento.

## Arquitetura recomendada

Preservar React/TypeScript/Vite, FastAPI, PostgreSQL e monólito modular. O diferencial estará nas regras de negócio, nos testes e na operação verificável.

Para simplificar hospedagem, oferecer uma imagem de aplicação com build em múltiplos estágios: compilar a SPA e copiar seus arquivos estáticos para a imagem Python. A aplicação pode entregar a SPA e a API no mesmo domínio. Frontend e backend continuam separados no código e no contrato REST; o empacotamento conjunto é uma opção de deploy, não acoplamento das regras de domínio ao React. Validar assets, fallback de rotas SPA e precedência de `/api/v1` e health checks.

No desenvolvimento, manter Vite e API com seus fluxos de hot reload. No deploy, executar artefatos compilados. PostgreSQL e provedor de identidade permanecem serviços separados, nunca processos embutidos no mesmo container da aplicação.

A imagem deve aceitar configuração em runtime para conexão de banco, OIDC, URL pública e funcionalidades opcionais. Segredos não podem entrar no build da SPA, em layers Docker, no seed público ou no repositório. Mudanças de ambiente não devem exigir alterações de código.

## Caminhos de execução

| Ambiente | Composição proposta | Objetivo e limite |
|---|---|---|
| Local/dev | Docker Compose, app, PostgreSQL e Keycloak | Ambiente reproduzível sem contas cloud ou serviços pagos para o núcleo |
| Uso pessoal online | Mesma imagem Docker em hospedagem online, PostgreSQL persistente e OIDC; instalação separada da demo | Acesso HTTPS pelo celular e computador; plano gratuito sujeito a suspensão/cotas |
| Demo pública | Imagem Docker no Render Free, PostgreSQL Neon Free e OIDC Auth0 Free | URL para avaliadores; sujeita a cold start e cotas; dados exclusivamente fictícios |
| Laboratório AWS | Mesma imagem em EC2, provisionamento Terraform, identidade/permissões e acesso controlados | Evidência de deploy cloud; ativação pontual, custo/eligibilidade conferidos e destruição planejada |

Render + Neon + Auth0 é a proposta inicial para a demo, por preservar Docker, PostgreSQL e OIDC sem hospedar Keycloak em uma instância pequena. Não é compromisso irreversível com fornecedores. Domínios gratuitos dos serviços são suficientes; domínio próprio não é pré-requisito.

Para uso pessoal remoto com disponibilidade contínua, será preciso avaliar a máquina disponível e o acesso seguro ou aceitar as limitações de um plano gratuito. Não prometer disponibilidade 24/7 de produção em serviços gratuitos voltados a hobby/demo.

## Condições dos planos consultados

Consulta realizada em 2026-09-03. Revalidar no momento do deploy e registrar os limites efetivos da conta, região e plano.

- Render suporta build por Dockerfile e imagens prontas de registry. A instância Free dorme após 15 minutos sem tráfego e pode demorar cerca de um minuto para retomar. O disco é efêmero e o Postgres gratuito do próprio Render expira em 30 dias; por isso, usar banco persistente externo para a demo. Sem meio de pagamento, ultrapassar determinadas cotas suspende serviços/builds em vez de cobrar. Não usar pings artificiais para contornar o comportamento de suspensão. [Docker no Render](https://render.com/docs/docker), [Limites Free](https://render.com/docs/free).
- Neon anuncia Free sem prazo de teste, com 0,5 GB por projeto e 100 CU-horas mensais por projeto. A suspensão por inatividade reduz consumo. Logs de domínio, histórico e seed precisam caber nas cotas; backup próprio continua necessário. [Preços Neon](https://neon.com/pricing).
- Auth0 anuncia Free a US$ 0 e até 25 mil usuários ativos mensais. Usar somente os recursos incluídos; MFA avançado, customizações e outros extras não devem ser presumidos gratuitos. [Preços Auth0](https://auth0.com/pricing).
- GitHub Actions é gratuito em runners padrão para repositórios públicos; retenção de artefatos e caches deve ser limitada. O armazenamento e tráfego do Container Registry estão atualmente gratuitos, sujeitos à política publicada. [Runners GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [Container Registry](https://docs.github.com/en/billing/concepts/product-billing/github-packages).
- O Free Plan atual da AWS para novos clientes concede créditos e termina em até seis meses ou quando eles acabam. Não é uma garantia de EC2 gratuito permanente, e contas existentes podem ter regras diferentes. [AWS Free Tier](https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/).

## AWS com propósito de portfólio

Começar com uma infraestrutura pequena, reproduzível por Terraform: EC2 executando Docker Compose, Security Groups mínimos, IAM de menor privilégio e acesso administrativo controlado. Caso o pipeline autentique na AWS, preferir federação OIDC do GitHub a chaves permanentes. HTTPS, persistência e procedimento de restauração são parte da demonstração, não detalhes adiados.

Demonstrar o ciclo: provisionar → implantar imagem versionada → aplicar migration controlada → verificar health/fluxo → registrar evidências → remover recursos do laboratório quando concluído. Imagem publicada no GHCR pode ser reutilizada; não introduzir ECR apenas para acrescentar outro serviço.

Antes de executar, estimar todos os recursos do desenho escolhido, inclusive volume, endereço IP, tráfego, snapshots, DNS e logs quando aplicáveis. Desligar EC2 não equivale a remover todos os recursos cobrados. Terraform state fica fora do repositório e precisa ser tratado como dado sensível.

Um orçamento/alerta ajuda a acompanhar consumo, mas não é um teto rígido: cobranças podem ultrapassar o aviso antes que ele seja emitido. Não depender desse mecanismo para garantir custo zero em conta paga. [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html).

A arquitetura AWS extensa de referência mencionada na v1.1 (ECS/Fargate, ALB, RDS e componentes adicionais) deixa de ser uma exigência da primeira release. Pode permanecer como estudo de evolução, se útil. Kubernetes, microsserviços, NAT Gateway e balanceadores não entram no caminho mínimo por valor curricular abstrato.

Terraform validado localmente não equivale a deploy validado na AWS. Se não houver execução real, o README deve dizer que se trata de uma arquitetura preparada, sem alegar operação já demonstrada.

## Experiência demo

Recomendação: entrada evidente “Experimentar demonstração”, com dados fictícios coerentes e acesso às jornadas principais. O mecanismo de autenticação da demo será definido junto ao módulo Identity; não introduzir um bypass de autorização no ambiente pessoal.

- Separar a instalação/banco e as credenciais da demo dos dados pessoais. Mesmo na demo, aplicar ownership normalmente.
- Preferir uma sessão temporária com conjunto de dados por visitante para evitar que avaliadores apaguem ou alterem o trabalho uns dos outros. Uma conta demo compartilhada é uma alternativa mais simples, mas precisa deixar explícito que o estado é compartilhado e pode ser reiniciado.
- Seed determinístico e versionado: tarefas pendentes/concluídas, hábitos com histórico, compra parcelada, fatura parcialmente paga e treino anterior.
- Ancorar datas demonstrativas em um relógio/data de referência definido, para que o cenário continue útil meses depois e os testes sejam reproduzíveis.
- Permitir criar tarefa, fazer check-in, simular compra e registrar treino, sem acesso a integrações reais, segredos, exportação pessoal ou administração.
- Limitar tamanho e quantidade de registros, duração das sessões e frequência de ações. Expirar dados de demonstração e oferecer reset restrito ao conjunto correto.
- Reset/seed nunca pode operar no banco pessoal: usar credenciais e configuração separadas e uma verificação explícita do ambiente antes de qualquer exclusão.
- O botão e os estados demo devem seguir o JSON visual do Orbit, adicionados sem redesenhar as telas existentes.

## Diferenciais técnicos de maior valor

| Entrega | Evidência para o avaliador | Limite de complexidade |
|---|---|---|
| Regras financeiras sólidas | Propriedades de rateio, ciclos, pagamentos e ausência de dupla contagem | PostgreSQL e transações locais, sem ledger distribuído |
| Segurança por objeto | Testes A×B para todas as operações relevantes | Ownership explícito; RLS só se houver ganho real |
| Concorrência e idempotência | Requisições duplicadas e atualizações simultâneas sem corrupção | Versionamento e constraints do banco |
| Histórico confiável | Rotina editada sem alterar treino passado; check-in recalculado corretamente | Snapshots e regras de datas, sem event sourcing |
| Contrato API | OpenAPI, cliente TypeScript gerado e detecção de divergência no CI | Uma API REST versionada |
| Release reproduzível | Imagem Docker testada, tag de release e digest identificável | Mesmo artefato implantado; evitar reconstrução divergente |
| Entrega segura | Migration controlada e rollback compatível da aplicação | Sem prometer downgrade destrutivo automático do banco |
| Observabilidade útil | Logs estruturados, request ID e trace de um fluxo completo | Collector e painel local opcionais; sem stack pesada sempre ligada |
| Recuperação de dados | Backup e teste de restauração em banco separado | Não confundir volume persistente com backup |
| Qualidade visual/mobile | Comparação com as telas fornecidas e E2E em viewport móvel | Componentes reutilizados, sem criar outro design system paralelo |
| AWS reproduzível | Terraform, fluxo de deploy e evidência real quando executado | Laboratório pequeno, sem despesa permanente obrigatória |

O núcleo desses itens já é coerente com a v1.1. A mudança é torná-los demonstráveis e priorizar os de maior valor, em vez de acrescentar novas ferramentas indiscriminadamente.

CI proposto: lint/typecheck → testes de domínio → integração com PostgreSQL → contrato OpenAPI/cliente → build Docker → E2E crítico → verificação de dependências/imagem → publicação de release. Usar permissões mínimas e disponibilizar segredos de deploy somente em contextos confiáveis. Um scanner integrado é suficiente no começo; evitar várias ferramentas cobrindo o mesmo risco sem benefício.

## Contrato obrigatório de Docker/deploy

Critérios a implementar e verificar; os comandos e arquivos correspondentes ainda não existem nesta fase de planejamento.

- Um comando documentado deve iniciar o ambiente completo após preparar o arquivo de configuração de exemplo.
- Um modo local do núcleo deve funcionar sem credenciais cloud e sem API de IA paga.
- Compose de desenvolvimento e configuração de deploy devem ser distinguíveis; hot reload não é servidor de produção.
- Imagens com build em múltiplos estágios, dependências fixadas, `.dockerignore` e usuário sem privilégios quando compatível.
- Health checks de vida e prontidão; banco com volume persistente; reinício do container não perde os dados.
- Migration executada de maneira controlada e única por release, não em cada réplica sem coordenação.
- Seed de demo explícito e separado de migration e de dados pessoais.
- Configuração de URL/OIDC em runtime para reutilizar o artefato entre ambientes sem incluir segredos no frontend.
- Procedimentos de backup, restauração e atualização com imagem versionada.
- Pipeline deve provar que o container inicia, conversa com PostgreSQL e completa ao menos uma jornada crítica.
- Limites de CPU/memória medidos em carga representativa antes de escolher tamanho de VM; não prometer consumo que ainda não foi medido.

## Jobs e integração de áudio

Não manter Redis, Celery, broker e dashboards consumindo recursos no núcleo se não houver fluxo que os exija. Rotinas como extensão de recorrências devem expor comandos idempotentes executáveis pelo scheduler do host no ambiente Compose; a estratégia compatível com a demo gratuita precisa ser escolhida antes do módulo, sem assumir worker permanente em serviço que dorme.

Telegram continua no marco M10. O produto principal deve funcionar sem essa integração. A demo pode demonstrar cenários gravados e providers falsos de forma claramente identificada, sem alegar transcrição real. A operação real exige solução de processamento e provedor com custo/limite conhecidos ou execução local em hardware disponível, com medição de recursos. Não prometer IA hospedada gratuita ilimitada nem substituir o provedor da v1.1 sem ADR.

Isso preserva o escopo de áudio como evolução planejada, mas impede que custos de transcrição ou de worker bloqueiem o primeiro deploy gratuito.

## Ajuste de prioridades do roadmap

- M0: registrar prioridade de portfólio, contrato Docker, matriz de custos e estratégia de dados demo/pessoais.
- M1: fundação já nasce containerizada e testável no CI.
- M2/M3: identidade, isolamento e tarefas devem produzir a primeira demo pública; não esperar terminar todos os módulos para mostrar o projeto.
- M4–M8: evoluir cenários demo junto a hábitos, finanças, treinos e dashboard; cada release tem uma jornada verificável.
- M9: consolidar backup/restauração, segurança, operação, vídeo, README e laboratório AWS proporcional ao orçamento.
- M10: áudio Telegram, com perfil de processamento e custos explicitados.

## Apresentação pública

README em inglês com demo, screenshot, quick start Docker, arquitetura e decisões principais. Oferecer um roteiro curto: criar tarefa → registrar hábito → conferir parcelas/fatura → registrar série e consultar histórico. Mostrar evidências de testes, pipeline e medição reais; documentar cold start e limites da demo com linguagem simples.

Manter relatórios, diagramas e exemplos técnicos no repositório. Informações como região de cluster, versão de banco, trace e detalhes de infraestrutura não precisam ocupar a interface cotidiana; telas de diagnóstico podem ser próprias para avaliação/desenvolvimento, preservando os componentes visuais aprovados.

## Status das decisões

Confirmado pelo usuário: prioridade de portfólio, uso diário, simplicidade, preferência por gratuidade, Docker obrigatório e necessidade de demo/consideração de AWS.

Recomendado nesta análise: imagem de app com SPA compilada, Render + Neon + Auth0 para demo, Compose em equipamento próprio para uso pessoal sem mensalidade e laboratório AWS mínimo. Validar compatibilidade, elegibilidade e cotas no bootstrap/deploy. Nenhuma conta, publicação, cobrança ou infraestrutura foi criada.

## Requisito posterior confirmado

O uso pessoal também deve ser online, acessível pelo celular. Serão duas instalações/URLs do mesmo projeto (pessoal e demo), com bancos separados. Compose local continua disponível, mas não substitui o requisito online. Desenvolvimento autorizado pelo usuário em 2026-09-03.
