async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('about:blank');await page.setViewportSize({width:1280,height:720});
 await page.addInitScript(()=>{window.__openingSamples=[];const start=performance.now();const sample=()=>{const n=document.querySelector('[data-section-name="side-and-lines"]');if(n){const title=n.querySelector('h2'),border=n.querySelector('.davinci-lines__complete');window.__openingSamples.push({time:performance.now()-start,dataset:{...n.dataset},title:title?getComputedStyle(title).translate:null,border:border?getComputedStyle(border).strokeDashoffset:null});}if(performance.now()-start<14000)setTimeout(sample,100);};sample();});
 await page.goto('https://www.shopify.com/editions/winter2026',{waitUntil:'domcontentloaded',timeout:60000});
 const checkpoints=[];const started=Date.now();
 for(const t of [0,300,700,1200,1800,2500,3500,5000,7000]){const remaining=t-(Date.now()-started);if(remaining>0)await page.waitForTimeout(remaining);await page.screenshot({path:`output/playwright/fidelity-original-opening-${t}.png`});checkpoints.push({ms:t,actual:await page.evaluate(()=>performance.now()),status:await page.locator('[data-section-name="side-and-lines"]').getAttribute('data-sidebar-ready')});}
 return {checkpoints,samples:await page.evaluate(()=>window.__openingSamples),errors};
}