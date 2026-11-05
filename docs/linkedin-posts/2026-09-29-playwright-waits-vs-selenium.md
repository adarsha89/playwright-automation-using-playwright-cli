## Series
Playwright framework, Learning 3
Previous post: docs/linkedin-posts/2026-09-29-page-objects-expose-locators.txt — page-object helpers that return values (counts, booleans) snapshot the page and bypass Playwright's retrying assertions; expose Locators instead.

Why a series part, not standalone: the lesson is grounded in this repo's own page objects, fixtures, playwright.config.ts and Jenkinsfile (with the Selenium repo as contrast), which fits the "Playwright framework" series. The standalone tool-comparison post (2026-09-29-playwright-vs-selenium-cypress-webdriverio.*) covers tool choice broadly; this one goes deep on the waiting model and run-time economics only.

## Post
File to copy: docs/linkedin-posts/2026-09-29-playwright-waits-vs-selenium.txt

```text
𝗣𝗹𝗮𝘆𝘄𝗿𝗶𝗴𝗵𝘁 𝗳𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸, 𝗟𝗲𝗮𝗿𝗻𝗶𝗻𝗴 𝟯

Same demo shop, same "add to cart" click. The Selenium framework needs a custom wait loop that retries stale elements. The Playwright one is a single locator click.

That's the real waiting difference. Whether it also cuts total run time is a separate question.

Previously, in Learning 2: page objects that return counts or booleans turn Playwright's retrying assertions into one-time snapshots, so expose Locators instead. In Learning 3: Playwright's auto-waiting removes wait code and stale-element handling, but total run time only drops once you also use parallel workers, storageState and traces.

𝗪𝗵𝗲𝗿𝗲 𝘁𝗵𝗲 𝘄𝗮𝗶𝘁 𝗹𝗶𝘃𝗲𝘀
Selenium waits where you write them. The Selenium + Cucumber framework does it well: a WebDriverWait in BasePage, no implicit wait (Selenium's docs warn that mixing implicit and explicit waits causes unpredictable wait times), no Thread.sleep.

Still, adding a product needed a wait that re-finds the item and swallows StaleElementReferenceException, because the list re-renders. And elementToBeClickable only checks visible and enabled.

Playwright waits inside every action. Before a click, 𝗮𝗰𝘁𝗶𝗼𝗻𝗮𝗯𝗶𝗹𝗶𝘁𝘆 𝗰𝗵𝗲𝗰𝗸𝘀 confirm the element is visible, stable, receives the pointer event and is enabled, retrying until the timeout. A locator finds an up-to-date element on every action, so there's no stale handle to catch. Web-first assertions retry the same way.

The Playwright repo's SauceDemo page objects contain no explicit waits and no waitForTimeout.

𝗪𝗵𝗲𝗻 𝘁𝗼𝘁𝗮𝗹 𝘁𝗶𝗺𝗲 𝗮𝗰𝘁𝘂𝗮𝗹𝗹𝘆 𝗱𝗿𝗼𝗽𝘀
Auto-waiting mostly saves 𝗲𝗻𝗴𝗶𝗻𝗲𝗲𝗿𝗶𝗻𝗴 𝘁𝗶𝗺𝗲: less wait code to write and review, fewer timing failures to rerun. Wall-clock time drops when you also use the rest:
→ Parallel workers and --shard. Each test gets its own 𝗯𝗿𝗼𝘄𝘀𝗲𝗿 𝗰𝗼𝗻𝘁𝗲𝘅𝘁, which the docs call fast and cheap to create. The Selenium framework keeps parallel off by default because every scenario launches its own browser, which can saturate a laptop's CPU.
→ storageState, to log in once instead of in every test.
→ Trace Viewer, so a CI failure is diagnosed from DOM snapshots and network calls, not by rerunning it.

𝗪𝗵𝗲𝗻 𝗶𝘁 𝗯𝗮𝗿𝗲𝗹𝘆 𝗺𝗼𝘃𝗲𝘀
Those levers aren't automatic. This repo's CI runs with workers: 1 and one shard by default, and the SauceDemo fixture logs in through the UI before every test.

And if your Selenium framework already has solid explicit-wait helpers, or the suite is bound by a slow environment, test data or the app itself, switching tools won't move that number much.

Where does your suite's time actually go: waits, logins, serial execution, or the environment? 👇

#Playwright #Selenium #TestAutomation #TestArchitecture #SDET
```

## Length
2881 / 3000 characters, formatting OK — PASS (validated with validate-post.mjs). ~380 words: longer than the 150–250 default, deliberately, for the architect-level two-part brief.

