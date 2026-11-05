import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { SAUCEDEMO_BACKPACK } from '../../data/saucedemo/saucedemo-product.data';

/**
 * Page object for the SauceDemo inventory page (`/inventory.html`, reached
 * by client-side routing after a successful login — no document
 * navigation). Locators verified live in
 * `docs/exploration/saucedemo-login-cart-exploration.md` (E-2, E-5).
 */
export class SaucedemoInventoryPage extends BasePage {
  readonly pageTitle: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly backpackAddToCartButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.backpackAddToCartButton = page.locator(`[data-test="${SAUCEDEMO_BACKPACK.addToCartTestId}"]`);
  }

  async addBackpackToCart(): Promise<void> {
    await this.backpackAddToCartButton.click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
