import { test, expect } from "@playwright/test";

const personalUrl =
  process.env.ORBIT_PERSONAL_URL ??
  process.env.ORBIT_BASE_URL ??
  "http://127.0.0.1:5173";

test("personal password login, reload, persistence and logout", async ({
  page,
}) => {
  await page.goto(personalUrl!);
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeVisible();
  await page
    .getByLabel("E-mail profissional ou pessoal")
    .fill("browser@example.com");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Orbit browser test password 2026");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  await page.getByRole("button", { name: "Entrar no Orbit" }).click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const created = await fetch("/api/v1/task-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Orbit-CSRF": "1" },
      body: JSON.stringify({ name: "Browser persistence" }),
    });
    return { status: created.status, id: (await created.json()).id };
  });
  expect(result.status).toBe(201);
  await page.reload();
  const rows = await page.evaluate(async () =>
    (await fetch("/api/v1/task-lists")).json(),
  );
  expect(rows.some((row: { id: string }) => row.id === result.id)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "orbit_session",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.goto(`${personalUrl}/configuracoes`);
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () => (await fetch("/api/v1/me")).status),
  ).toBe(401);
});

test("personal login reports invalid credentials", async ({ page }) => {
  await page.goto(personalUrl!);
  await page
    .getByLabel("E-mail profissional ou pessoal")
    .fill("browser@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("incorrect password");
  await page.getByRole("button", { name: "Entrar no Orbit" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos.",
  );
});

test("demo tab stays isolated from an owner cookie through reset, logout and expiration", async ({
  page,
  context,
}) => {
  await page.goto(personalUrl);
  await page
    .getByLabel("E-mail profissional ou pessoal")
    .fill("browser@example.com");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("Orbit browser test password 2026");
  await page.getByRole("button", { name: "Entrar no Orbit" }).click();
  await expect(page.locator(".sidebar .user-link small")).toHaveText(
    "Central pessoal",
  );
  const owner = await page.evaluate(async () =>
    (await fetch("/api/v1/me")).json(),
  );
  const demo = await context.newPage();
  let created = 0;
  demo.on("request", (request) => {
    if (request.url().endsWith("/auth/demo") && request.method() === "POST")
      created++;
  });
  await demo.goto(`${personalUrl}/demo`);
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  expect(created).toBe(0);
  await demo.getByRole("button", { name: "Experimentar demonstração" }).click();
  await expect(demo.locator(".demo-banner")).toBeVisible();
  expect(created).toBe(1);
  const demoProfile = await demo.evaluate(async () => {
    const token = JSON.parse(
      sessionStorage.getItem("orbit.demo")!,
    ).access_token;
    return (
      await fetch("/api/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json();
  });
  expect(demoProfile.is_demo).toBe(true);
  expect(demoProfile.id).not.toBe(owner.id);
  await demo.goto(`${personalUrl}/configuracoes`);
  await demo.getByRole("button", { name: "Restaurar minha demo" }).click();
  await demo
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar" })
    .click();
  await expect(demo.getByRole("dialog")).toHaveCount(0);
  await demo.getByRole("button", { name: /Sair/ }).click();
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  await demo.reload();
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  await demo.getByRole("button", { name: "Experimentar demonstração" }).click();
  await expect(demo.locator(".demo-banner")).toBeVisible();
  await demo.evaluate(() => {
    const stored = JSON.parse(sessionStorage.getItem("orbit.demo")!);
    stored.expires_at = "2000-01-01";
    sessionStorage.setItem("orbit.demo", JSON.stringify(stored));
  });
  await demo.reload();
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  await demo.getByRole("button", { name: "Experimentar demonstração" }).click();
  await expect(demo.locator(".demo-banner")).toBeVisible();
  await demo.evaluate(() => {
    sessionStorage.setItem(
      "orbit.demo",
      JSON.stringify({
        access_token: "invalid-demo-token",
        expires_at: "2099-01-01",
      }),
    );
  });
  await demo.reload();
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  await demo.reload();
  await expect(
    demo.getByRole("button", { name: "Experimentar demonstração" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".sidebar .user-link small")).toHaveText(
    "Central pessoal",
  );
  expect(
    await page.evaluate(async () => (await fetch("/api/v1/me")).json()),
  ).toMatchObject({ id: owner.id, is_demo: false });
  await demo.close();
});