## Evidence
| Claim in post | Evidence | Observed or inferred |
|---|---|---|
| Selenium framework needs a custom wait loop that retries stale elements for add-to-cart | SeleniumCucumberFramework/src/main/java/com/scf/pages/InventoryPage.java `findInventoryItem` (wait.until lambda catching StaleElementReferenceException; comment: list re-renders) | Observed |
| Playwright add-to-cart is a single locator click | pages/saucedemo/inventory.page.ts:30-36 (`addProductToCart` → filtered locator `.click()`) | Observed |
| Selenium framework: WebDriverWait in BasePage, no implicit wait, no Thread.sleep | SeleniumCucumberFramework/src/main/java/com/scf/pages/BasePage.java:24-43; grep for implicitlyWait / sleep in src/ returns nothing; BrowserSession.java sets only pageLoadTimeout | Observed |
| Selenium docs warn mixing implicit and explicit waits causes unpredictable wait times | https://www.selenium.dev/documentation/webdriver/waits/ ("Do not mix implicit and explicit waits. Doing so can cause unpredictable wait times.") | Documented |
| elementToBeClickable only checks visible and enabled | https://www.selenium.dev/selenium/docs/api/java/org/openqa/selenium/support/ui/ExpectedConditions.html ("visible and enabled such that you can click it"); used in BasePage.java:37-39 | Documented + observed |
| Click actionability: visible, stable, receives events, enabled; retried until timeout | https://playwright.dev/docs/actionability | Documented |
| A locator finds an up-to-date element on every action | https://playwright.dev/docs/locators ("Every time a locator is used for an action, an up-to-date DOM element is located in the page.") | Documented |
| Web-first assertions retry the same way | https://playwright.dev/docs/actionability (auto-retrying assertions); tests/ui/saucedemo/cart.spec.ts:16-27 | Documented + observed |
| SauceDemo page objects contain no explicit waits and no waitForTimeout | pages/saucedemo/*.ts; repo-wide grep finds no waitForTimeout (only waitForURL in fixtures/index.ts:72 and waitForResponse in utils/network.ts) | Observed |
| Auto-waiting mostly saves engineering time (less wait code, fewer timing reruns) | Contrast of the two page-object layers above | Inferred |
| Parallel workers and sharding | playwright.config.ts `fullyParallel: true`; Jenkinsfile `--shard=${SHARD_INDEX}/${SHARD_TOTAL}`; https://playwright.dev/docs/test-parallel | Observed + documented |
| Browser contexts fast and cheap to create | https://playwright.dev/docs/browser-contexts ("fast and cheap to create and are completely isolated") | Documented |
| Selenium framework keeps parallel off by default; each scenario launches its own browser, can saturate a laptop CPU | SeleniumCucumberFramework/src/test/resources/junit-platform.properties:1-14 | Observed (stated rationale in comment) |
| storageState avoids logging in every test | https://playwright.dev/docs/auth ("eliminates the need to authenticate in every test and speeds up test execution") | Documented |
| Trace Viewer for diagnosing CI failures (DOM snapshots, network) | https://playwright.dev/docs/trace-viewer; playwright.config.ts `trace: CI ? 'on-first-retry' : 'retain-on-failure'` | Documented + observed |
| This repo's CI runs workers: 1, one shard by default | playwright.config.ts `workers: process.env.CI ? 1 : undefined`; Jenkinsfile SHARD_TOTAL default '1' | Observed |
| SauceDemo fixture logs in through the UI before every test | fixtures/index.ts:68-74 (`sauceDemoAuthenticatedPage`, test-scoped, no storageState anywhere in repo) | Observed |
| Well-built Selenium waits / env-bound suites won't gain much from switching | Reasoned from the mechanisms above | Inferred (worded conditionally) |
| Recap of Learning 2 | docs/linkedin-posts/2026-09-29-page-objects-expose-locators.txt | Observed |

## Assumptions and questions for you
- Your role isn't confirmed, so the post uses a neutral voice ("The Selenium + Cucumber framework…", "This repo's CI…"). If you built both frameworks, you could say "my" — confirm and I'll adjust.
- No speed-up numbers are stated; none are sourced. If you have measured run times for either suite, share them and they can replace a mechanism sentence.
- The post names this repo's own untapped levers (workers: 1 on CI, UI login per test). That's honest but mildly self-critical; keep it, or reframe as "next steps"?
- Series numbering assumes Learning 1 (CI/version contract post) was published; its .txt is no longer on disk, but Learning 2 references it.
- Overlap check: web-first assertions get one sentence only; the Learning 2 topic isn't repeated beyond the recap.
- Both repos are assumed public (SauceDemo demo site; no secrets or private URLs used).

## Alternates
- Hook B: "Playwright's auto-waiting doesn't make a suite faster on its own. It removes wait code. The run-time savings come from somewhere else."
