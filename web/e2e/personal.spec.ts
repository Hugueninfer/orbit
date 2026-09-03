import { test, expect } from "@playwright/test";

const personalUrl = process.env.ORBIT_PERSONAL_URL;
test.skip(!personalUrl, "Set ORBIT_PERSONAL_URL to the isolated personal test installation");

test("personal password login, reload, persistence and logout", async ({ page }) => {
  await page.goto(personalUrl!);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  await page.getByLabel("E-mail profissional ou pessoal").fill("browser@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Orbit browser test password 2026");
  await page.getByRole("button", { name: "Mostrar senha", exact: true }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha", exact: true }).click();
  await page.getByRole("button", { name: "Entrar no Orbit" }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const created = await fetch("/api/v1/task-lists", { method: "POST", headers: { "Content-Type": "application/json", "X-Orbit-CSRF": "1" }, body: JSON.stringify({ name: "Browser persistence" }) });
    return { status: created.status, id: (await created.json()).id };
  });
  expect(result.status).toBe(201);
  await page.reload();
  const rows = await page.evaluate(async () => (await fetch("/api/v1/task-lists")).json());
  expect(rows.some((row: { id: string }) => row.id === result.id)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("orbit_session");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.goto(`${personalUrl}/configuracoes`);
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  expect(await page.evaluate(async () => (await fetch("/api/v1/me")).status)).toBe(401);
});

test("personal login reports invalid credentials", async ({ page }) => {
  await page.goto(personalUrl!);
  await page.getByLabel("E-mail profissional ou pessoal").fill("browser@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("incorrect password");
  await page.getByRole("button", { name: "Entrar no Orbit" }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha inválidos.");
});
