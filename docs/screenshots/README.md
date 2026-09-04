# Prints do README

As imagens em `showcase/` são capturas reais de uma demonstração fictícia e isolada do Orbit. Nenhuma conta pessoal é usada. O script encerra o próprio token ao terminar; se a execução for interrompida, a expiração normal da demo continua valendo.

- Captura atual: **4 de setembro de 2026**, aplicação publicada com o commit `42e967e`.
- Galeria: **19 PNGs**, sendo 14 capturas desktop e 5 mobile.
- Desktop: viewport 1440 × 1000; jardim capturado em página completa.
- Mobile: viewport 390 × 844, em Chromium. É uma visualização responsiva, não uma captura de aplicativo nativo.
- Idioma: pt-BR; fuso: America/Sao_Paulo; movimento reduzido ativado.
- Dados: fixture fictícia da demo; datas e ordem das árvores variam a cada captura.

As imagens antigas fora de `showcase/` foram preservadas para os documentos que já as referenciam.

Com Chromium instalado pelo Playwright e uma instalação local descartável em execução:

```sh
cd web
npm ci
npx playwright install chromium
ORBIT_BASE_URL=http://127.0.0.1:8080 node scripts/capture-readme.mjs
```

Para atualizar a galeria pública, aponte `ORBIT_BASE_URL` para a instalação a ser documentada. Revise todas as imagens antes de versioná-las. A captura cria dados somente dentro da demonstração temporária iniciada pelo navegador.
