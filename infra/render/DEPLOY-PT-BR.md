# Publicar o Orbit sem Auth0

Um repositório, uma imagem Docker, duas instalações online com bancos separados. Contas necessárias: GitHub, Render e Neon. O modo pessoal tem login próprio com e-mail e senha; a demo abre sem cadastro.

## 1. Gerar a imagem no GitHub

1. Aguarde a verificação da branch `main` ficar verde em **Actions**.
2. Abra https://github.com/Hugueninfer/orbit/releases/new.
3. Crie a tag `v1.0.0`, selecione o destino `main`, título `Orbit v1.0.0` e publique a release.
4. Em **Actions**, abra **Publish approved container** e aguarde sua conclusão.
5. Copie do resumo a linha `Verified deployment image`. O endereço completo terá o formato `ghcr.io/hugueninfer/orbit@sha256:...`.
6. Em **Packages**, abra o pacote `orbit`, depois suas configurações e deixe sua visibilidade pública para o Render conseguir baixar a imagem.

Substitua os dois campos `image.url` do `render.yaml` pelo mesmo endereço completo. Faça commit e push dessa alteração. Não use o texto de exemplo nem invente o digest.

## 2. Preparar os bancos Neon

Você já criou `orbit-demo` e `orbit-personal`. Em cada projeto, abra **Connect** e copie sua própria connection string. Para migrações, use a conexão direta, sem pooling.

Troque apenas o início `postgresql://` por `postgresql+psycopg://`. Preserve usuário, senha, host, banco e todos os parâmetros TLS fornecidos pelo Neon. Não coloque essa URL no GitHub nem na conversa.

Na pasta do Orbit, crie dois arquivos privados. Eles já são ignorados pelo Git.

`.env.deploy-demo`:

```dotenv
APP_MODE=demo
DATABASE_URL=COLE_A_CONEXAO_DO_PROJETO_DEMO
```

`.env.deploy-personal`:

```dotenv
APP_MODE=personal
DATABASE_URL=COLE_A_CONEXAO_DO_PROJETO_PERSONAL
SESSION_COOKIE_SECURE=true
```

Não use aspas ao colar valores nesses arquivos, pois serão lidos por `docker --env-file`. Proteja os arquivos:

```sh
chmod 600 .env.deploy-demo .env.deploy-personal
```

## 3. Criar as tabelas e sua conta

No terminal, na pasta do projeto, substitua `IMAGEM_COM_DIGEST` pelo endereço real da etapa 1:

```sh
bash scripts/migrate-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy-demo
bash scripts/migrate-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy-personal
bash scripts/account-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy-personal create hugueninpedro@gmail.com
```

O último comando pede a senha duas vezes, sem mostrá-la. Escolha entre 15 e 128 caracteres. Essa será a senha para entrar no Orbit, e não a senha do GitHub ou do Neon. Não existe senha padrão, cadastro público ou configuração Auth0.

## 4. Criar os serviços no Render

1. No Render, escolha **New → Blueprint** e conecte `Hugueninfer/orbit`.
2. Use o arquivo `render.yaml` da branch `main`.
3. Confirme o plano **Free** para `orbit-demo` e `orbit-personal`.
4. Preencha `DATABASE_URL` de cada serviço com a conexão do projeto Neon correspondente.
5. Preencha `ALLOWED_ORIGINS` com a origem HTTPS atribuída pelo Render a cada serviço, por exemplo `https://NOME_REAL_DO_SERVICO.onrender.com`, sem barra final. Se a URL definitiva só aparecer após a criação, ajuste esse campo em **Environment** e aplique a atualização antes de testar login.
6. O blueprint já define `APP_MODE` e, no pessoal, `SESSION_COOKIE_SECURE=true`. Não é necessário preencher OIDC.
7. Inicie o deploy. Os dois serviços baixam a mesma imagem verificada; cada um usa seu banco.

O endereço do Render poderá ter um sufixo diferente do nome pedido. Use a URL real exibida pelo serviço. Não use `localhost`, `*` ou a URL da demo em `ALLOWED_ORIGINS` do serviço pessoal.

## 5. Conferir o resultado

- Abra `/api/v1/health` em cada URL: deve retornar `status: ok` e `database: ok`.
- No pessoal, entre com o e-mail e a senha criados no comando administrativo.
- Crie uma tarefa, atualize a página e abra no celular: a tarefa deve continuar lá.
- Na demo, clique em **Experimentar demonstração**. Seus dados pessoais não devem aparecer.
- Teste **Sair**: voltar à página pessoal deve pedir login novamente.

## Trocar ou recuperar a senha

```sh
bash scripts/account-remote.sh 'IMAGEM_COM_DIGEST' .env.deploy-personal reset-password hugueninpedro@gmail.com
```

O comando preserva seus dados e encerra as sessões anteriores. A recuperação depende do acesso administrativo ao banco; não há envio de e-mail.

## Limites gratuitos

O Render adormece após 15 minutos sem acesso e compartilha 750 horas gratuitas mensais entre os serviços. A primeira abertura pode demorar aproximadamente um minuto. Isso não garante duas instalações continuamente ativas. Confira cotas e cobrança na conta antes de habilitar recursos pagos. Use o Neon para persistência, pois o PostgreSQL gratuito do Render expira em 30 dias.

Fontes: [Render Free](https://render.com/docs/free), [publicar uma imagem](https://render.com/docs/deploying-an-image), [conexão Python/Neon](https://neon.com/docs/guides/python).
