'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-software-rasterizer'],headless:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080},offline:true});
 const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 const project=path.resolve(__dirname,'..'),qa=process.env.QA_DIR||path.resolve(project,'../tmp/qa');fs.mkdirSync(qa,{recursive:true});
 await page.goto('file://'+project+'/index.html');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.slide').count(),8);assert.equal(await page.locator('#loading').count(),0);assert.equal(await page.locator('.katex-error').count(),0);
 const report={slides:[],operations:[],resolutions:[],errors,requests};
 for(let i=0;i<8;i++){
  await page.evaluate(i=>{Slides.show(i);if(i===3||i===4){for(let j=0;j<6;j++)Slides.advance();}else{const max=Slides.state.maxStep;for(let j=0;j<max;j++)Slides.advance();}},i);
  await page.waitForTimeout(250);
  const layout=await page.evaluate(()=>{
   const s=document.querySelector('.slide.active'),sr=s.getBoundingClientRect();
   const overflow=[...s.querySelectorAll('h1,h2,h3,p,.panel,.formula-card,.main-formula,.proof-conclusion,.endpoint-note,.certificate,.bottom-insight,.closing')].filter(el=>getComputedStyle(el).visibility!=='hidden').map(el=>({tag:el.className||el.tagName,rect:el.getBoundingClientRect(),text:el.textContent.slice(0,45)})).filter(x=>x.rect.bottom>sr.bottom+2||x.rect.right>sr.right-50||x.rect.left<sr.left+40).map(x=>({tag:x.tag,text:x.text}));
   const mathOverflow=[...s.querySelectorAll('[data-math]')].filter(el=>getComputedStyle(el).visibility!=='hidden').filter(el=>el.scrollWidth>el.clientWidth+2&&el.clientWidth>0).map(el=>({tex:el.dataset.math,scroll:el.scrollWidth,width:el.clientWidth}));
   return {page:Slides.state.page,overflow,mathOverflow};
  });report.slides.push(layout);await page.screenshot({path:path.join(qa,`slide-${i+1}.png`)});
 }
 // Step navigation and intro order.
 await page.evaluate(()=>Slides.show(0));assert.equal(await page.locator('.slide.active .reveal.visible').count(),0);await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>Slides.state.step),1);await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>Slides.state.step),2);await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>Slides.state.page),1);report.operations.push('keyboard and intro fragments');
 // Slider, open boundaries, peak singleton and empty strong cut.
 await page.locator('#lambda-slider').evaluate(el=>{el.value=1000;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>CutDemo.state.lambda),1000);await page.click('#cut-strong');assert(await page.locator('#cut-interval').innerText().then(x=>x.includes('∅')));await page.click('#cut-normal');await page.locator('#lambda-slider').evaluate(el=>{el.value=600;el.dispatchEvent(new Event('input',{bubbles:true}));});
 const before=await page.evaluate(()=>CutDemo.state.lambda);const box=await page.locator('#cut-plot').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.3);await page.mouse.up();assert.notEqual(await page.evaluate(()=>CutDemo.state.lambda),before);await page.click('#cut-sweep');await page.waitForTimeout(200);assert(await page.evaluate(()=>CutDemo.state.playing));await page.click('#cut-sweep');assert(!await page.evaluate(()=>CutDemo.state.playing));await page.click('#cut-reset');assert.deepEqual(await page.evaluate(()=>({lambda:CutDemo.state.lambda,strong:CutDemo.state.strong})),{lambda:600,strong:false});report.operations.push('lambda slider, SVG drag, open/closed endpoints, play/pause/reset');
 // H choices and legality.
 await page.evaluate(()=>Slides.show(2));for(const id of ['q','r']){await page.locator(`[data-choice="${id}"]`).check();assert(await page.evaluate(()=>Fuzzy.legal(Fuzzy.DEMO,600,TheoremDemo.choices)));await page.locator(`[data-choice="${id}"]`).uncheck();assert(await page.evaluate(()=>Fuzzy.legal(Fuzzy.DEMO,600,TheoremDemo.choices)));}report.operations.push('all visible H boundary toggles remain legal');
 // Recovery: step, progress, pause freeze, playback completion, leave and re-enter.
 for(const p of [3,4]){
  await page.evaluate(p=>Slides.show(p),p);const host=p===3?'#left-animation':'#right-animation';
  await page.click(`${host} [data-action=advance]`);assert.equal(await page.evaluate(p=>TheoremDemo.controllers[p-3].count,p),1);
  await page.locator(`${host} input`).evaluate(el=>{el.value=3;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(p=>TheoremDemo.controllers[p-3].count,p),3);
  await page.click(`${host} [data-action=play]`);await page.waitForTimeout(180);await page.click(`${host} [data-action=play]`);const cursor=await page.evaluate(p=>TheoremDemo.controllers[p-3].cursor,p);await page.waitForTimeout(200);assert.equal(await page.evaluate(p=>TheoremDemo.controllers[p-3].cursor,p),cursor);
  await page.click(`${host} [data-action=replay]`);await page.waitForFunction(p=>TheoremDemo.controllers[p-3].count===6,p,{timeout:16000});assert(!await page.evaluate(p=>TheoremDemo.controllers[p-3].playing,p));assert((await page.locator(`${host} .certificate-text`).innerText()).includes('✓'));
  assert.equal(await page.locator(`${host} .aggregate-set`).innerText(),p===3?'{ p, q, r }':'{ p }');
  await page.evaluate(()=>Slides.show(0));assert(!await page.evaluate(p=>TheoremDemo.controllers[p-3].playing,p));await page.evaluate(p=>Slides.show(p),p);assert.equal(await page.evaluate(p=>TheoremDemo.controllers[p-3].count,p),0);
 }report.operations.push('left/right genuine operations, progression, pause freeze, replay, exact certificate, page reset');
 // Proof fragments.
 await page.evaluate(()=>Slides.show(5));for(let i=1;i<=5;i++){await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>Slides.state.step),i);}assert.equal(await page.locator('.slide.active .reveal.visible').count(),5);report.operations.push('four proof directions and final conclusion appear progressively');
 // Course case exact buttons, c boundary, two full playback directions.
 await page.evaluate(()=>Slides.show(6));for(const checked of [false,true]){await page.locator('#case-boundary').setChecked(checked);await page.click('#case-intersection');assert((await page.locator('#case-status').innerText()).includes('{ a, b, c }'));await page.click('#case-union');assert((await page.locator('#case-status').innerText()).includes('{ a, b }'));}
 for(const side of ['left','right']){await page.click(`#case-${side}`);await page.waitForFunction(()=>!TheoremDemo.caseDemo.playing,null,{timeout:8000});assert((await page.locator('#case-status').innerText()).includes(side==='left'?'{ a, b, c }':'{ a, b }'));}
 await page.click('#case-reset');assert.equal(await page.evaluate(()=>TheoremDemo.caseDemo.side),null);report.operations.push('course values, c boundary invariance, exact intersection/union, left/right playback/reset');
 // Notes, rehearsal timer, screen click, fullscreen.
 await page.keyboard.press('n');assert(await page.locator('#notes-panel').isVisible());await page.keyboard.press('Escape');assert(!await page.locator('#notes-panel').isVisible());await page.keyboard.press('t');await page.waitForTimeout(1050);assert(!(await page.locator('#timer').innerText()).startsWith('00:00'));await page.keyboard.press('t');await page.click('#fullscreen');await page.waitForFunction(()=>!!document.fullscreenElement,null,{timeout:3000});report.fullscreen=await page.evaluate(()=>!!document.fullscreenElement);await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen()});await page.waitForFunction(()=>!document.fullscreenElement);await page.evaluate(()=>Slides.show(7));await page.click('.slide.active h2');assert.equal(await page.evaluate(()=>Slides.state.step),1);report.operations.push('notes, timer, fullscreen, blank-screen click');
 // Scaled screen modes.
 for(const [width,height] of [[2560,1440],[1366,768],[1280,800]]){const scaledContext=await browser.newContext({viewport:{width,height},offline:true}),scaledPage=await scaledContext.newPage();await scaledPage.goto('file://'+project+'/index.html');await scaledPage.evaluate(()=>{Slides.show(5);for(let j=0;j<5;j++)Slides.advance();});await scaledPage.waitForTimeout(150);const r=await scaledPage.locator('#deck').boundingBox();assert(r.width<=width+1&&r.height<=height+1);report.resolutions.push({width,height,stage:r});await scaledContext.close();}
 for(const slide of report.slides){assert.deepEqual(slide.overflow,[],`slide ${slide.page+1} layout overflow`);assert.deepEqual(slide.mathOverflow,[],`slide ${slide.page+1} formula overflow`);}
 assert.deepEqual(requests,[],'external network request');assert.deepEqual(errors,[],'page error');
 fs.writeFileSync(path.join(qa,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
