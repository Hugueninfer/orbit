# Correção da jornada financeira E2E — 2026-09-04

O GitHub Actions do commit `383afb0` passou por build, testes unitários, auditorias e contratos, mas falhou em `npm run e2e`. A reprodução local usou PostgreSQL descartável e a imagem Docker da mesma versão da aplicação, sem dados pessoais.

## Causas reproduzidas

1. O teste usava `selectOption()` no cartão e na frequência, mas o controle visível passou a ser um combobox Radix. A falha era `Element is not a <select> element`.
2. O teste ainda procurava a aba `Compras`, renomeada para `No crédito`.
3. Ao avançar nesses passos, a versão mobile revelou overflow real na linha da compra: valores, status e ações excediam a largura disponível. O documento chegava a 414 px para um viewport de 390 px; abrir a edição nesse estado alterava o posicionamento do modal e impedia o clique normal de confirmação.

## Correções

- Selecionar opções pelos controles acessíveis e visíveis, verificando o texto selecionado.
- Usar o nome atual da aba, preservando as verificações de parcelamento, edição, pagamento parcial e recorrência.
- Permitir quebra das linhas de compra no mobile, com descrição ao lado do ícone e demais informações/ações nas linhas seguintes. A alteração é específica de `purchase-row`; o layout desktop permanece o mesmo.
- Verificar a largura do documento antes de abrir o modal, para detectar a regressão na origem.
- Publicar anotações do Playwright diretamente no GitHub e preservar o relatório HTML junto dos traces e screenshots em caso de falha.

## Evidência

A suíte original reproduziu duas falhas financeiras (desktop/mobile), com 17 cenários aprovados e um skip intencional. A nova asserção de largura falhou antes da correção CSS. Após a correção, o build Docker e os dois cenários financeiros completos passaram, incluindo o clique normal em Confirmar transação no celular. Nenhum `force`, pausa arbitrária ou aumento de timeout foi acrescentado.

Comando da validação financeira, contra a instalação local descartável:

```sh
cd web
CI=true ORBIT_BASE_URL=http://127.0.0.1:58080 npm run e2e -- --grep 'card purchase editing'
```

O teste de um minuto completo de foco é executado no desktop e permanece intencionalmente ignorado no mobile; a jornada responsiva do jardim é testada separadamente nos dois formatos.
