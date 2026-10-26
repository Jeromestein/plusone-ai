async (page) => {
  const errors = [],
    failures = [],
    samples = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith("http://127.0.0.1:3000"))
      failures.push({ url: r.url(), status: r.status() });
  });
  await page.goto("about:blank");
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:3000/editions/winter2026", {
    waitUntil: "domcontentloaded",
  });
  const sample = async () =>
    page.evaluate(() => {
      const root = document.querySelector(".renaissance-experience"),
        nav = document.querySelector('[data-section-name="side-and-lines"]'),
        canvas = document.querySelector(".painting-stage canvas"),
        title = document.querySelector(".renaissance-title");
      return {
        time: performance.now(),
        status: root?.dataset.status,
        phase: root?.dataset.opening,
        nav: { ...nav?.dataset },
        canvas: { ...canvas?.dataset },
        title: title
          ? {
              x: title.getBoundingClientRect().x,
              y: title.getBoundingClientRect().y,
              translate: getComputedStyle(title).translate,
            }
          : null,
      };
    });
  for (let i = 0; i < 28; i++) {
    const value = await sample();
    samples.push(value);
    if (i < 4 || value.phase !== samples.at(-2)?.phase)
      await page.screenshot({
        path: `output/playwright/fidelity-opening-phase-${i}-${value.phase}.png`,
      });
    if (value.phase === "complete" && value.canvas.intro === "complete") break;
    await page.waitForTimeout(200);
  }
  await page.waitForFunction(
    () =>
      document.querySelector(".painting-stage canvas")?.dataset.intro ===
      "complete",
    null,
    { timeout: 30000 },
  );
  await page.screenshot({ path: "output/playwright/fidelity-hero-final.png" });
  const geometry = await page
    .locator("[data-section-id]")
    .evaluateAll((els) =>
      els.map((e) => ({
        id: e.id,
        top: e.getBoundingClientRect().top + scrollY,
        height: e.getBoundingClientRect().height,
      })),
    );
  const camera = [];
  for (const scroll of [100, 450, 850, 1080]) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      scroll,
    );
    await page.waitForTimeout(900);
    camera.push(await sample());
    await page.screenshot({
      path: `output/playwright/fidelity-transition-${scroll}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(700);
  const mobile = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    title: document
      .querySelector(".renaissance-title")
      .getBoundingClientRect()
      .toJSON(),
    frame: document
      .querySelector(".hero-frame")
      .getBoundingClientRect()
      .toJSON(),
  }));
  await page.screenshot({ path: "output/playwright/fidelity-mobile-hero.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.opening ===
      "complete",
    null,
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".painting-stage canvas")?.dataset.intro ===
      "complete",
    null,
    { timeout: 30000 },
  );
  const reduced = await sample();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/*Hero_251207v3*.glb", (route) => route.abort());
  await page.goto("about:blank");
  await page.goto("http://127.0.0.1:3000/editions/winter2026");
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.status ===
      "fallback",
    null,
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.opening ===
      "complete",
    null,
    { timeout: 10000 },
  );
  const fallback = await sample();
  await page.screenshot({
    path: "output/playwright/fidelity-opening-fallback.png",
  });
  await page.unroute("**/*Hero_251207v3*.glb");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".renaissance-experience")?.dataset.status ===
      "ready",
    null,
    { timeout: 30000 },
  );
  const retry = await sample();
  return {
    samples,
    geometry,
    camera,
    mobile,
    reduced,
    fallback,
    retry,
    errors,
    failures,
  };
};
