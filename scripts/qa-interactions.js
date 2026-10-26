async (page) => {
  await page.goto("about:blank");
  const errors = [],
    failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push({ url: response.url(), status: response.status() });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3000/editions/winter2026");
  await page.locator('canvas[data-intro="complete"]').waitFor();
  const reducedMotion = await page.locator("canvas").getAttribute("data-intro");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByPlaceholder("Search chapters").fill("side");
  const searchResults = await page
    .getByRole("dialog")
    .getByRole("link")
    .allTextContents();
  if (searchResults.length !== 1 || !searchResults[0].includes("Sidekick"))
    throw new Error("Chapter search failed.");
  await page.keyboard.press("Escape");
  const focusRestored = await page
    .getByRole("button", { name: "Search", exact: true })
    .evaluate((el) => el === document.activeElement);
  if (!focusRestored) throw new Error("Dialog did not return keyboard focus.");
  await page
    .locator(".chapter-navigation")
    .getByRole("link", { name: "Sidekick", exact: true })
    .click();
  await page.locator('canvas[data-scene="sidekick"]').waitFor();
  const anchorPosition = await page.evaluate(() => ({
    y: scrollY,
    expected: innerHeight * 1.5,
  }));
  await page
    .getByRole("button", { name: "Play the Sidekick introduction" })
    .click();
  await page.waitForFunction(
    () => document.querySelector("video")?.readyState >= 2,
  );
  const video = await page
    .locator("video")
    .evaluate((el) => ({
      readyState: el.readyState,
      width: el.videoWidth,
      source: el.currentSrc,
    }));
  await page.locator("video").evaluate((el) => el.pause());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  const menuLinks = await page.getByRole("dialog").getByRole("link").count();
  if (menuLinks !== 12)
    throw new Error("Mobile menu retained the search filter.");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.locator('canvas[data-scene="hero"]').waitFor();
  await page.screenshot({
    path: "output/playwright/native-mobile-interactions.png",
  });
  return {
    reducedMotion,
    searchResults,
    focusRestored,
    anchorPosition,
    video,
    menuLinks,
    errors,
    failures,
  };
};
