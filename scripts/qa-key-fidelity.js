async (page) => {
  const errors = [];
  page.setDefaultTimeout(60000);
  for (const extra of page.context().pages())
    if (extra !== page) await extra.close();
  await page.goto("about:blank");
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3000/editions/winter2026#shipping", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.status ===
      "ready",
    null,
    { timeout: 60000 },
  );
  await page.locator('.chapter-navigation a[href="#shipping"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector(".painting-stage canvas")?.dataset.scene ===
      "shipping",
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: "output/playwright/fidelity-shipping-before.png",
  });
  const waiting = page.waitForEvent("popup");
  const key = page.getByRole("button", {
    name: "Explore the Renaissance key",
    exact: true,
  });
  await key.focus();
  await key.press("Enter");
  const popup = await waiting;
  popup.on("pageerror", (e) => errors.push("popup: " + e.message));
  popup.on("console", (m) => {
    if (m.type() === "error") errors.push("popup console: " + m.text());
  });
  await popup.waitForLoadState("domcontentloaded");
  await popup.waitForFunction(
    () => document.querySelector(".key-explorer")?.dataset.loaded === "true",
    null,
    { timeout: 60000 },
  );
  await popup.waitForTimeout(2500);
  const initial = await popup.evaluate(() => ({
    window: { x: screenX, y: screenY, w: innerWidth, h: innerHeight },
    canvas: { ...document.querySelector("canvas").dataset },
  }));
  await popup.screenshot({
    path: "output/playwright/fidelity-key-picked-up.png",
  });
  const mainWindow = await page.evaluate(() => ({
    x: screenX,
    y: screenY,
    w: innerWidth,
    h: innerHeight,
  }));
  const target = {
    x: mainWindow.x + (mainWindow.w - initial.window.w) / 2,
    y:
      mainWindow.y +
      (mainWindow.h - initial.window.h) / 2 +
      initial.window.h / (4 * Math.tan((25 * Math.PI) / 180) * 10),
  };
  const cdp = await popup.context().newCDPSession(popup);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { left: Math.round(target.x), top: Math.round(target.y) },
  });
  await popup.waitForTimeout(1200);
  const aligned = await popup.evaluate(() => ({
    x: screenX,
    y: screenY,
    alignment: document.querySelector("canvas").dataset.alignment,
  }));
  await popup.mouse.click(initial.window.w / 2, initial.window.h / 2);
  await popup.waitForFunction(
    () => document.querySelector("canvas")?.dataset.keyState === "inserted",
    null,
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () =>
      Number(document.querySelector(".painting-stage canvas")?.dataset.coins) >
      0,
    null,
    { timeout: 10000 },
  );
  await page.screenshot({ path: "output/playwright/fidelity-coin-burst.png" });
  const coins = await page
    .locator(".painting-stage canvas")
    .getAttribute("data-coins");
  await popup.waitForTimeout(800);
  const dropped = await popup.locator("canvas").getAttribute("data-key-state");
  await popup.screenshot({
    path: "output/playwright/fidelity-key-dropped.png",
  });
  const main = await page
    .locator(".painting-stage canvas")
    .evaluate((e) => ({ ...e.dataset }));
  await page.screenshot({
    path: "output/playwright/fidelity-shipping-after.png",
  });
  await popup.close();
  await page.waitForFunction(
    () =>
      document.querySelector(".painting-stage canvas")?.dataset.keyProgress ===
      "0.000",
    null,
    { timeout: 10000 },
  );
  const reset = await page
    .locator(".painting-stage canvas")
    .evaluate((e) => ({ ...e.dataset }));
  return { initial, aligned, dropped, coins, main, reset, errors };
};
