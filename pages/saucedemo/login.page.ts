import type { Locator, Page, Response } from '@playwright/test';
import { BasePage } from '../base.page';
import { env } from '../../config/env';
import { joinUrl } from '../../utils/url';

/**
 * Page object for the SauceDemo login page (`SAUCEDEMO_BASE_URL`).
 * Locators and the network-validation signal are verified live in
 * `docs/exploration/saucedemo-login-cart-exploration.md` (E-1, E-2, E-6).
 */
export class SaucedemoLoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async open(): Promise<void> {
    await this.goto(joinUrl(env.SAUCEDEMO_BASE_URL));
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Submits the login form and races the click against the inventory page's
   * product-image `GET .../assets/*.jpg` request — the only real,
   * deterministic, action-caused network signal a successful login produces
   * on this 100%-client-side SPA (exploration doc E-6, Finding 3). Only
   * valid for a login that is expected to succeed.
   */
  async submitAndWaitForInventoryAsset(username: string, password: string): Promise<Response> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => /\/assets\/.*\.(jpg)$/i.test(r.url()) && r.request().method() === 'GET'),
      this.loginButton.click(),
    ]);
    return response;
  }
}
