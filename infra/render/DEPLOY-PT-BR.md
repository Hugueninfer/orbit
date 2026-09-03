# Publicar o Orbit: uma URL e um banco

Uma imagem Docker, um serviço online e um PostgreSQL. Sua conta entra por e-mail/senha; o botão **Experimentar demonstração** cria um espaço temporário exclusivo para cada visitante no mesmo banco, separado por usuário. Não há Auth0 obrigatório, cadastro público ou tela de administração de usuários.

## 1. Gerar a imagem no GitHub

1. Aguarde a verificação da branch `main` ficar verde em **Actions**.
2. Abra [a criação de releases](https://github.com/Hugueninfer/orbit/releases/new).
3. Crie uma tag ainda não utilizada (por exemplo, `v1.0.0` na primeira publicação), selecione `main`, dê um título e publique a release.
4. Em **Actions**, aguarde **Publish approved container** concluir.
5. Copie do resumo a linha `Verified deployment image`, no formato `ghcr.io/hugueninfer/orbit@sha256:...`.
6. Em **Packages**, abra o pacote `orbit` e deixe sua visibilidade pública nas configurações, para o Render baixar a imagem.

Substitua o campo `image.url` do `render.yaml` pelo endereço completo. Faça commit e push. Não use o texto de exemplo nem invente o digest.

## 2. Preparar um banco Neon

Você já criou `orbit-demo` e `orbit-personal`. Use **somente `orbit-personal`** para esta instalação. O outro projeto pode ficar sem uso; este procedimento não exclui nenhum banco. Se já houver dados pessoais, preserve esse banco e faça backup antes de atualizar. Não há fusão automática dos dois bancos antigos.

No projeto `orbit-personal`, abra **Connect** e copie a connection string direta, sem pooling, para migrações e criação de conta. Troque apenas `postgresql://` por `postgresql+psycopg://`, preservando usuário, senha, host, banco e parâmetros TLS. Não publique essa URL no GitHub nem na conversa.

Na pasta do Orbit, crie o arquivo privado `.env.deploy` (ignorado pelo Git):

```dotenv
APP_MODE=combined
DATABASE_URL=COLE_A_CONEXAO_DO_PROJETO_PERSONAL
SESSION_COOKIE_SECURE=true
```

Não use aspas: o arquivo será lido por `docker --env-file`. Proteja-o:

```sh
chmod 600 .env.deploy
```

## 3. Criar as tabelas e sua conta

Na pasta do projeto, substitua `IMAGEM_COM_DIGEST` pelo endereço real da etapa 1:

```sh
bash scripts/migrate-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy
bash scripts/account-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy create hugueninpedro@gmail.com
```

O segundo comando pede uma senha entre 15 e 128 caracteres duas vezes, sem mostrá-la. Essa será sua senha do Orbit. Não há senha padrão. Se a conta já existe, não tente recriá-la; seus dados e sua senha continuam no banco. A demonstração não precisa de conta criada manualmente.

## 4. Criar um serviço no Render

1. Escolha **New → Blueprint** e conecte `Hugueninfer/orbit`.
2. Use o `render.yaml` da branch `main`.
3. Confirme **um serviço `orbit`**, no plano **Free**.
4. Preencha `DATABASE_URL` com a conexão Neon do banco escolhido, usando o prefixo `postgresql+psycopg://` e TLS.
5. Preencha `ALLOWED_ORIGINS` com a origem HTTPS real do serviço, sem barra final. Se a URL só aparecer depois da criação, ajuste em **Environment** antes de testar login.
6. O blueprint define `APP_MODE=combined` e `SESSION_COOKIE_SECURE=true`. Deixe `OIDC_AUTHORITY` vazio.
7. Inicie o deploy. O serviço baixa a imagem verificada e atende interface e API na mesma URL.

Use a URL atribuída pelo Render, que pode ter um sufixo. Não coloque `localhost` ou `*` em `ALLOWED_ORIGINS`. Se já publicou os serviços antigos, mantenha-os até verificar o novo; não exclua volumes ou bancos para fazer a atualização.

## 5. Conferir no computador e no celular

- Abra `/api/v1/health` na URL: deve retornar `status: ok` e `database: ok`.
- Entre com seu e-mail e senha, crie uma tarefa e atualize a página. Entre na mesma URL pelo celular: a tarefa deve estar lá.
- Em uma janela privada, abra a mesma URL e clique em **Experimentar demonstração**. Só dados fictícios devem aparecer.
- Você também pode compartilhar o caminho `/demo` da mesma URL. Ele abre a tela de entrada sem restaurar automaticamente sua sessão pessoal naquela aba.
- Reinicie a demo em **Configurações** e confira que sua tarefa pessoal continua intacta.
- **Sair** na demo encerra apenas aquela sessão demo. **Sair** na sua conta revoga a sessão pessoal daquele navegador.

Demos expiram em 24 horas por padrão. Dados pessoais não têm essa expiração. A limpeza de demos é limitada aos usuários temporários, mesmo compartilhando o banco.

## Trocar ou recuperar a senha

```sh
bash scripts/account-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy reset-password hugueninpedro@gmail.com
```

Preserva seus dados e encerra sessões pessoais anteriores. A recuperação depende do acesso administrativo ao banco; não há envio de e-mail. Para backups e manutenção, consulte [o runbook](../../docs/runbook.md).

## Planos gratuitos

A aplicação não exige serviço pago para o núcleo. Planos gratuitos têm cotas e podem suspender a aplicação após inatividade; a primeira abertura pode demorar. Confira o plano e os limites atuais na conta antes de confirmar a criação. Use PostgreSQL externo persistente, como o Neon, e mantenha backups. Não há promessa de disponibilidade contínua sem custo.

Referências: [Render Free](https://render.com/docs/free), [publicar uma imagem](https://render.com/docs/deploying-an-image), [conexão Python/Neon](https://neon.com/docs/guides/python).
