import { test, expect } from '@playwright/test';
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).click();
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill('');
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).press('CapsLock');
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill('W');
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).press('CapsLock');
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).fill('Wojtasoxox');
await page.getByRole('textbox', { name: 'Nazwa gracza:' }).press('Tab');
await page.getByRole('textbox', { name: 'Hasło:' }).press('CapsLock');
await page.getByRole('textbox', { name: 'Hasło:' }).fill('P');
await page.getByRole('textbox', { name: 'Hasło:' }).press('CapsLock');
await page.getByRole('textbox', { name: 'Hasło:' }).fill('Pokerface1');
await page.getByRole('link', { name: 'Logowanie' }).click();
await page.locator('iframe[title="Główna treść wyzwania hCaptcha"]').contentFrame().getByRole('button', { name: 'Obraz wyzwania 7' }).click();
await page.locator('iframe[title="Główna treść wyzwania hCaptcha"]').contentFrame().getByRole('button', { name: 'Obraz wyzwania 6' }).click();
await page.locator('iframe[title="Główna treść wyzwania hCaptcha"]').contentFrame().getByRole('button', { name: 'Obraz wyzwania 7' }).click();
await page.locator('iframe[title="Główna treść wyzwania hCaptcha"]').contentFrame().getByRole('button', { name: 'Obraz wyzwania 7' }).click();
await page.locator('iframe[title="Główna treść wyzwania hCaptcha"]').contentFrame().getByRole('button', { name: 'Sprawdź odpowiedzi' }).click();
await page.getByText('Świat 214').click();
await page.locator('area:nth-child(2)').click();
await page.getByRole('cell', { name: 'Wioska wojtasoxox (270 punktów) 5 3 1 1 1 14 14 9 4 9 1', exact: true }).locator('img').nth(1).click();
await page.locator('#content_value').getByRole('table').filter({ hasText: 'Handel Tworzenie ofert Wyślij' }).first().click();
await page.getByRole('link', { name: 'Wioska wojtasoxox' }).click();
await page.locator('area:nth-child(2)').click();
await page.getByRole('link', { name: 'Zbieractwo', exact: true }).click();
await page.locator('input[name="spear"]').click();
await page.locator('input[name="spear"]').fill('463');
await page.locator('input[name="sword"]').click();
await page.locator('input[name="sword"]').fill('0');
await page.locator('input[name="sword"]').click();
await page.locator('input[name="spear"]').click();
await page.locator('input[name="spear"]').fill('46');
await page.locator('input[name="sword"]').click();
await page.locator('input[name="sword"]').fill('30');
await page.getByRole('link', { name: 'Start' }).click();
test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
