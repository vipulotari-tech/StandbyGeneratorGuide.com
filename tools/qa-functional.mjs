import { browserOptions } from './browser-options.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.BASE_URL??'http://127.0.0.1:8321';
const options=browserOptions;
const browser=await chromium.launch(options),context=await browser.newContext(),page=await context.newPage();
const errors=[],report={routes:0,buttons:0,disclosures:0,images:0,cases:[],accessibility:[]};
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const go=async path=>{const r=await page.goto(base+path);assert(r.ok(),path);};
const field=(n,v)=>page.locator(`[name="${n}"]`).fill(String(v));
const submit=()=>page.locator('[type=submit]').click();
const check=(name)=>{report.cases.push(name);console.log('Functional case PASS:',name);};
async function fits(label){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);}
async function roundTrip(key){
 const before=await page.locator('.planner-form [name]').evaluateAll(cs=>cs.map(c=>[c.name,c.value]));
 await page.locator('#save-plan').click();await page.reload();await page.locator('#load-plan').click();
 assert.deepEqual(await page.locator('.planner-form [name]').evaluateAll(cs=>cs.map(c=>[c.name,c.value])),before,key+' restores exact fields');
 await submit();await page.locator('#clear-plan').click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
 check(key+' save/reload/load/delete');
}
async function printCheck(name){
 await page.evaluate(()=>{window.__prints=0;window.print=()=>{window.dispatchEvent(new Event('beforeprint'));window.__prints++;window.dispatchEvent(new Event('afterprint'));};});
 await page.locator('#print-plan').click();assert.equal(await page.evaluate(()=>window.__prints),1,name+' print handler');
 await page.pdf({path:`.qa/${name}-audit.pdf`,format:'Letter',printBackground:true});
 check(name+' print button and PDF');
}
try{
 // Inventory every generated page and exercise every native disclosure, not just hand-picked guides.
 const routes=fs.readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('index.html')).map(f=>'/'+f.replace(/index\.html$/,'').replaceAll('\\','/'));
 await page.setViewportSize({width:390,height:844});
 for(const route of (process.env.FUNCTIONAL_FLOW_ONLY?[]:routes)){
  await go(route);report.routes++;if(report.routes%20===0)console.log(`Audited ${report.routes}/${routes.length} routes`);await fits(route);
  const buttons=await page.locator('button').all();report.buttons+=buttons.length;
  for(const button of buttons)assert((await button.getAttribute('aria-label'))||(await button.innerText()).trim(),'Unnamed button '+route);
  const details=await page.locator('details').all();
  for(const d of details){const before=await d.getAttribute('open');await d.locator('summary').first().click();assert.notEqual(await d.getAttribute('open'),before,'Disclosure '+route);await d.locator('summary').first().click();report.disclosures++;}
  await fits(route+' expanded/collapsed');
  // Below-the-fold lazy images are not requested until they approach the viewport.
  // Exercise native loading and require successful decoding before checking dimensions.
  for(const image of await page.locator('img').all()){
   await image.scrollIntoViewIfNeeded();
   await image.evaluate(async img=>{
    await Promise.race([
     img.decode(),
     new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image load timed out: '+img.getAttribute('src'))),15000))
    ]);
   });
  }
  const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),complete:i.complete,width:i.naturalWidth})));
  for(const image of images)assert(image.complete&&image.width>0,'Image failed '+route+' '+image.src);report.images+=images.length;
 }
 for(const width of [320,360,390,430,768,1024]){
  await page.setViewportSize({width,height:320});await go('/');
  if(width>=1024){
   assert.equal(await page.locator('#menu-btn').isVisible(),false,'Desktop menu toggle stays hidden');
   assert.equal(await page.locator('nav[aria-label="Primary"]').isVisible(),true,'Desktop navigation is visible');
   await fits('Desktop navigation');continue;
  }
  await page.locator('#menu-btn').click();assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'),'true');
  assert(await page.locator('#mobile-nav').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#menu-btn').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.id),'menu-btn');
 }
 check('Mobile menu open/Escape/focus at five widths and 320px height; desktop navigation at 1024px');
 await page.setViewportSize({width:390,height:844});await go('/planning/sizing/');
 assert.equal(await page.locator('.load-example-button').count(),3);
 await page.locator('[data-load-example=essentials]').click();assert.equal(await page.locator('.load-row').count(),5);assert.match(await page.locator('#save-status').innerText(),/illustrative value/);
 await page.locator('[data-load-example=comfort]').click();assert.equal(await page.locator('.load-row').count(),5);assert.match(await page.locator('.form-error').innerText(),/not empty/);
 await page.locator('#reset-plan').click();assert.equal(await page.locator('.load-row').count(),0);check('Sizing quick-start examples are sourced, load correctly and never overwrite existing rows');
 await page.locator('#load-type').selectOption({label:'Well pump'});await page.locator('#add-load').click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'name');
 let row=page.locator('.load-row').first();await row.locator('[data-key=running]').fill('1000');await row.locator('[data-key=starting]').fill('3000');await row.locator('[data-key=quantity]').fill('2');
 await page.locator('#load-type').selectOption({label:'Electric water heater'});await page.locator('#add-load').click();row=page.locator('.load-row').last();await row.locator('[data-key=running]').fill('4500');await row.locator('[data-key=starting]').fill('4500');await row.locator('[data-key=essential]').selectOption('false');await row.locator('[data-key=managed]').selectOption('true');await row.locator('[data-key=priority]').fill('2');
 await submit();assert.match(await page.locator('#load-results').innerText(),/10\.5 kW/);await fits('Populated sizing');
 const rowsBefore=await page.locator('.load-row [data-key]').evaluateAll(cs=>cs.map(c=>c.value));await roundTrip('hgg-load-v1');assert.deepEqual(await page.locator('.load-row [data-key]').evaluateAll(cs=>cs.map(c=>c.value)),rowsBefore);
 // A malformed late row must not erase an otherwise valid unsaved plan.
 await page.evaluate(()=>localStorage.setItem('hgg-load-v1',JSON.stringify({version:2,controls:{margin:'35'},rows:[null]})));await page.locator('#load-plan').click();assert.deepEqual(await page.locator('.load-row [data-key]').evaluateAll(cs=>cs.map(c=>c.value)),rowsBefore);assert.equal(await page.locator('[name=margin]').inputValue(),'20');
 await printCheck('sizing');await page.locator('.remove-load').last().click();assert.equal(await page.locator('.load-row').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.key),'name');await page.locator('.remove-load').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'add-load');check('Load add/remove focus, quantities, managed scenarios and atomic corrupt-save recovery');
 for(let i=0;i<40;i++)await page.locator('#add-load').click();await page.locator('#add-load').click();assert.equal(await page.locator('.load-row').count(),40);assert.match(await page.locator('.form-error').innerText(),/Limit 40/);await page.locator('#reset-plan').click();assert.equal(await page.locator('.load-row').count(),0);check('40-load limit and reset');
 await go('/planning/fuel/');const presets=await page.locator('#fuel-preset option').count();
 for(let i=1;i<presets;i++){await page.locator('#fuel-preset').selectOption({index:i});assert(await page.locator('#fuel-source a').count());assert(Number(await page.locator('[name=ngRate]').inputValue())>0);assert(Number(await page.locator('[name=lpRate]').inputValue())>0);}
 check(`All ${presets-1} manufacturer fuel presets`);
 await field('ngPrice',1.50);await field('lpPrice',3);await field('maintenance',300);await roundTrip('hgg-fuel-v1');
 await field('size',40);assert.equal(await page.locator('#fuel-preset').inputValue(),'');await field('customSource','Documented custom scenario '+ 'X'.repeat(1500));await field('ngRate',200);await field('lpRate',2);await submit();await fits('Long custom fuel source');await roundTrip('hgg-fuel-v1');assert.equal(await page.locator('[name=size]').inputValue(),'40');await printCheck('fuel');
 await field('fillPercent',10);await field('reservePercent',20);await submit();assert.match(await page.locator('.form-error').innerText(),/greater than/);await page.locator('#reset-plan').click();assert.equal(await page.locator('[name=ngPrice]').inputValue(),'');assert.equal(await page.locator('#fuel-results').innerText(),'');check('Fuel custom attribution, exact save restoration, invalid tank and reset');
 await go('/planning/ownership/');const budget={equipment:6000,installation:5000,permits:200,ats:1500,fuelSystem:2000,warranty:300,maintenance:300,monitoring:50,battery:200,batteryInterval:5,consumables:50,repairs:100,annualHours:100,fuelRate:2,fuelPrice:3};for(const [k,v] of Object.entries(budget))await field(k,v);await submit();assert.match(await page.locator('#ownership-results').innerText(),/\$32,100/);await roundTrip('hgg-ownership-v1');await printCheck('ownership');
 await page.locator('[name=fuelUnit]').selectOption('therm');assert.equal(await page.locator('[name=fuelRate]').inputValue(),'');assert.equal(await page.locator('[name=fuelPrice]').inputValue(),'');await field('fuelRate',2);await field('fuelPrice',1.5);await field('batteryInterval',1.5);await submit();assert.equal(await page.locator('[name=batteryInterval]').evaluate(e=>e.validity.stepMismatch),true);await page.locator('#reset-plan').click();assert.equal(await page.locator('[name=equipment]').inputValue(),'');check('Ownership unit changes, invalid interval and reset');
 await go('/planning/quotes/');await field('A-total',15000);const scope=page.locator('[data-quote=A] details').nth(1);await scope.locator('summary').click();await page.locator('[name=A-gasLine-status]').selectOption('excluded');await field('A-gasLine-adjustment',-100);await scope.locator('summary').click();await submit();assert.notEqual(await scope.getAttribute('open'),null);assert.equal(await page.evaluate(()=>document.activeElement.name),'A-gasLine-adjustment');await field('A-gasLine-adjustment',1200);await submit();assert.match(await page.locator('#quote-results').innerText(),/\$16,200/);await fits('Populated quote comparison');await roundTrip('hgg-quotes-v1');
 // Exercise all five scope states on all three columns against independent expected sums.
 for(const [letter,total,add] of [['A',10000,500],['B',11000,300],['C',12000,0]]){
  await field(`${letter}-total`,total);const d=page.locator(`[data-quote=${letter}] details`).nth(1);if(await d.getAttribute('open')===null)await d.locator('summary').click();
  for(const select of await d.locator('select').all())await select.selectOption('included');
  for(const input of await d.locator('input').all())await input.fill('');
  await page.locator(`[name=${letter}-gasLine-status]`).selectOption('allowance');await field(`${letter}-gasLine-adjustment`,add);
  await page.locator(`[name=${letter}-pad-status]`).selectOption('na');
 }
 await submit();const output=await page.locator('#quote-results').innerText();for(const expected of ['$10,500','$11,300','$12,000'])assert(output.includes(expected));await printCheck('quotes');check('Three quotes: all scope states, incomplete warnings, top-ups, and hidden invalid field recovery');
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.equal(axe.violations.length,0,JSON.stringify(axe.violations));report.accessibility.push({page:'expanded populated quotes',violations:0});
 await page.locator('#reset-plan').click();assert.equal(await page.locator('[name=A-total]').inputValue(),'');check('Quote reset');
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.removeItem=()=>{throw new DOMException('Blocked','SecurityError')};});
 for(const id of ['save-plan','load-plan','clear-plan']){await page.locator('#'+id).click();assert((await page.locator('#save-status').innerText()).length>0);}check('Blocked browser storage gracefully reported');
 await go('/maintenance/maintenance-log/');await page.evaluate(()=>{window.__prints=0;window.print=()=>window.__prints++});await page.locator('#print-log').click();assert.equal(await page.evaluate(()=>window.__prints),1);check('Maintenance log print action');
 await go('/contact/');assert.equal(await page.locator('form').getAttribute('action'),'mailto:hello@standbygeneratorguide.com');assert.equal(await page.locator('#c-subject').getAttribute('required'),'');assert.equal(await page.locator('#c-body').getAttribute('required'),'');check('Contact email composition target and required fields inspected; no message sent');
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
// Separate browser avoids single-process Chromium cross-context limitations in the local runtime.
const offlineBrowser=await chromium.launch(options),offline=await offlineBrowser.newContext({javaScriptEnabled:false}),p=await offline.newPage();
try{
 for(const tool of ['sizing','quotes','fuel','ownership']){await p.goto(base+'/planning/'+tool+'/');assert.equal(await p.locator('[type=submit]').isDisabled(),true);for(const b of await p.locator('.planner-actions button').all())assert(await b.isDisabled());}
 await p.goto(base+'/planning/quotes/');await p.locator('[name=A-total]').fill('12345');await p.locator('[name=A-total]').press('Enter');assert.equal(new URL(p.url()).search,'');check('JavaScript-disabled planners cannot submit entered data to URL/server');
}finally{await offlineBrowser.close();}
fs.mkdirSync('.qa',{recursive:true});fs.writeFileSync('.qa/functional-audit.json',JSON.stringify(report,null,2));console.log('Functional audit PASS',JSON.stringify(report));
