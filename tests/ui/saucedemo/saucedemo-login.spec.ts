import { test, expect } from '../../../fixtures';
import { env } from '../../../config/env';
import { joinUrl } from '../../../utils/url';
import { applyUiMutation } from '../../../utils/mutation-testing';
import { SaucedemoLoginPage } from '../../../pages/saucedemo/login.page';
import { SaucedemoInventoryPage } from '../../../pages/saucedemo/inventory.page';
import { SAUCEDEMO_USERS, buildWrongPassword } from '../../../data/saucedemo/saucedemo-credentials.data';

/**
 * SauceDemo login (`SAUCEDEMO_BASE_URL`). Locators, error copy and the
 * network-validation signal are verified live in
 * `docs/exploration/saucedemo-login-cart-exploration.md`.
 */
test.describe('SauceDemo login', () => {
  test(
    'logs in with valid credentials and lands on the inventory page',
    { tag: ['@p0', '@smoke', '@network-validation', '@mutation-target', '@login-valid-credentials'] },
    async ({ page }) => {
      const loginPage = new SaucedemoLoginPage(page);
      const inventoryPage = new SaucedemoInventoryPage(page);
      await loginPage.open();

      const response = await loginPage.submitAndWaitForInventoryAsset(
        SAUCEDEMO_USERS.standardUser.username,
        SAUCEDEMO_USERS.standardUser.password,
      );

      expect(response.status()).toBe(200);
      expect(response.request().method()).toBe('GET');
      expect(response.url()).toMatch(/\/assets\/.*\.(jpg)$/i);

      await expect(page).toHaveURL(/\/inventory\.html$/);

      // Element only exists once the inventory page has rendered, so the
      // mutation is applied here rather than before login (see the
      // implementation summary's "Deviations" section).
      await applyUiMutation(inventoryPage.pageTitle, 'hide');

      await expect(inventoryPage.pageTitle).toBeVisible();
      await expect(inventoryPage.pageTitle).toHaveText('Products');
    },
  );

  test(
    'shows an error and stays on the login page for locked_out_user',
    { tag: ['@p1', '@regression', '@mutation-target', '@login-locked-out-user'] },
    async ({ page }) => {
      const loginPage = new SaucedemoLoginPage(page);
      await loginPage.open();

      await loginPage.login(SAUCEDEMO_USERS.lockedOutUser.username, SAUCEDEMO_USERS.lockedOutUser.password);

      await applyUiMutation(loginPage.errorMessage, 'hide');

      await expect(loginPage.errorMessage).toBeVisible();
      await expect(loginPage.errorMessage).toHaveText('Epic sadface: Sorry, this user has been locked out.');
      await expect(page).toHaveURL(joinUrl(env.SAUCEDEMO_BASE_URL));
    },
  );

  test(
    'shows an error and stays on the login page for standard_user',
    { tag: ['@p1', '@regression', '@mutation-target', '@login-invalid-password'] },
    async ({ page }) => {
      const loginPage = new SaucedemoLoginPage(page);
      await loginPage.open();

      await loginPage.login(SAUCEDEMO_USERS.standardUser.username, buildWrongPassword());

      await applyUiMutation(loginPage.errorMessage, 'hide');

      await expect(loginPage.errorMessage).toBeVisible();
      await expect(loginPage.errorMessage).toHaveText(
        'Epic sadface: Username and password do not match any user in this service',
      );
      await expect(page).toHaveURL(joinUrl(env.SAUCEDEMO_BASE_URL));
    },
  );
});
