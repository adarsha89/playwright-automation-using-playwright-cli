## Series
Standalone. The earlier posts cover specific lessons from this framework. This one is a tool-selection decision guide that uses two repos, so numbering it "Learning 3" would feel forced. Also, the Learning 1 `.txt` is no longer on disk, so a recap chain couldn't be sourced consistently.

## Post
File to copy: docs/linkedin-posts/2026-09-29-playwright-vs-selenium-cypress-webdriverio.txt
Image to attach: docs/linkedin-posts/2026-09-29-playwright-vs-selenium-cypress-webdriverio-comparison.png (2400×1738, rendered from the `.html` next to it)

```text
Playwright, Selenium, Cypress or WebdriverIO isn't a ranking question. It's a question of which constraints you can't move.

Two frameworks automating the same demo shop, one in Playwright and one in Selenium + Cucumber, show where those constraints bite.

𝗪𝗵𝗲𝗿𝗲 𝘁𝗵𝗲 𝗱𝗶𝗳𝗳𝗲𝗿𝗲𝗻𝗰𝗲 𝘀𝗵𝗼𝘄𝗲𝗱 𝘂𝗽
The Selenium framework captures and manipulates network traffic through the Chrome DevTools Protocol, which only Chromium browsers expose. On Firefox, those scenarios are reported as pending instead of running.

The Playwright suite asserts network responses with waitForResponse, and the same specs passed on Chromium, Firefox and WebKit. Its API tests run in the same runner as a separate project.

𝗔𝘁 𝗮 𝗴𝗹𝗮𝗻𝗰𝗲
→ Languages: Playwright JS/TS, Python, Java, .NET · Selenium Java, Python, C#, Ruby, JS · Cypress JavaScript · WebdriverIO Node.js
→ Waiting: Playwright auto-waits and retries assertions · Cypress retries queries and assertions · WebdriverIO waits for interactable · Selenium explicit waits you write
→ Browsers: Playwright Chromium, Firefox, patched WebKit (not branded Safari) · Selenium real browsers incl. Safari · Cypress Chrome family, Firefox, WebKit · WebdriverIO via browser drivers
→ Network control: Playwright page.route · Cypress cy.intercept · Selenium and WebdriverIO via WebDriver BiDi (Selenium's CDP route is Chromium-only)
→ Multi-user and origins: Playwright multiple contexts per test · Cypress one browser at a time, one superdomain per test unless cy.origin
→ Debugging: Playwright Trace Viewer · Cypress time-travel command log

𝗪𝗵𝗲𝗻 𝗣𝗹𝗮𝘆𝘄𝗿𝗶𝗴𝗵𝘁 𝗶𝘀 𝘁𝗵𝗲 𝗯𝗲𝘁𝘁𝗲𝗿 𝗽𝗶𝗰𝗸
A new framework that needs the same tests on three engines, network control on all of them, multi-user flows, and UI plus API checks in one runner, in the language your team already uses.

𝗪𝗵𝗲𝗻 𝗶𝘁 𝗶𝘀𝗻'𝘁
→ You must certify branded Safari, or already run a Selenium Grid: 𝗦𝗲𝗹𝗲𝗻𝗶𝘂𝗺.
→ A JavaScript front-end team that debugs tests while building features: 𝗖𝘆𝗽𝗿𝗲𝘀𝘀.
→ Web and native mobile apps in one Node.js stack, via Appium: 𝗪𝗲𝗯𝗱𝗿𝗶𝘃𝗲𝗿𝗜𝗢.

Which constraint decided your last tool choice: language, Safari, mobile, or an existing Grid?

#Playwright #Selenium #Cypress #WebdriverIO #TestArchitecture
```

## Length
2285 / 3000 characters, formatting OK — PASS (validated with validate-post.mjs). About 327 words, longer than the default because the request asked for a comparison.

## Comparison table (same as the image)
| Criterion | Playwright | Selenium | Cypress | WebdriverIO |
|---|---|---|---|---|
| Languages | JS/TS, Python, Java, .NET | Java, Python, C#, Ruby, JavaScript | JavaScript only | Node.js (JS/TS) |
| Waiting | Auto-waits for actionability; retrying web-first assertions | Explicit waits you write (WebDriverWait) | Built-in retry of queries and assertions | Waits for elements to be interactable |
| Browsers | Chromium, Firefox, patched WebKit (not branded Safari) | Real browsers via W3C WebDriver, incl. Safari (safaridriver) | Chrome family, Firefox, WebKit | Real browsers via browser drivers, incl. Safari |
| Network control | page.route / waitForResponse, built in | WebDriver BiDi; CDP route is Chromium-only | cy.intercept, built in | WebDriver BiDi (default protocol) |
| Multi-user & origins | Multiple isolated contexts per test | Multiple driver sessions | One browser at a time; one superdomain per test unless cy.origin | Multiple sessions (multiremote) |
| Debugging | Trace Viewer, HTML report | Logs, screenshots, your own tooling | Time-travel command log | Reporters and services |
| Best fit when… | New framework; same tests on three engines; network control everywhere; UI + API in one runner | Branded Safari must be certified; existing Grid; widest language choice | JavaScript front-end team debugging tests while building features | Web plus native mobile (Appium) in one Node.js stack |

