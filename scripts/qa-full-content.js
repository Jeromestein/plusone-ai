async(page)=>{
 const isolatedContext=await page.context().browser().newContext();page=await isolatedContext.newPage();
 try {

 const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,12000));});page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:3000/editions/winter2026');await page.setViewportSize({width:1280,height:720});await page.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete',{},{timeout:30000});await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');
 const rives=await page.locator('.native-rive').evaluateAll(nodes=>nodes.map(n=>n.closest('article')?.id).filter(Boolean));const results=[];
 for(const id of rives){
  await page.locator(`#${id} .native-rive`).scrollIntoViewIfNeeded();
  try {await page.waitForFunction(id=>document.querySelector(`#${id} .native-rive`)?.dataset.riveStatus==='ready',id,{timeout:30000});} catch(error){throw new Error(id+' failed to become ready: '+JSON.stringify(errors));}
  await page.waitForTimeout(500);
  results.push({id,status:await page.locator(`#${id} .native-rive`).getAttribute('data-rive-status'),size:await page.locator(`#${id} .native-rive`).boundingBox()});
  if(['sidekick-pulse','rollouts','shopify-simgym-app','dynamic-shop-storefronts'].includes(id))await page.screenshot({path:`output/playwright/full-content-${id}.png`});
 }
 await page.locator('[data-component-extra-skill-id="editions"]').click();await page.getByRole('dialog').waitFor();await page.screenshot({path:'output/playwright/full-skill-dialog.png'});const skillDialog=await page.getByRole('dialog').innerText();await page.keyboard.press('Escape');
 await page.locator('#sidekick-apps-interactive-card-0').click();await page.getByRole('dialog').waitFor();await page.waitForTimeout(700);const appDialog=await page.getByRole('dialog').innerText();await page.screenshot({path:'output/playwright/full-app-dialog.png'});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByPlaceholder('Search 200 product updates').fill('catalog');const searchResults=await page.locator('#edition-panel nav a').count();await page.keyboard.press('Escape');
 return {products:await page.locator('[data-component-name="product"]').count(),rives:results,skillDialog,appDialog,searchResults,errors:[...new Set(errors)],failures};

 } finally {await isolatedContext.close();}
}