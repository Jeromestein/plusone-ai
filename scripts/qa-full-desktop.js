async (page) => {
 const isolatedContext=await page.context().browser().newContext();page=await isolatedContext.newPage();
 try {

 const errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,500));});
 page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.setViewportSize({width:1280,height:720});
 await page.goto('http://127.0.0.1:3000/editions/winter2026');
 await page.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete',{},{timeout:30000});
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
 await page.screenshot({path:'output/playwright/full-desktop-hero.png'});
 const sections=await page.locator('[data-section-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.id,top:n.getBoundingClientRect().top+scrollY,height:n.getBoundingClientRect().height})));
 const results=[];
 for(const {id} of sections){
  await page.evaluate(id=>{const n=document.getElementById(id);scrollTo(0,n.getBoundingClientRect().top+scrollY);},id);
  await page.waitForFunction(id=>{const c=document.querySelector('.painting-stage canvas');return c?.dataset.scene===id&&!c?.dataset.loadingScene;},id,{timeout:30000});
  await page.waitForTimeout(500);
  await page.screenshot({path:`output/playwright/full-desktop-${id}.png`});
  results.push({id,head:await page.locator(`#${id} h2`).first().boundingBox(),stage:await page.locator('.painting-stage canvas').evaluate(n=>({...n.dataset})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 return {sections,results,errors:[...new Set(errors)],failures};

 } finally {await isolatedContext.close();}
}