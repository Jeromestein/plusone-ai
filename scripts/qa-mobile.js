async (page) => {
  await page.goto("about:blank");
  const failures = [];
  const errors = [];
  const requests = [];
  page.on("requestfailed", (request) =>
    failures.push({ url: request.url(), error: request.failure()?.errorText }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push({ url: response.url(), status: response.status() });
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3000/editions/winter2026", {
    waitUntil: "networkidle",
  });
  await page
    .locator('[data-renderer="native-next-three"][data-status="ready"]')
    .waitFor();
  await page.locator('canvas[data-intro="complete"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const checkpoints = [];
  for (const [name, y] of [
    ["hero", 0],
    ["transition-start", 400],
    ["transition-mid", 800],
    ["sidekick", 1250],
    ["return-hero", 0],
  ]) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      y,
    );
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `output/playwright/native-mobile-${name}.png`,
    });
    checkpoints.push(
      await page.evaluate(
        (name) => ({
          name,
          renderer: document
            .querySelector("[data-renderer]")
            ?.getAttribute("data-renderer"),
          scene: document.querySelector("canvas")?.dataset.scene,
          progress: document.querySelector("canvas")?.dataset.progress,
          remixRuntime:
            typeof window.__remixContext !== "undefined" ||
            typeof window.__remixManifest !== "undefined",
          y: window.scrollY,
          canvases: [...document.querySelectorAll("canvas")].map((c) => ({
            width: c.width,
            height: c.height,
          })),
          heading: [...document.querySelectorAll("h2")]
            .slice(0, 2)
            .map((h) => ({
              text: h.textContent,
              top: h.getBoundingClientRect().top,
            })),
          overflow: document.documentElement.scrollWidth > innerWidth,
        }),
        name,
      ),
    );
  }
  const archivedScripts = requests.filter(
    (url) => url.includes("/oxygen-v2/") && /\.js(?:\?|$)/.test(url),
  );
  const nextScripts = requests.filter(
    (url) => url.includes("/_next/") && /\.js(?:\?|$)/.test(url),
  ).length;
  if (
    archivedScripts.length ||
    checkpoints.some((check) => check.remixRuntime || check.overflow)
  )
    throw new Error("Native runtime or viewport checks failed.");
  return {
    checkpoints,
    archivedScripts,
    nextScripts,
    failures,
    errors: [...new Set(errors)],
    externalRequests: [
      ...new Set(
        requests.filter(
          (u) => /^https?:/.test(u) && !u.startsWith("http://127.0.0.1:3000/"),
        ),
      ),
    ],
  };
};
