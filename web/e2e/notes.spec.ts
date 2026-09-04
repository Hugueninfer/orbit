import { expect, test } from "@playwright/test";

test("journal editor saves formatting, handles offline navigation and works on mobile", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: info.project.name === "mobile" ? "Notas" : "Notas & Diário",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Novo registro", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Título da nota", exact: true })
    .fill("Notas de teste");
  const body = page.getByRole("textbox", {
    name: "Conteúdo da nota",
    exact: true,
  });
  await body.fill("Uma ideia para lembrar");
  // Mobile has native touch selection rather than desktop keyboard shortcuts.
  if (info.project.name === "mobile")
    await body.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
  else await body.press("Control+a");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "Uma ideia para lembrar",
  );
  await page.getByRole("button", { name: "Negrito", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tamanho da fonte", exact: true })
    .click();
  await page.getByRole("option", { name: "24", exact: true }).click();
  await page.getByLabel("Cor do texto", { exact: true }).click();
  await page.getByRole("button", { name: "#ea8dba", exact: true }).click();
  await expect(page.getByRole("article").getByRole("status")).toHaveText(
    "Salvo",
  );
  await expect(body.locator("strong")).toHaveText("Uma ideia para lembrar");
  await expect(body.locator("span").first()).toHaveCSS(
    "color",
    "rgb(234, 141, 186)",
  );
  await expect(body.locator("span").first()).toHaveCSS("font-size", "24px");
  await page.getByRole('button',{name:'Inserir link',exact:true}).click();
  await page.getByRole('textbox',{name:'Endereço do link',exact:true}).fill('https://example.com');
  await page.getByRole('button',{name:'Aplicar',exact:true}).click();
  await expect(page.getByRole('article').getByRole('status')).toHaveText('Salvo');
  await expect(body.locator('a')).toHaveAttribute('href','https://example.com');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({
    path: `test-results/notes-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  // Simulate a failed save, then attempt a normal sidebar/bottom-nav transition.
  await page.route("**/api/v1/notes/*", async (route) => {
    if (route.request().method() === "PATCH") await route.abort();
    else await route.continue();
  });
  await page
    .getByRole("textbox", { name: "Título da nota", exact: true })
    .fill("Rascunho sem conexão");
  await page
    .getByRole("link", {
      name: info.project.name === "mobile" ? "Tarefas" : "Tarefas 4",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Não foi possível salvar", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/notas$/);
  await expect(
    page.getByRole("textbox", { name: "Título da nota", exact: true }),
  ).toHaveValue("Rascunho sem conexão");
  await page.unroute("**/api/v1/notes/*");
  await page.getByRole("button", { name: "Salvar agora", exact: true }).click();
  await expect(page.getByRole("article").getByRole("status")).toHaveText(
    "Salvo",
  );
  // A reload reads the persisted rich text from PostgreSQL.
  await page.reload();
  await page
    .getByRole("button")
    .filter({ hasText: "Rascunho sem conexão" })
    .click();
  await expect(body.locator("strong")).toHaveText("Uma ideia para lembrar");
  await expect(body.locator("span").first()).toHaveCSS(
    "color",
    "rgb(234, 141, 186)",
  );
  // Clean up only this synthetic visitor via UI.
  await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
});
