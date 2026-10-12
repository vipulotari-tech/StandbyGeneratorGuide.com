import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const widths = [320,360,375,390,414,430,768,820,1024,1280,1440,1920];
const routes = fs.readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('index.html')).map(f=>'/'+f.replaceAll('\\','/').replace(/index\.html$/,'')).sort();
const out=process.env.QA_OUTPUT??'.qa/matrix'; fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve('dist','.'+pathname); if(!file.startsWith(path.resolve('dist')+path.sep)&&file!==path.resolve('dist')){res.writeHead(403);res.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'}[path.extname(file)]??'application/octet-stream';res.setHeader('Content-Type',type);res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.BASE_URL??`http://127.0.0.1:${server.address().port}`;
const options={headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS??'["--no-sandbox","--no-zygote","--single-process","--disable-gpu","--disable-software-rasterizer"]')}: {})};
const browser=await chromium.launch(options);const context=await browser.newContext();const page=await context.newPage();const results=[];let current;
page.on('pageerror',error=>current?.errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')current?.errors.push(message.text());});
try{
 for(const route of routes){
  current={route,errors:[],viewports:[],disclosuresTested:0};results.push(current);
  await page.setViewportSize({width:390,height:900});
  const response=await page.goto(base+route,{waitUntil:'load'});current.status=response.status();
  await page.evaluate(()=>document.fonts.ready);
  current.inventory=await page.evaluate(()=>({h1:document.querySelectorAll('h1').length,title:document.title,description:document.querySelector('meta[name=description]')?.content,canonical:document.querySelector('link[rel=canonical]')?.href,robots:document.querySelector('meta[name=robots]')?.content,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),controls:[...document.querySelectorAll('button,input,select,textarea,summary')].map(e=>({tag:e.tagName,type:e.type,id:e.id,name:e.name,label:e.getAttribute('aria-label')??e.textContent?.trim().slice(0,100),visible:!!e.getClientRects().length})),tables:document.querySelectorAll('table').length}));
  const menu=page.locator('#menu-btn');
  await menu.click();
  if(await menu.getAttribute('aria-expanded')!=='true')current.errors.push('Menu did not open');
  await page.keyboard.press('Escape');
  if(await menu.getAttribute('aria-expanded')!=='false')current.errors.push('Menu Escape did not close');
  await menu.press('Enter');
  await page.setViewportSize({width:1280,height:900});
  // Viewport resizing and its DOM event are asynchronous. Assert the completed
  // transition rather than sampling between setViewportSize and resize dispatch.
  await page.waitForFunction(()=>document.getElementById('menu-btn')?.getAttribute('aria-expanded')==='false');
  if(await menu.getAttribute('aria-expanded')!=='false')current.errors.push('Menu remained expanded on desktop');
  await page.setViewportSize({width:390,height:900});
  current.menuTested=true;
  for(const d of await page.locator('details:visible').all()){
   const before=await d.getAttribute('open');await d.locator('summary').click();if((await d.getAttribute('open'))===before)current.errors.push('Disclosure failed to toggle');await d.locator('summary').click();current.disclosuresTested++;
  }
  current.images=[];
  for(const img of await page.locator('img').all()){
   await img.scrollIntoViewIfNeeded();try{await img.evaluate(e=>e.decode());}catch{current.images.push(await img.getAttribute('src'));}
  }
  for(const width of widths){
   await page.setViewportSize({width,height:900});
   const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   current.viewports.push({width,...geometry,pass:geometry.scroll<=geometry.viewport});
   if(geometry.scroll>geometry.viewport)await page.screenshot({path:`${out}/${route.replaceAll('/','_')}-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:900});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  current.accessibility=axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  if(current.accessibility.length)await page.screenshot({path:`${out}/${route.replaceAll('/','_')}-axe.png`,fullPage:true});
  if(results.length%10===0)console.log(`Matrix ${results.length}/${routes.length}`);
  fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,widths,results},null,2));
 }
}finally{await browser.close();server.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,widths,results},null,2));}
const failures=results.filter(r=>r.status!==200||r.errors.length||r.images.length||r.inventory.h1!==1||r.viewports.some(v=>!v.pass)||r.accessibility.length);
const routeMap=new Map(results.map(r=>[r.route,r]));
const incoming=new Map(results.map(r=>[r.route,new Set()]));
const brokenLinks=[];
for(const row of results)for(const href of row.inventory.links){
 const url=new URL(href,'https://standbygeneratorguide.com'+row.route);
 if(url.origin!=='https://standbygeneratorguide.com')continue;
 const target=routeMap.get(url.pathname)??routeMap.get(url.pathname+'/');
 if(target){
  if(target.route!==row.route)incoming.get(target.route).add(row.route);
  if(url.hash&&!target.inventory.ids.includes(decodeURIComponent(url.hash.slice(1))))brokenLinks.push({route:row.route,href,reason:'Missing fragment target'});
 }else if(!fs.existsSync(path.join('dist',decodeURIComponent(url.pathname))))brokenLinks.push({route:row.route,href,reason:'Missing internal route or file'});
}
const orphans=[...incoming].filter(([route,sources])=>route!=='/'&&!sources.size).map(([route])=>route);
fs.writeFileSync(`${out}/link-graph.json`,JSON.stringify({orphans,brokenLinks},null,2));
console.log(JSON.stringify({pages:results.length,viewportChecks:results.reduce((n,r)=>n+r.viewports.length,0),controlsInventoried:results.reduce((n,r)=>n+r.inventory.controls.length,0),disclosuresExecuted:results.reduce((n,r)=>n+r.disclosuresTested,0),failedPages:failures.map(r=>({route:r.route,errors:r.errors,overflow:r.viewports.filter(v=>!v.pass),axe:r.accessibility.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))}))},null,2));
console.log('Internal link graph',JSON.stringify({orphans,brokenLinks}));
if(failures.length||orphans.length||brokenLinks.length)process.exitCode=1;
