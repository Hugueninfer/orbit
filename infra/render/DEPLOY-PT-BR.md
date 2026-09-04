# Publicar diretamente do repositório no Render

Decisão do usuário em 2026-09-04: usar o repositório já publicado e deixar o Render construir o Dockerfile. Não é necessário criar release, publicar imagem no GHCR ou aguardar GitHub Actions. Uma aplicação/URL e um banco continuam atendendo conta pessoal e demos isoladas.

## 1. Preparar o banco e sua conta

No Neon, use apenas `orbit-personal`. Abra **Connect**, selecione conexão direta (sem pooling) e copie a connection string. Troque somente `postgresql://` por `postgresql+psycopg://`, mantendo os parâmetros TLS. Não compartilhe a conexão, que contém senha.

Na pasta do projeto no computador, atualize o código e crie um arquivo privado (ignorado pelo Git):

```sh
git pull --ff-only
umask 077
nano .env.deploy
```

Conteúdo, substituindo o valor da conexão sem aspas:

```dotenv
APP_MODE=combined
DATABASE_URL=COLE_A_CONEXAO_AJUSTADA_DO_NEON
SESSION_COOKIE_SECURE=true
```

Salve com Ctrl+O, Enter e saia com Ctrl+X. Com Docker funcionando, execute na mesma pasta:

```sh
docker build -t orbit:deploy .
bash scripts/migrate-remote.sh orbit:deploy .env.deploy
bash scripts/account-remote.sh orbit:deploy .env.deploy create hugueninpedro@gmail.com
```

O último comando pede uma senha do Orbit duas vezes, sem exibi-la; use 15–128 caracteres. Se as tabelas/conta já existem, não recrie a conta. As migrações podem ser reaplicadas e só executam revisões pendentes. Nenhum projeto Neon precisa ser excluído ou mesclado.

## 2. Criar o serviço no Render

No Render, escolha **New → Web Service**, conecte GitHub e selecione `Hugueninfer/orbit` como repositório de código (não Existing Image).

| Campo | Valor |
|---|---|
| Name | `orbit` |
| Branch | `main` |
| Language / Runtime | `Docker` |
| Root Directory | deixar vazio |
| Dockerfile Path | `./Dockerfile` |
| Instance Type | `Free` |
| Docker Command | deixar vazio; usar o CMD do Dockerfile |
| Health Check Path | `/api/v1/health` |
| Auto-Deploy | desativado; atualizações por Manual Deploy |

Adicione as variáveis:

| Variável | Valor |
|---|---|
| `APP_MODE` | `combined` |
| `DATABASE_URL` | conexão ajustada do Neon |
| `SESSION_COOKIE_SECURE` | `true` |
| `ALLOWED_ORIGINS` | origem HTTPS real do serviço, sem barra final |

Deixe `OIDC_AUTHORITY` vazio. Se a URL só aparecer após criar o serviço, use temporariamente `https://orbit.onrender.com`, depois substitua em **Environment** pela URL atribuída e aplique a atualização antes do login.

Clique em **Deploy Web Service**. O Render compila diretamente o Dockerfile do repositório. Não configure a opção de aguardar verificações do GitHub para esse fluxo.

Alternativa equivalente: **New → Blueprint**, conectar o mesmo repositório e usar `render.yaml` da main. O arquivo já define um serviço Docker Free com construção direta. Escolha apenas um dos dois caminhos para não criar serviços duplicados.

## 3. Conferir

Abra `/api/v1/health` na URL publicada; deve indicar banco saudável. Entre com sua conta, crie uma tarefa e confira no celular após login. Em janela anônima, use **Experimentar demonstração**. O caminho `/demo` é uma entrada pública na mesma URL; dados pessoais e demo continuam isolados.

## Atualizações e senha

Antes de atualizar, faça backup. Construa localmente o mesmo commit que será publicado, aplique migrações e use **Manual Deploy → Deploy latest commit** no Render. Deploy automático fica desligado para permitir essa ordem.

Para trocar a senha preservando os dados e revogando sessões anteriores:

```sh
bash scripts/account-remote.sh orbit:deploy .env.deploy reset-password hugueninpedro@gmail.com
```

GitHub Actions continua como verificação de qualidade independente. O workflow de release/GHCR permanece opcional para quem quiser usar esse outro caminho; não é pré-requisito deste deploy.

Planos gratuitos têm cotas e podem suspender serviços por inatividade. Confira o plano selecionado e mantenha backups; não há promessa de disponibilidade contínua gratuita.

Referências: [Docker no Render](https://render.com/docs/docker), [Web services](https://render.com/docs/web-services), [Blueprint](https://render.com/docs/blueprint-spec).
