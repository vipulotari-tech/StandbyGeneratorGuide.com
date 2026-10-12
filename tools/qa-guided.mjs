import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { browserOptions } from './browser-options.mjs';
const browser=await chromium.launch(browserOptions);
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const base=process.env.BASE_URL??'http://127.0.0.1:8321';
try {
 await page.goto(base+'/planning/sizing/');
 await page.getByText('Choose your home’s equipment',{exact:true}).click();
 await page.locator('[data-guided-reference="Refrigerator"]').check();
 await page.locator('[data-guided-unknown="EV charging"]').check();
 await page.locator('#guided-create').click();
 assert.equal(await page.locator('.load-row').count(),2);
 assert.equal(await page.locator('.load-row').nth(1).locator('[data-key=running]').inputValue(),'');
 assert.equal(await page.locator('.load-row').first().locator('[data-key=basis]').inputValue(),'reference');
 await page.locator('[type=submit]').click();
 assert.equal(await page.locator('#load-results h2').count(),0,'unknown load must block sizing');
 const ev=page.locator('.load-row').nth(1);
 await ev.locator('[data-key=running]').fill('7000');await ev.locator('[data-key=starting]').fill('7000');
 await ev.locator('[data-key=essential]').selectOption('false');await ev.locator('[data-key=managed]').selectOption('true');
 await ev.locator('[data-key=notes]').fill('TEST fixture only');
 await page.locator('[type=submit]').click();assert.match(await page.locator('#load-results').innerText(),/lack a declared manufacturer/);
 await page.locator('#save-plan').click();await page.reload();await page.locator('#load-plan').click();
 assert.equal(await page.locator('.load-row').nth(1).locator('[data-key=notes]').inputValue(),'TEST fixture only');
 await page.getByText('Choose your home’s equipment',{exact:true}).click();await page.locator('#guided-create').click();
 assert.equal(await page.locator('.load-row').count(),2);assert.match(await page.locator('.form-error').innerText(),/kept/);
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.equal(result.violations.length,0,JSON.stringify(result.violations));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'.qa/guided-mobile.png',fullPage:true});
 for(const route of ['/research/','/research/evidence-ledger/','/research/local-service/','/installation/state-research/']){
  await page.goto(base+route);assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route);
  const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.equal(a.violations.length,0,route+JSON.stringify(a.violations));
 }
 console.log('Guided sizing unknown inputs, source labels, saved notes, overwrite prevention, mobile and research accessibility PASS');
} finally {await browser.close();}