## Evidence
| Claim | Evidence | Observed / inferred / documented |
|---|---|---|
| Two frameworks automate the same demo shop | This repo `tests/ui/saucedemo/*`; `SeleniumCucumberFramework/README.md` (SauceDemo) | Observed |
| Selenium repo's network scenarios use CDP, which only Chromium browsers expose; pending on Firefox | `SeleniumCucumberFramework/README.md` "Notes on the network tests"; `src/test/java/com/scf/stepdefinitions/NetworkSteps.java:20-43`; `DriverFactory.java:60-62`; `network_capture.feature:1` (`@chromium-only`) | Observed |
| Playwright suite asserts responses with waitForResponse | `utils/network.ts` `assertBacktraceEventsBeaconPair` | Observed |
| Same specs passed on Chromium, Firefox and WebKit | `playwright.config.ts` projects; `docs/reports/framework-improvements-implementation-summary.md` verification (15/15 across 3 projects) | Observed |
| API tests run in the same runner as a separate project | `playwright.config.ts` project `api`; `tests/api/example.spec.ts` | Observed |
| Playwright languages | https://playwright.dev/docs/languages | Documented |
| Selenium languages, W3C WebDriver, Grid | https://www.selenium.dev/documentation/ | Documented |
| Cypress JavaScript only; one browser at a time; one superdomain unless cy.origin | https://docs.cypress.io/app/references/trade-offs | Documented |
| WebdriverIO requires Node.js | https://webdriver.io/docs/gettingstarted | Documented |
| Playwright auto-waits for actionability | https://playwright.dev/docs/actionability | Documented |
| Cypress retries queries and assertions | https://docs.cypress.io/app/core-concepts/retry-ability | Documented |
| WebdriverIO waits for interactable | https://webdriver.io/docs/autowait | Documented |
| Selenium: explicit waits you write | https://www.selenium.dev/documentation/webdriver/waits/; `SeleniumCucumberFramework/src/main/java/com/scf/pages/BasePage.java` (WebDriverWait) | Documented + observed |
| Playwright WebKit is patched, not branded Safari | https://playwright.dev/docs/browsers | Documented |
| Selenium drives Safari via safaridriver | https://www.selenium.dev/documentation/webdriver/browsers/safari/ | Documented |
| Cypress browsers: Chrome family, Firefox, WebKit | https://docs.cypress.io/app/guides/cross-browser-testing | Documented (the page didn't state whether WebKit is experimental, so the post doesn't say) |
| page.route network control | https://playwright.dev/docs/network | Documented |
| cy.intercept | https://docs.cypress.io/api/commands/intercept | Documented |
| Selenium BiDi; CDP Chromium-only and temporary | https://www.selenium.dev/documentation/webdriver/bidi/ | Documented |
| WebdriverIO BiDi default; Appium for mobile | https://webdriver.io/docs/automationProtocols | Documented |
| Playwright multiple contexts per test | https://playwright.dev/docs/browser-contexts | Documented |
| WebdriverIO multiremote (image only) | https://webdriver.io/docs/multiremote | Documented |
| Selenium multiple driver sessions (image only) | `SeleniumCucumberFramework/src/test/resources/features/multi_session.feature` | Observed |
| Trace Viewer; Cypress time-travel | https://playwright.dev/docs/trace-viewer; https://docs.cypress.io/app/core-concepts/open-mode | Documented |
| "When Playwright / when it isn't" best-fit guidance | Synthesis of the rows above | Inferred |
| Image debugging cells for Selenium ("your own tooling") and WebdriverIO ("reporters and services") | General characterisation, not from a specific doc page | Inferred |

## Assumptions and questions for you
- Your role is still unconfirmed, so the voice is neutral ("Two frameworks…"). If you built both repos, "I automated the same demo shop twice…" would be a stronger hook.
- Doc claims were checked on 2026-09-29 and can change (BiDi coverage, Cypress WebKit status, cy.origin). The image footnote says so.
- No speed, benchmark or market-share claims are made.
- SeleniumCucumberFramework was only read, not modified. Only public details from both repos (SauceDemo, class/feature names) are used. Both repos' public visibility is unconfirmed.
- The image was rendered headless with the repo's Playwright via a scratchpad script (with the sandbox override). The headed rule covers exploration only, not this.
- The Learning 2 review notes (`2026-09-29-page-objects-expose-locators.md`) are no longer on disk, and neither are the Learning 1 files. These weren't deleted by this run.
- Hashtags use the four tool names plus #TestArchitecture. Swap one for #TestAutomation if you prefer reach over specificity.

## Alternates (only when useful)
- Hook 2: "The same demo shop, automated twice: in Selenium the network tests only run on Chromium; in Playwright they passed on three engines. That's a constraint, not a ranking."
