import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the SauceDemo cart page (`/cart.html`, reached by
 * client-side routing — no document navigation). Locators verified live in
 * `docs/exploration/saucedemo-login-cart-exploration.md` (E-5).
 */
export class SaucedemoCartPage extends BasePage {
  readonly pageTitle: Locator;
  readonly cartBadge: Locator;
  readonly backpackItemName: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.backpackItemName = page.locator('[data-test="inventory-item-name"]');
  }
}
