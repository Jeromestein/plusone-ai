async (page) => {
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
  const sections=await page.locator('[data-section-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.id,top:n.getBoundingClientRect().top+scrollY,height:n.getBoundingClientRect().height})));
  const results=[];
  for(const id of ['sidekick','agentic','online','retail','marketing','checkout','operations','shop-app','b2b','finance','shipping','developer']){
    await page.evaluate(id=>{const n=document.getElementById(id);window.scrollTo(0,n.getBoundingClientRect().top+scrollY);},id);
    await page.waitForTimeout(900);
    await page.screenshot({path:`output/playwright/reference-full-${id}.png`});
    results.push({id,head:await page.locator(`#${id} h2`).first().boundingBox()});
  }
  return {sections,results};
}
