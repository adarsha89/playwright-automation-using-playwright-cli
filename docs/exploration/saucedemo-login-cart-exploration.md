# SauceDemo Login & Add-to-Cart — Exploration

Source: live site `https://www.saucedemo.com/`, explored headless via `playwright-cli` (local
`npx --no-install playwright cli`), session `-s=saucedemo-login-cart`, `--device "Desktop Chrome"`,
2026-11-05. All commands below were actually run; values are copy-pasted from command output, not
guessed. No credentials or tokens needed redaction — `standard_user` / `locked_out_user` /
`secret_sauce` are the site's own publicly documented demo credentials (confirmed on-page, see E-1).

## E-1 Login page (`/`)

```
pw -s=saucedemo-login-cart open --device "Desktop Chrome" https://www.saucedemo.com/
pw -s=saucedemo-login-cart snapshot
```

Page title: `Swag Labs`. Snapshot:

```yaml
- form "Login":
  - textbox "Username"
  - textbox "Password"
  - button "Login"
- heading "Accepted usernames are:" [level=4]
- text: standard_userlocked_out_userproblem_userperformance_glitch_usererror_uservisual_user
- heading "Password for all users:" [level=4]
- text: secret_sauce
```

Element attributes (via `eval "el => el.getAttribute('data-test')"`):

| Element | `data-test` | Locator |
|---|---|---|
| Username field | `username` | `page.locator('[data-test="username"]')` |
| Password field | `password` | `page.locator('[data-test="password"]')` |
| Login button | `login-button` | `page.locator('[data-test="login-button"]')` |
| Inline error banner text | `error` | `page.locator('[data-test="error"]')` |

`generate-locator` on the error element returned `locator('[data-test="error"]')` directly — already
repo-compliant (stable attribute, no normalization needed).

Two console errors fire on load, unrelated to the app: `POST
https://events.backtrace.io/api/{unique-events,summed-events}/submit?universe=UNIVERSE&token=TOKEN`
→ `401 Unauthorized`. This is the site's own analytics SDK (`@backtrace/react`) misconfigured with
literal placeholder `universe`/`token` values — confirmed via `request-body`, see E-4.

## E-2 Valid login → inventory page

```
pw -s=saucedemo-login-cart fill <username-ref> "standard_user"
pw -s=saucedemo-login-cart fill <password-ref> "secret_sauce"
pw -s=saucedemo-login-cart click <login-button-ref>
```

Result: `Page URL: https://www.saucedemo.com/inventory.html`, title still `Swag Labs`. Snapshot shows
the products grid (`Products` title, 6 products, each with a "View details" button, name, price,
"Add to cart" button) and a header `button "Cart, empty"` before any add-to-cart.

| Element | `data-test` | Notes |
|---|---|---|
| Page title ("Products" / "Your Cart") | `title` | Same attribute reused on inventory and cart pages (confirmed both, E-2/E-6) — tag name `SPAN` |
| Cart link (header) | `shopping-cart-link` | `button "Cart, empty"` when empty |
| Cart badge | `shopping-cart-badge` | Absent from DOM entirely when cart is empty (no node at all — confirmed by its absence from this snapshot); present with text `"1"` after one add (E-5) |
| Product name (inventory grid) | `inventory-item-name` | Confirmed via `run-code`: `page.locator('[data-test="inventory-item-name"]').allTextContents()` → `["Sauce Labs Backpack","Sauce Labs Bike Light","Sauce Labs Bolt T-Shirt","Sauce Labs Fleece Jacket","Sauce Labs Onesie","Test.allTheThings() T-Shirt (Red)"]` |
| "Add to cart" button (Sauce Labs Backpack) | `add-to-cart-sauce-labs-backpack` | Printed verbatim by the CLI's generated code: `page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();` |
| "Remove" button (after adding) | `remove-sauce-labs-backpack` | Confirmed via `eval` after the add |

Chosen product for S-4: **Sauce Labs Backpack** (first product, stable name, confirmed `data-test`
slug).

## E-3 Locked-out user

```
pw -s=saucedemo-login-cart goto https://www.saucedemo.com/
pw -s=saucedemo-login-cart fill <username-ref> "locked_out_user"
pw -s=saucedemo-login-cart fill <password-ref> "secret_sauce"
pw -s=saucedemo-login-cart click <login-button-ref>
```

