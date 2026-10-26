async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let release;
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/*Hero_251207v3*.glb", async (route) => {
    await hold;
    await route.continue();
  });
  await page.goto("http://127.0.0.1:3000/editions/winter2026", {
    waitUntil: "domcontentloaded",
  });
  const sample = () =>
    page.evaluate(() => ({
      status: document.querySelector(".renaissance-experience").dataset.status,
      opening: document.querySelector(".renaissance-experience").dataset
        .opening,
      canvas: { ...document.querySelector(".painting-stage canvas").dataset },
      coarse: matchMedia("(pointer: coarse)").matches,
      overflow: document.documentElement.scrollWidth > innerWidth,
      chapters: document.querySelectorAll("[data-section-id]").length,
      time: performance.now(),
    }));
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.status ===
      "fallback",
    null,
    { timeout: 22000 },
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.opening ===
      "complete",
  );
  const stalled = await sample();
  release();
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.status ===
      "ready",
    null,
    { timeout: 30000 },
  );
  const recovered = await sample();
  await page.unroute("**/*Hero_251207v3*.glb");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document.querySelector(".painting-stage canvas")?.dataset.intro ===
      "complete",
    null,
    { timeout: 30000 },
  );
  const touch = await sample();
  await page.screenshot({ path: "output/playwright/fidelity-touch-hero.png" });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.detach();
  await page.setViewportSize({ width: 1280, height: 720 });
  return { stalled, recovered, touch, errors };
};
