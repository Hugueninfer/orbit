# Orbit — entrega do projeto

O núcleo do Orbit foi implementado como um único projeto: interface React/TypeScript, API Python/FastAPI e PostgreSQL, empacotados para execução por Docker Compose. A instalação demo e a pessoal usam o mesmo código, com bancos e autenticação separados.

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
- Preferências de fuso, início de semana e unidade de carga; login pessoal OIDC com PKCE.

## Portfólio e operação

O repositório inclui testes com PostgreSQL real, jornadas de navegador em desktop/celular, tipos gerados do OpenAPI, migrations, logs estruturados, IDs de requisição, backup/restauração isolada, CI e publicação da mesma imagem validada. Há um laboratório Terraform para AWS, sem recursos criados nem obrigação de manter infraestrutura paga.

As 19 telas Stitch e o JSON visual estão preservados em [docs/design](design/LEIA-ME.md). A especificação original integral está em `docs/original/`. As [adaptações visuais](design-deviations.md) estão registradas; conteúdo e proporções responsivas diferem dos mockups.

## O que ainda depende de configuração externa

Você já tem GitHub. Para o caminho online preparado, faltam Render, Neon e um provedor OIDC, como Auth0. O [guia de publicação](../infra/render/README.md) descreve os passos para duas instalações online gratuitas dentro das cotas dos provedores. Serviços gratuitos podem dormir e compartilham limites; não há promessa de disponibilidade contínua sem custo.

O fluxo completo de Telegram/áudio é uma integração opcional ainda incompleta: há estrutura de captura, processamento e simulação, mas faltam conversas de esclarecimento, ações dos recibos e validação com os serviços reais. Não use essa integração como automação financeira pessoal em produção nesta versão.

Validação concluída: **53 testes do backend no container Python3.14/PostgreSQL18, 6 testes de regras da interface e 8 jornadas de navegador em desktop/celular**. Login pessoal, renovação silenciosa, persistência e restauração de backup também foram exercitados localmente.

Consulte [as evidências de validação](validation.md) e o [README técnico](../README.md).
