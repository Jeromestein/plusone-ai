async (page) => {
  const errors = [], failures = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForFunction(() => document.querySelector('.renaissance-experience')?.dataset.status === 'ready', null, { timeout: 30000 });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const sections = await page.locator('[data-artwork-scene]').evaluateAll(nodes => nodes.map(node => ({ id: node.id, scene: node.dataset.artworkScene })));
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 720 });
    for (const section of sections) {
      await page.evaluate(id => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + 1), section.id);
      await page.waitForFunction(scene => {
        const canvas = document.querySelector('.painting-stage canvas');
        return canvas?.dataset.scene === scene && !canvas.dataset.loadingScene;
      }, section.scene, { timeout: 30000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Horizontal overflow: ${width} / ${section.id}`);
      checks.push({ width, section: section.id, renderedScene: await page.locator('.painting-stage canvas').getAttribute('data-scene'), overflow });
    }
  }
  const studies = page.locator('.plusone-study');
  const studyChecks = [];
  for (let i = 0; i < await studies.count(); i++) {
    const study = studies.nth(i);
    await study.getByRole('button').nth(1).click();
    const title = await study.locator('h4').innerText();
    const pressed = await study.getByRole('button').nth(1).getAttribute('aria-pressed');
    if (pressed !== 'true') throw new Error(`Concept selection failed: ${i}`);
    studyChecks.push({ title, pressed });
  }
  await page.getByRole('button', { name: 'Open services menu', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.locator('dialog a[href="#ecommerce"]').click();
  await page.waitForFunction(() => location.hash === '#ecommerce' && !document.querySelector('dialog[open]'));
  await page.locator('#ecommerce .plusone-study').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/plusone-content-mobile-automated.png' });
  const destination = await page.evaluate(() => ({ hash: location.hash, top: document.getElementById('ecommerce').getBoundingClientRect().top, width: document.documentElement.scrollWidth }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedAnimation = await page.locator('#ecommerce .plusone-study-steps').evaluate(node => getComputedStyle(node, '::after').animationName);
  if (reducedAnimation !== 'none') throw new Error('Concept motion is not reduced');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const externalLinks = await page.locator('a[href^="http"]').evaluateAll(nodes => nodes.map(node => node.href));
  const counts = { scenes: sections.length, offerings: await page.locator('.plusone-offerings article').count(), studies: await studies.count() };
  return { counts, checks, studyChecks, destination, reducedAnimation, externalLinks, errors: [...new Set(errors)], failures };
}
