import { expect, test } from "@playwright/test";

test("garden is responsive, persists timer across navigation and reload, pauses and cancels", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: info.project.name === "mobile" ? "Foco" : "Jardim de Foco",
      exact: true,
    })
    .click();
  await expect(page.locator(".garden-plot")).toHaveCount(10);
  await page
    .getByLabel("No que você quer focar?")
    .fill("Construir algo bonito");
  await page.getByLabel("Tempo de foco", { exact: true }).fill("1");
  await page.screenshot({
    path: `test-results/focus-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Sortear e focar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: info.project.name === "mobile" ? "Notas" : "Notas & Diário",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: "Abrir Jardim de Foco" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Abrir Jardim de Foco" }).click();
  await expect(page.getByText("Construir algo bonito").first()).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  for (const [option, title] of [
    ["English", "Your little ritual"],
    ["Deutsch", "Dein kleines Ritual"],
  ]) {
    await page.locator("header .topbar-language").click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator("header .topbar-language")).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `test-results/focus-active-${info.project.name}.png`,
    fullPage: false,
  });
  await page.locator("header .topbar-language").click();
  await page.getByRole("option", { name: "Português", exact: true }).click();
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retomar foco", exact: true }),
  ).toBeVisible();
  const paused = await page.getByRole("timer").textContent();
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText(paused!);
  await page.getByRole("button", { name: "Retomar foco", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Encerrar sessão", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sortear e focar", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".garden-plot")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Reiniciar sorteio", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator(".tree-draw-status")).toContainText("0 / 10");
  await expect(page.locator(".garden-plot")).toHaveCount(10);
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(page.getByText("Interrompido", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
});

test("a full minute grows one tree while using another Orbit page", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Same server clock; responsive flow covered above.",
  );
  test.setTimeout(100000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Experimentar demonstração", exact: true })
    .click();
  await page.getByRole("link", { name: "Jardim de Foco", exact: true }).click();
  await page.getByLabel("Tempo de foco", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Sortear e focar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pausar", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notas & Diário", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Abrir Jardim de Foco" }),
  ).toHaveText("Colheita pronta", { timeout: 75000 });
  await page.getByRole("link", { name: "Abrir Jardim de Foco" }).click();
  await expect(page.locator(".garden-plot")).toHaveCount(11);
  await expect(
    page.getByRole("button", { name: "Fazer intervalo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fazer intervalo", exact: true })
    .click();
  await expect(
    page.getByText("Respire um pouco", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Encerrar sessão", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator(".garden-plot")).toHaveCount(11);
  await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
});
