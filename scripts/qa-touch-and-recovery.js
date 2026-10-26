async(page)=>{
 const browser=page.context().browser();const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const phone=await touch.newPage();const errors=[];phone.on('pageerror',e=>errors.push(e.message));
 try{
  await phone.goto('http://127.0.0.1:3000/editions/winter2026');await phone.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete',{},{timeout:30000});
  await phone.screenshot({path:'output/playwright/full-touch-hero.png'});const scenes=[];
  for(const id of ['sidekick','agentic','online','retail','marketing','checkout','operations','shop-app','b2b','finance','shipping','developer']){
   await phone.evaluate(id=>scrollTo({top:document.getElementById(id).getBoundingClientRect().top+scrollY,behavior:'instant'}),id);
   await phone.waitForFunction(id=>{const c=document.querySelector('.painting-stage canvas');return c?.dataset.scene===id&&!c.dataset.loadingScene;},id,{timeout:20000});scenes.push(id);
  }
  await phone.screenshot({path:'output/playwright/full-touch-developer.png'});
  const physical={coarse:await phone.evaluate(()=>matchMedia('(pointer:coarse)').matches),scenes,overflow:await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors};
  const recovery=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'});const p=await recovery.newPage();
  try{
   await p.route('**/*Hero_251207v3*.glb',r=>r.abort());await p.goto('http://127.0.0.1:3000/editions/winter2026');await p.locator('.scene-notice').waitFor({timeout:30000});const fallback=await p.locator('.renaissance-experience').getAttribute('data-status');
   await p.unroute('**/*Hero_251207v3*.glb');await p.getByRole('button',{name:'Try again',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.painting-stage canvas')?.dataset.intro==='complete',{},{timeout:30000});
   return {physical,fallback,retry:await p.locator('.renaissance-experience').getAttribute('data-status')};
  }finally{await recovery.close();}
 }finally{await touch.close();}
}
