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
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(
    page.getByLabel("Carga da série 1", { exact: true }),
  ).toHaveValue("32");
  await page.getByText("Esforço · série 1 (opcional)", { exact: true }).click();
  await page.getByLabel("RPE da série 1", { exact: true }).fill("8");
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
  await page.getByText("Esforço · série 1 (opcional)", { exact: true }).click();
  await expect(page.getByLabel("RPE da série 1", { exact: true })).toHaveValue(
    "8",
  );
  await page.getByLabel("Carga da série 2", { exact: true }).fill("999");
  await page
    .getByRole("button", {
      name: "Descartar alterações da série 2",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Carga da série 2", { exact: true }),
  ).not.toHaveValue("999");
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

test("card purchase editing, partial payment and recurrence creation persist", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await expect(page.getByText("FOCO DO DIA", { exact: true })).toBeVisible();
  await page.goto("/financas");
  await page.getByRole("button", { name: "Novo cartão", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Cartão de validação");
  await dialog.getByLabel("Dia de fechamento").fill("31");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/financas?new=1");
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Cartão", exact: true }).click();
  await dialog
    .getByLabel("Cartão de crédito")
    .selectOption({ label: "Cartão de validação (••0000)" });
  await dialog.getByLabel("Valor da operação · BRL").fill("10,01");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Compra parcelada validada");
  await dialog.getByLabel("Número de parcelas").fill("3");
  await dialog
    .getByRole("button", { name: "Confirmar transação", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Compras", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Editar compra Compra parcelada validada",
      exact: true,
    })
    .click();
  await dialog.getByLabel("Valor da operação · BRL").fill("20,02");
  await dialog
    .getByRole("button", { name: "Confirmar transação", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Compras", exact: true }).click();
  await expect(
    page
      .locator(".transaction-row")
      .filter({ hasText: "Compra parcelada validada" }),
  ).toContainText("20,02");
  await page.getByRole("button", { name: "Faturas", exact: true }).click();
  await page
    .locator(".transaction-row")
    .filter({ hasText: "Cartão de validação" })
    .first()
    .getByRole("button", { name: "Abrir" })
    .click();
  await expect(dialog.getByRole("heading", { name: /6,68/ })).toBeVisible();
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("3,34");
  await dialog
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await expect(dialog.getByRole("heading", { name: /3,34/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Compras", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Editar compra Compra parcelada validada",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.goto("/financas?new=1");
  await dialog.getByLabel("Valor da operação · BRL").fill("42,00");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Recorrência validada");
  await dialog.getByText("Repetir esta transação", { exact: true }).click();
  await dialog
    .getByLabel("Frequência", { exact: true })
    .selectOption("monthly");
  await dialog
    .getByRole("button", { name: "Confirmar transação", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("Recorrência validada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Recorrência validada", { exact: true }),
  ).toBeVisible();
});

test("finance failure is explicit and partial habit notes survive month navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await expect(page.getByText("FOCO DO DIA", { exact: true })).toBeVisible();
  await page.goto("/habitos");
  await page
    .getByRole("button", { name: "Registrar Beber água", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Quantidade/).fill("3");
  await dialog.getByLabel("Como foi hoje?").fill("Registro parcial preservado");
  await dialog
    .getByRole("button", { name: "Salvar check-in", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Mês anterior", exact: true }).click();
  await page.getByRole("button", { name: "Próximo mês", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrar Beber água", exact: true })
    .click();
  await expect(dialog.getByLabel(/Quantidade/)).toHaveValue("3");
  await expect(dialog.getByLabel("Como foi hoje?")).toHaveValue(
    "Registro parcial preservado",
  );
  await page.keyboard.press("Escape");
  await page.route("**/api/v1/transactions", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/problem+json",
      body: JSON.stringify({ detail: "Falha controlada de transações" }),
    }),
  );
  await page.goto("/financas");
  await expect(
    page.getByText("Falha controlada de transações", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("SALDO CONSOLIDADO", { exact: true }),
  ).toHaveCount(0);
});
