import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A fresh browser creates only its own fictional demo; no personal login is used.
const baseURL = process.env.ORBIT_BASE_URL ?? 'http://127.0.0.1:8080';
const output = fileURLToPath(new URL('../../docs/screenshots/showcase/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  baseURL, viewport: { width: 1440, height: 1000 },
  locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: 'reduce',
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
page.setDefaultNavigationTimeout(120000);
let demoToken;
async function settle() {
  await expect(page.getByText('Carregando sua órbita…', { exact: true })).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}
async function shot(name, fullPage = false) {
  await settle();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${output}${name}.png`, fullPage, animations: 'disabled' });
  console.log(`Captured ${name}`);
}
async function route(path) {
  await page.goto(path);
  await expect(page.locator('main#content')).toBeVisible();
  await settle();
}
try {
  await page.goto('/demo');
  await expect(page.getByRole('button', { name: 'Experimentar demonstração', exact: true })).toBeVisible();
  await shot('01-login');
  await page.getByRole('button', { name: 'Experimentar demonstração', exact: true }).click();
  await expect(page.getByText('FOCO DO DIA', { exact: true })).toBeVisible({ timeout: 120000 });
  demoToken = await page.evaluate(() => JSON.parse(sessionStorage.getItem('orbit.demo')).access_token);
  await shot('02-dashboard');
  for (const [path, name] of [
    ['/tarefas', '03-tasks'], ['/habitos', '04-habits'], ['/financas', '05-finance'],
    ['/treinos', '08-workouts'], ['/foco', '11-focus'], ['/configuracoes', '13-settings'],
    ['/integracoes', '14-telegram'],
  ]) {
    await route(path);
    await shot(name, path === '/foco');
  }
  await route('/financas');
  await page.getByRole('button', { name: 'Faturas', exact: true }).click();
  const openInvoice = page.getByRole('button', { name: 'Abrir', exact: true }).first();
  if (await openInvoice.count()) {
    await openInvoice.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  await shot('06-invoice');
  await page.keyboard.press('Escape');
  await route('/financas?new=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cartão', exact: true }).click();
  await shot('07-credit-purchase');
  await page.keyboard.press('Escape');
  await route('/treinos');
  await page.getByRole('button', { name: 'Retomar treino', exact: true }).click();
  await expect(page.getByLabel('Carga da série 1', { exact: true })).toBeVisible();
  await shot('09-workout-session');
  await route('/notas');
  await page.locator('.note-preview').first().click();
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota', exact: true })).toBeVisible();
  await shot('10-journal');
  await route('/foco');
  await page.getByRole('button', { name: 'Sortear e focar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible();
  await shot('12-focus-active');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, name] of [
    ['/', '15-mobile-dashboard'], ['/tarefas', '16-mobile-tasks'],
    ['/habitos', '17-mobile-habits'], ['/foco', '18-mobile-focus'],
  ]) {
    await route(path);
    await shot(name);
  }
  await route('/notas');
  await page.locator('.note-preview').first().click();
  await expect(page.getByRole('textbox', { name: 'Conteúdo da nota', exact: true })).toBeVisible();
  await shot('19-mobile-notes');
} finally {
  if (!demoToken) demoToken = await page.evaluate(() => {
    const demo = sessionStorage.getItem('orbit.demo');
    return demo ? JSON.parse(demo).access_token : undefined;
  }).catch(() => undefined);
  if (demoToken) {
    const result = await context.request.post('/api/v1/auth/demo/logout', {
      headers: { Authorization: `Bearer ${demoToken}`, 'X-Orbit-CSRF': '1' },
    });
    if (!result.ok()) console.warn(`Demo logout returned ${result.status()}; expiry still applies.`);
  }
  await browser.close();
}