Result: `Page URL: https://www.saucedemo.com/` (no navigation). Snapshot shows an `alert` containing a
"Dismiss error" button and:

```
"Epic sadface: Sorry, this user has been locked out."
```

Confirmed verbatim (no extra whitespace) via
`page.locator('[data-test="error"]').textContent()` → `"Epic sadface: Sorry, this user has been locked out."`

## E-4 Invalid password for `standard_user`

```
pw -s=saucedemo-login-cart goto https://www.saucedemo.com/
pw -s=saucedemo-login-cart fill <username-ref> "standard_user"
pw -s=saucedemo-login-cart fill <password-ref> "wrong_password_123"   # any value ≠ secret_sauce
pw -s=saucedemo-login-cart click <login-button-ref>
```

Result: `Page URL: https://www.saucedemo.com/` (no navigation). Error text, confirmed verbatim via
`textContent()`:

```
"Epic sadface: Username and password do not match any user in this service"
```

Distinct wording from E-3, confirming AC-5 (two different messages, two different tests). Re-run with
a second, independently-generated wrong password produced the identical message — confirms the exact
password value doesn't matter, only that it's wrong.

## E-5 Add to cart → cart page

```
pw -s=saucedemo-login-cart click <add-to-cart-sauce-labs-backpack-ref>
pw -s=saucedemo-login-cart snapshot      # inventory page, after add
pw -s=saucedemo-login-cart click <shopping-cart-link-ref>
pw -s=saucedemo-login-cart snapshot      # cart page
```

