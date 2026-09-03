import { test, expect } from "@playwright/test";

test("demo journey persists tasks, habits, money and workout sets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Boa (tarde|noite)|Bom dia/ }),
  ).toBeVisible();
  await page.goto("/tarefas?new=1");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título da tarefa").fill("Validar minha órbita");
  await dialog
    .getByRole("button", { name: "Criar tarefa", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Validar minha órbita", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Concluir Validar minha órbita", exact: true })
    .click();
  await page.getByRole("button", { name: "Concluídas", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Reabrir Validar minha órbita",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/habitos");
  await page
    .getByRole("button", { name: "Registrar Beber água", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel(/Quantidade/)
    .fill("8");
  await page
    .getByRole("button", { name: "Salvar check-in", exact: true })
    .click();
  await expect(
    page.getByText("8 copos registrados", { exact: true }),
  ).toBeVisible();
  await page.goto("/financas?new=1");
  await page
    .getByRole("dialog")
    .getByLabel("Valor da operação · BRL")
    .fill("12,34");
  await page
    .getByRole("dialog")
    .getByLabel("Descrição", { exact: true })
    .fill("Café de teste");
  await page
    .getByRole("button", { name: "Confirmar transação", exact: true })
    .click();
  await expect(page.getByText("Café de teste", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Café de teste", { exact: true })).toBeVisible();
  await page.goto("/treinos");
  await page
    .getByRole("button", { name: "Retomar treino", exact: true })
    .click();
  await page.getByLabel("Carga da série 1", { exact: true }).fill("32");
  await page.getByLabel("Repetições da série 1", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Salvar série 1", exact: true })
    .click();
  await expect(
    page.getByText("Série registrada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Carga da série 1", { exact: true }),
  ).toHaveValue("32");
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await page
    .getByRole("button", { name: "Concluir sessão", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resumo da sessão", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("all routes fit viewport and drawers retain keyboard focus", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await expect(page.getByText("FOCO DO DIA", { exact: true })).toBeVisible();
  for (const path of [
    "/",
    "/tarefas",
    "/habitos",
    "/financas",
    "/treinos",
    "/configuracoes",
    "/integracoes",
    "/pagina-inexistente",
  ]) {
    await page.goto(path);
    await expect(page.locator("main#content")).toBeVisible();
    await expect(page.getByText("Carregando sua órbita…")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBeTruthy();
  }
  await page.goto("/tarefas?new=1");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
