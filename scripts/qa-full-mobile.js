async(page)=>{
 const isolatedContext=await page.context().browser().newContext();page=await isolatedContext.newPage();
 try {

 const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,400));});page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000/editions/winter2026');await page.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete',{},{timeout:30000});
 await page.evaluate(()=>document.documentElement.style.scrollBehavior='auto');const results=[];
 for(const id of ['hero','sidekick','agentic','online','retail','marketing','checkout','operations','shop-app','b2b','finance','shipping','developer']){
  await page.evaluate(id=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY),id);
  await page.waitForFunction(id=>{const c=document.querySelector('.painting-stage canvas');return c?.dataset.scene===id&&!c.dataset.loadingScene;},id,{timeout:25000});await page.waitForTimeout(300);
  await page.screenshot({path:`output/playwright/full-mobile-${id}.png`});results.push({id,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('button',{name:'Search the Edition',exact:true}).click();await page.getByPlaceholder('Search 200 product updates').fill('Sidekick');const count=await page.locator('#edition-panel nav a').count();await page.keyboard.press('Escape');
 await page.locator('#sidekick-pulse').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#sidekick-pulse .native-rive')?.dataset.riveStatus==='ready');await page.screenshot({path:'output/playwright/full-mobile-pulse.png'});
 await page.locator('[data-component-extra-skill-id="editions"]').click();const skill=await page.getByRole('dialog').isVisible();await page.screenshot({path:'output/playwright/full-mobile-skill.png'});await page.keyboard.press('Escape');
 return {results,searchResults:count,skill,errors:[...new Set(errors)],failures};

 } finally {await isolatedContext.close();}
}