async (page) => {
  const isolatedContext = await page.context().browser().newContext();
  page = await isolatedContext.newPage();
  try {
    const errors = [],
      failures = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 400));
    });
    page.on("response", (r) => {
      if (r.status() >= 400)
        failures.push({ url: r.url(), status: r.status() });
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("http://127.0.0.1:3000/editions/winter2026");
    await page.waitForFunction(
      () =>
        document.querySelector(".painting-stage canvas")?.dataset.intro ===
        "complete",
      {},
      { timeout: 30000 },
    );
    await page.evaluate(
      () => (document.documentElement.style.scrollBehavior = "auto"),
    );
    await page.evaluate(() =>
      scrollTo(0, document.getElementById("checkout").offsetTop),
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".painting-stage canvas")?.dataset.scene ===
        "checkout",
      {},
      { timeout: 30000 },
    );
    await page.waitForTimeout(500);
    await page.mouse.move(745, 125);
    await page.waitForTimeout(500);
    const hatCursor = await page.evaluate(() => document.body.style.cursor);
    await page.mouse.click(745, 125);
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "output/playwright/full-merch-dialog.png" });
    await page.getByRole("button", { name: "Increase amount" }).click();
    const quantity = await page.locator(".merch-quantity output").innerText();
    const checkoutUrl = await page
      .getByRole("link", { name: "Checkout ↗" })
      .getAttribute("href");
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      scrollTo(0, document.getElementById("operations").offsetTop),
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".painting-stage canvas")?.dataset.scene ===
        "operations",
      {},
      { timeout: 30000 },
    );
    await page.waitForTimeout(400);
    await page.mouse.move(640, 390);
    await page.waitForTimeout(300);
    const globeCursor = await page.evaluate(() => document.body.style.cursor);
    await page.mouse.down();
    const globeDragging = await page
      .locator(".painting-stage canvas")
      .getAttribute("data-dragging");
    await page.mouse.move(820, 390, { steps: 15 });
    await page.mouse.up();
    await page.screenshot({ path: "output/playwright/full-globe-drag.png" });
    await page.evaluate(() =>
      scrollTo(0, document.getElementById("shipping").offsetTop),
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".painting-stage canvas")?.dataset.scene ===
        "shipping",
      {},
      { timeout: 30000 },
    );
    await page.waitForTimeout(500);
    await page.screenshot({ path: "output/playwright/full-key-scene.png" });
    const popupWait = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Explore the Renaissance key", exact: true })
      .evaluate((n) => n.focus());
    await page.keyboard.press("Enter");
    const popup = await popupWait;
    popup.on("pageerror", (e) => errors.push(e.message));
    await popup.waitForFunction(
      () => document.querySelector(".key-explorer")?.dataset.loaded === "true",
      null,
      { timeout: 60000 },
    );
    await popup.screenshot({ path: "output/playwright/full-key-window.png" });
    const keyReady = await popup
      .locator("canvas")
      .getAttribute("data-key-state");
    await popup.close();
    // The moving-window alignment, native prop click and coin burst have their own qa-key-fidelity check.

    return {
      hatCursor,
      quantity,
      checkoutUrl,
      globeCursor,
      globeDragging,
      keyReady,
      errors: [...new Set(errors)],
      failures,
    };
  } finally {
    await isolatedContext.close();
  }
};
