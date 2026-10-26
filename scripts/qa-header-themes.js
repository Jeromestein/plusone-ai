async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:1280,height:720}});page=await context.newPage();const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:3000/editions/winter2026');await page.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete');
 const result=[];
 for(const id of ['operations','developer']){
 await page.locator(`.chapter-navigation a[href="#${id}"]`).click();await page.waitForFunction(id=>document.querySelector('.painting-stage canvas')?.dataset.scene===id,id);await page.waitForTimeout(1000);
 result.push(await page.evaluate(()=>{const r=document.querySelector('.renaissance-experience'),h=document.querySelector('.edition-header'),t=document.querySelector('.renaissance-title');return {scene:document.querySelector('.painting-stage canvas').dataset.scene,theme:r.dataset.headerTheme,solid:r.dataset.headerSolid,headerColor:getComputedStyle(h).color,headerBackground:getComputedStyle(h).backgroundColor,titleColor:getComputedStyle(t).color,titleFilter:getComputedStyle(t).filter};}));
 await page.screenshot({path:`output/playwright/full-header-${id}.png`});
 }
 return {result,errors};
 }finally{await context.close();}
}