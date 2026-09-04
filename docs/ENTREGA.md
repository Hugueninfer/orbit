# Orbit — entrega do projeto

O núcleo do Orbit foi implementado como um único projeto: interface React/TypeScript, API Python/FastAPI e PostgreSQL, empacotados para execução por Docker Compose. A conta pessoal e as demos temporárias usam a mesma instalação/URL e o mesmo banco, com dados isolados por proprietário.

## Abrir agora

Nesta máquina, a demonstração está em **http://localhost:8080**. Escolha **Experimentar demonstração**. Cada visitante recebe um espaço de dados fictícios, com validade de 24 horas; reiniciar o navegador não transforma a demo em uma conta pessoal.

A instalação pessoal de desenvolvimento está em **http://localhost:8082**, com Keycloak local. Ela foi usada apenas com uma conta fictícia de validação. Para configurar sua identidade real, siga o [manual de operação](runbook.md).

Esses endereços são locais. Nenhuma URL pública foi publicada.

## Rodar em outra máquina

Na raiz deste projeto:

```sh
cp .env.example .env
docker compose up -d --build --wait
```

Abra `http://localhost:8080`. Docker e Compose são os únicos requisitos do caminho principal; não é necessário instalar Python ou Node na máquina. O volume do PostgreSQL preserva os dados. Não use `down -v` para dados que pretende manter.

## Funcionalidades disponíveis

- Visão geral com dados reais do usuário, prioridades, hábitos, saldos e próximos vencimentos.
- Tarefas, listas, prioridades, tags, checklist, filtros, arquivamento e restauração.
- Hábitos por agenda, metas quantitativas, registros parciais, calendário, aderência e sequências; mudanças preservam o histórico.
- Contas, categorias, despesas/receitas, transferências, previsões e recorrências com geração automática.
- Cartões, parcelamento exato em centavos, faturas, pagamentos parciais, edição antes do fechamento e estornos auditáveis.
- Rotinas de treino, séries, cargas, repetições, RPE/RIR opcionais, descanso, histórico e recordes.
- Preferências de fuso, início de semana e unidade de carga; login pessoal com e-mail/senha próprio e OIDC opcional.

## Portfólio e operação

O repositório inclui testes com PostgreSQL real, jornadas de navegador em desktop/celular, tipos gerados do OpenAPI, migrations, logs estruturados, IDs de requisição, backup/restauração isolada, CI e publicação da mesma imagem validada. Há um laboratório Terraform para AWS, sem recursos criados nem obrigação de manter infraestrutura paga.

As 19 telas Stitch e o JSON visual estão preservados em [docs/design](design/LEIA-ME.md). A especificação original integral está em `docs/original/`. As [adaptações visuais](design-deviations.md) estão registradas; conteúdo e proporções responsivas diferem dos mockups.

## O que ainda depende de configuração externa

O caminho online usa GitHub, Render e Neon. A pedido do usuário, Auth0 deixou de ser necessário; o Orbit oferece login próprio com conta criada por comando administrativo. O [guia de publicação](../infra/render/README.md) descreve os passos para uma instalação online no plano gratuito dentro das cotas dos provedores. Serviços gratuitos podem dormir e compartilham limites; não há promessa de disponibilidade contínua sem custo.

A integração opcional Telegram agora recebe áudio, extrai despesas pelo Gemini, conversa para preencher campos ausentes e registra usando os serviços financeiros do Orbit. O worker roda junto da aplicação. Um áudio sintético em português foi validado na API real do Gemini; o teste final pelo chat depende de vincular o Telegram pessoal. A correção de lançamentos é feita no Orbit; botões de edição/estorno no recibo ainda não foram implementados. Consulte `docs/telegram.md`.

Validação concluída: **53 testes do backend no container Python3.14/PostgreSQL18, 6 testes de regras da interface e 8 jornadas de navegador em desktop/celular**. Login pessoal, renovação silenciosa, persistência e restauração de backup também foram exercitados localmente.

Consulte [as evidências de validação](validation.md) e o [README técnico](../README.md).
