async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:3000/#shopify');
  await page.waitForFunction(() => document.querySelector('.renaissance-experience')?.dataset.status === 'ready', null, { timeout: 30000 });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  const visit = async (id, scene) => {
    await page.evaluate(id => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY + 1), id);
    await page.waitForFunction(scene => {
      const canvas = document.querySelector('.painting-stage canvas');
      return canvas?.dataset.scene === scene && !canvas.dataset.loadingScene;
    }, scene, { timeout: 30000 });
    await page.waitForTimeout(500);
  };
  await visit('shopify', 'checkout');
  await page.mouse.move(745, 125);
  await page.waitForTimeout(200);
  const hatCursor = await page.evaluate(() => document.body.style.cursor);
  await page.mouse.click(745, 125);
  await page.getByRole('dialog', { name: 'Interactive storefront concept' }).waitFor();
  const destination = await page.getByRole('link', { name: 'Explore our e-commerce services' }).getAttribute('href');
  const checkoutCount = await page.getByRole('dialog').locator('a[href^="https://"]').count();
  if (destination !== '#ecommerce' || checkoutCount) throw new Error('Unexpected merchandise destination');
  await page.screenshot({ path: 'output/playwright/plusone-storefront-concept.png' });
  await page.keyboard.press('Escape');
  await visit('operations', 'operations');
  await page.mouse.move(640, 390);
  await page.waitForTimeout(200);
  const globeCursor = await page.evaluate(() => document.body.style.cursor);
  await page.mouse.down();
  const dragging = await page.locator('.painting-stage canvas').getAttribute('data-dragging');
  await page.mouse.move(820, 390, { steps: 15 });
  await page.mouse.up();
  if (dragging !== 'true') throw new Error('Globe did not enter dragging state');
  await visit('process', 'shipping');
  const popupWait = page.waitForEvent('popup');
  const key = page.getByRole('button', { name: 'Explore the interactive key artwork', exact: true });
  await key.focus();
  await key.press('Enter');
  const popup = await popupWait;
  popup.on('pageerror', error => errors.push(error.message));
  await popup.waitForFunction(() => document.querySelector('.key-explorer')?.dataset.loaded === 'true', null, { timeout: 30000 });
  const keyState = await popup.locator('canvas').getAttribute('data-key-state');
  await popup.screenshot({ path: 'output/playwright/plusone-key-popup.png' });
  await popup.close();
  return { hatCursor, destination, checkoutCount, globeCursor, dragging, keyState, errors: [...new Set(errors)] };
}