After the add, on the inventory page: header button's accessible name becomes `"Cart, 1 items"`
(literally "1 items", not "1 item" — confirmed verbatim, not normalized) and a cart badge
(`[data-test="shopping-cart-badge"]`) appears with text `"1"`. This matches a previously-documented
SauceDemo behavior (`.ai/context/automation-pipeline-learnings.md`'s cart-badge bullet) and was
independently reconfirmed live here.

On `/cart.html`: page title (`[data-test="title"]`) reads `"Your Cart"` (count 1, same attribute as
the inventory page's "Products" title — confirmed via `run-code`). The cart row shows QTY `"1"` and
the product name via `[data-test="inventory-item-name"]` → `"Sauce Labs Backpack"` (same attribute
name as the inventory grid's product name — confirmed via `eval` on the cart-page element,
`data-test="inventory-item-name"`, tag `DIV`). A "Remove" button
(`[data-test="remove-sauce-labs-backpack"]`) is present; no product image is rendered on the cart row
(text only).

`generate-locator` on the cart item's name element returned a fragile, product-id-keyed locator
(`locator('[data-test="item-4-title-link"]')`, targeting the wrapping link by an internal numeric id) —
**not used**; the stable `[data-test="inventory-item-name"]` attribute locator is used instead per
repo rule (generated locators are candidates, not finished locators).

## E-6 Network-validation signal (`@network-validation`, AC-2 / AC-7 / R-2 / R-3)

**Methodology:** `pw requests` / `pw requests --static` (full request list including static assets)
was run before and after each action (page load, two `fill`s, login `click`, `add-to-cart` `click`,
cart-link `click`) to isolate which new network entries each action actually caused, then confirmed
causally with `run-code` + `page.waitForResponse()` wrapped around the action (not just "check the
list afterwards").

**Finding 1 — the site is a 100%-client-side SPA with no backend login/cart API.**
`requests --static` on the whole flow showed exactly:
1 GET `/` (document), 1 GET of a Google Fonts CSS, 1 GET `/assets/index-*.js`, 1 GET
`/assets/index-*.css`, a handful of GET `woff2` font files, 6 GET product-image `.jpg` files (loaded
only once the inventory page renders), and periodic POST calls to `events.backtrace.io` (see Finding
2). **There is no document navigation request for `/inventory.html` or `/cart.html`** — the URL
changes via client-side routing (History API) only. **Clicking "Add to cart" and navigating to
`/cart.html` produced zero new network requests of any kind** — confirmed by diffing the full request
list immediately before and after each of those two actions (same entries, same count, both times).
This is a genuine, confirmed absence of network activity for S-4's own add-to-cart action, not an
oversight — see R-3 disposition below.

**Finding 2 — the only non-static traffic on this site (`events.backtrace.io` analytics) is NOT
action-tied, and is therefore unsuitable as a signal.** POST calls to
`https://events.backtrace.io/api/{unique-events,summed-events}/submit` appeared repeatedly
(always `401 Unauthorized`, confirmed via `request-body`/`response-body`: payload is a generic
`"metric_group":"Application Launches"` telemetry batch from `@backtrace/react`, misconfigured with
literal `UNIVERSE`/`TOKEN` placeholders — a pre-existing site defect, not something this plan can or
should fix). Proof these are **not** caused by a specific click: they appeared after the two `fill`
actions and after the login `click`, but **did not appear at all** after the `add-to-cart` click
(same request count before/after) — i.e. they fire on an internal timer/batch-flush schedule that
sometimes coincides with an action and sometimes doesn't. Asserting on this endpoint would be a
flaky, non-causal signal and was rejected.

**Finding 3 — product-image loads are a real, deterministic, action-caused signal for a successful
login.** Confirmed via `run-code`:

```js
async page => {
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  const [resp] = await Promise.all([
    page.waitForResponse(r => /\/assets\/.*\.(jpg)$/i.test(r.url()) && r.request().method() === 'GET'),
    page.locator('[data-test="login-button"]').click(),
  ]);
  return { url: resp.url(), status: resp.status(), method: resp.request().method() };
}
```

Result: `{"url":"https://www.saucedemo.com/assets/sauce-backpack-1200x1500-CjRW-Djj.jpg","status":200,"method":"GET"}`.
This is reliable and reproducible: the inventory page's product grid only renders (and its `<img>`
tags only fire their GET requests) once the login submission succeeds and the client router shows
`/inventory.html`; a failed login (E-3/E-4) never reaches that render, so these GET requests never
fire for an invalid attempt. This is the network-validation signal used for **test 1**
(`@login-valid-credentials`): assert a `GET .../assets/*.jpg` response with `status === 200`, captured
via `page.waitForResponse(...)` racing the login-button click (not a post-hoc list check).

**Disposition for test 4 (`@cart-add-product`, R-3/Q-2/A-2):** the add-to-cart action itself produces
**no** distinct, assertable network activity on this site — confirmed above, not assumed. Per the
requirement's own stated default (Q-2/A-2: "if no distinct, assertable network activity exists for
this action, satisfied by asserting on whatever network activity genuinely does occur around that
action... if truly none exists at all, that gap is reported back rather than invented"), this plan
reports the gap plainly: **there is no way to validate the add-to-cart click itself over the network
on this site.** S-4's own first step is "log in with valid credentials" (same precondition as test 1),
so test 4 reuses the identical, genuinely-observed, action-caused product-image signal from its own
login step (Finding 3) to satisfy `@network-validation`, and the test/plan say explicitly that this
validates the login precondition inside that test's flow, not the add-to-cart click, because
add-to-cart has no network footprint to validate. This is the most defensible non-invented signal
available and is flagged as an open point for SDET sign-off (see plan §11).

## E-7 Session/state notes

The app persists cart contents in browser storage (not cleared by `goto` back to `/`): adding one item
and then navigating directly to `/cart.html` in the same browser context still showed it. This is not
a concern for the planned tests because each Playwright test gets its own fresh `BrowserContext`/`Page`
(this repo's fixture model, see `fixtures/index.ts`), so no state leaks between tests; noted here only
as a reliability fact for whoever implements, in case a future test reuses a context.

## Summary of locators to use (final, repo-compliant)

| Page | Element | Locator |
|---|---|---|
| Login | Username | `[data-test="username"]` |
| Login | Password | `[data-test="password"]` |
| Login | Submit button | `[data-test="login-button"]` |
| Login | Error message | `[data-test="error"]` |
| Inventory | Page title | `[data-test="title"]` (text `"Products"`) |
| Inventory | Cart link | `[data-test="shopping-cart-link"]` |
| Inventory | Cart badge | `[data-test="shopping-cart-badge"]` (absent when empty) |
| Inventory | "Add to cart" (Sauce Labs Backpack) | `[data-test="add-to-cart-sauce-labs-backpack"]` |
| Cart | Page title | `[data-test="title"]` (text `"Your Cart"`) |
| Cart | Cart badge | `[data-test="shopping-cart-badge"]` |
| Cart | Item name | `[data-test="inventory-item-name"]` (text `"Sauce Labs Backpack"`) |

No generated locator was used as-is; all final locators above are the stable `data-test` attribute,
confirmed live, per `.ai/context/ui-automation-workflow.md`.
