import { test, expect } from '../../../fixtures';
import { applyUiMutation } from '../../../utils/mutation-testing';
import { SaucedemoLoginPage } from '../../../pages/saucedemo/login.page';
import { SaucedemoInventoryPage } from '../../../pages/saucedemo/inventory.page';
import { SaucedemoCartPage } from '../../../pages/saucedemo/cart.page';
import { SAUCEDEMO_USERS } from '../../../data/saucedemo/saucedemo-credentials.data';
import { SAUCEDEMO_BACKPACK } from '../../../data/saucedemo/saucedemo-product.data';

/**
 * SauceDemo add-to-cart (`SAUCEDEMO_BASE_URL`). Locators and the
 * network-validation signal are verified live in
 * `docs/exploration/saucedemo-login-cart-exploration.md` (E-2, E-5, E-6).
 *
 * Add-to-cart itself produces zero network requests on this site (E-6
 * Finding 1), so this test's `@network-validation` signal is the same
 * login-precondition product-image GET used by the login suite's valid-
 * credentials test, not the add-to-cart click (see plan §11).
 */
test.describe('SauceDemo add to cart', () => {
  test(
    'adds a product to the cart and shows it on the cart page',
    { tag: ['@p1', '@smoke', '@network-validation', '@mutation-target', '@cart-add-product'] },
    async ({ page }) => {
      const loginPage = new SaucedemoLoginPage(page);
      const inventoryPage = new SaucedemoInventoryPage(page);
      const cartPage = new SaucedemoCartPage(page);

      await loginPage.open();
      const response = await loginPage.submitAndWaitForInventoryAsset(
        SAUCEDEMO_USERS.standardUser.username,
        SAUCEDEMO_USERS.standardUser.password,
      );
      expect(response.status()).toBe(200);

      await inventoryPage.addBackpackToCart();
      await inventoryPage.openCart();

      await applyUiMutation(cartPage.backpackItemName, 'replace-text');

      await expect(cartPage.backpackItemName).toHaveCount(1);
      await expect(cartPage.backpackItemName).toHaveText(SAUCEDEMO_BACKPACK.name);
      await expect(cartPage.cartBadge).toHaveText('1');
    },
  );
});
