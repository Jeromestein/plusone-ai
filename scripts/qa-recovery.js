async (page) => {
  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const heroModel = "**/EW26_Hero_251207v3_compressed-optimized.glb";
  await page.route(heroModel, route => route.abort());
  await page.goto("http://127.0.0.1:3000/editions/winter2026");
  await page.locator('[data-status="fallback"]').waitFor();
  const fallbackVisible = await page.getByRole("button", { name: "Try again" }).isVisible();
  const navigationAvailable = await page.locator(".chapter-navigation").isVisible();
  await page.unroute(heroModel);
  await page.getByRole("button", { name: "Try again" }).click();
  await page.locator('[data-status="ready"]').waitFor();
  await page.locator('canvas[data-intro="complete"]').waitFor();
  const recovered = await page.locator("canvas").getAttribute("data-scene");
  if (!fallbackVisible || !navigationAvailable || recovered !== "hero") throw new Error("Fallback/retry flow failed.");
  await page.screenshot({ path: "output/playwright/native-recovered-hero.png" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return { intentionalFailure: "Aborted only the hero model request", fallbackVisible, navigationAvailable, recovered };
}
