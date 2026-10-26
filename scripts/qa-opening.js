async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = "http://127.0.0.1:3000/editions/winter2026";
  const read = () =>
    page.evaluate(() => {
      const root = document.querySelector(".renaissance-experience");
      const css = (selector) =>
        getComputedStyle(document.querySelector(selector));
      return {
        phase: root.dataset.opening,
        status: root.dataset.status,
        curtain: css(".opening-curtain").opacity,
        menu: css(".chapter-navigation").visibility,
        title: css(".renaissance-title").translate,
        scene: document.querySelector("canvas").dataset.scene,
      };
    });
  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator('[data-opening="drawing"]').waitFor({ state: "attached" });
  await page.waitForTimeout(900);
  const early = await read();
  await page.screenshot({
    path: "output/playwright/opening-desktop-lines.png",
  });
  await page
    .locator('[data-opening="revealing"]')
    .waitFor({ state: "attached", timeout: 15000 });
  const reveal = await read();
  await page
    .locator('[data-opening="complete"][data-status="ready"]')
    .waitFor({ state: "attached" });
  await page
    .locator('canvas[data-intro="complete"]')
    .waitFor({ state: "attached" });
  await page.screenshot({
    path: "output/playwright/opening-desktop-complete.png",
  });
  const complete = await read();
  await page.locator('.chapter-navigation a[href="#sidekick"]').click();
  await page.waitForTimeout(1500);
  const sidekick = await read();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  const returned = await read();
  await page.goto("about:blank");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const mobileEarly = await read();
  await page.screenshot({ path: "output/playwright/opening-mobile-lines.png" });
  await page
    .locator('[data-opening="complete"][data-status="ready"]')
    .waitFor({ state: "attached" });
  await page
    .locator('canvas[data-intro="complete"]')
    .waitFor({ state: "attached" });
  await page.screenshot({
    path: "output/playwright/opening-mobile-complete.png",
  });
  const mobileComplete = await read();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-opening="complete"]')
    .waitFor({ state: "attached", timeout: 3000 });
  const reducedMotion = await read();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(url + "#sidekick", { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-opening="complete"]')
    .waitFor({ state: "attached", timeout: 3000 });
  const deepLink = await read();
  if (
    early.phase !== "drawing" ||
    early.curtain !== "1" ||
    early.menu !== "hidden"
  )
    throw new Error("Desktop opening was not visible");
  if (mobileEarly.phase !== "drawing" || mobileEarly.curtain !== "1")
    throw new Error("Mobile opening was not visible");
  if (
    [complete, returned, mobileComplete, reducedMotion, deepLink].some(
      (state) => state.phase !== "complete" || state.curtain !== "0",
    )
  )
    throw new Error("Opening did not finish or skip correctly");
  if (errors.length) throw new Error(errors.join("\n"));
  return {
    early,
    reveal,
    complete,
    sidekick,
    returned,
    mobileEarly,
    mobileComplete,
    reducedMotion,
    deepLink,
    errors,
  };
};
