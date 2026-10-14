import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const out=process.env.QA_OUTPUT??'.qa/pdf';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join('dist',new URL(req.url,'http://localhost').pathname);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.BASE_URL??`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']}: {})});
const report=[];
try{
 const page=await browser.newPage();
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/maintenance/maintenance-log/');
  await page.locator('#download-log').waitFor({state:'visible'});
  await page.locator('.log-card details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
  const expected={};
  for(let n=0;n<7;n++)expected[`detail-${n}`]=`DETAIL${n} model – café Ω`;
  for(let row=0;row<12;row++)for(let col=0;col<5;col++)expected[`service-${row}-${col}`]=`ROW${row}COL${col} `+(col===2?'Oil change café Ω – <script>safe text</script>\n'+('Inspection confirmed. '.repeat(35)):'Recorded');
  for(const [key,value]of Object.entries(expected))await page.locator(`[data-record-key="${key}"]:visible`).fill(value);
  await page.reload();await page.locator('#download-log').waitFor({state:'visible'});
  for(const [key,value]of Object.entries(expected))assert.equal(await page.locator(`[data-record-key="${key}"]`).first().inputValue(),value,`Session persistence ${key}`);
  const downloadPromise=page.waitForEvent('download');await page.locator('#download-log').click();const download=await downloadPromise;
  const file=`${out}/download-${width}.pdf`;await download.saveAs(file);
  const text=execFileSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
  const rawText=execFileSync('pdftotext',['-raw',file,'-'],{encoding:'utf8'});
  const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});
  fs.writeFileSync(`${out}/download-${width}.txt`,text);fs.writeFileSync(`${out}/download-${width}-info.txt`,info);
  const result={width,fields:67,persistence:true,letter:/612 x 792 pts/.test(info),textPresent:Object.keys(expected).every(k=>text.includes(expected[k].split(' ')[0])),unicode:text.includes('café Ω'),pages:Number(info.match(/Pages:\s*(\d+)/)?.[1])};report.push(result);
  // Browser print emits searchable text independently of the download renderer.
  await page.emulateMedia({media:'print'});await page.pdf({path:`${out}/print-${width}.pdf`,format:'Letter',printBackground:true});
  // Raw reading order keeps wrapped table-cell words together rather than
  // interleaving adjacent columns as the layout-preserving extractor does.
  const printText=execFileSync('pdftotext',['-raw',`${out}/print-${width}.pdf`,'-'],{encoding:'utf8'});
  const normalize=value=>value.replace(/\s/g,'');
  // Long records can cross a page: remove repeated page furniture and the
  // repeated continuation label before comparing the entire entered value.
  const downloadRecords=rawText
    .replaceAll('GENERATOR MAINTENANCE LOG','')
    .replaceAll('STANDBY GENERATOR GUIDE  /  HOMEOWNER RECORD','')
    .replaceAll('Homeowner-entered information; verify all service against the manufacturer manual.','')
    .replaceAll('Work, parts / oil used, alarms','')
    .replace(/\d+ \/ \d+/g,'');
  result.completeDownloadValues=Object.values(expected).every(value=>normalize(downloadRecords).includes(normalize(value)));
  result.completePrintValues=Object.values(expected).every(value=>normalize(printText).includes(normalize(value)));
  result.printTextPresent=Object.keys(expected).every(k=>printText.replace(/\s/g,'').includes(expected[k].split(' ')[0]));
  result.printTitle=printText.replace(/\s/g,'').includes('Generatormaintenancelog');
  await page.emulateMedia({media:'screen'});
  assert(result.letter,'Download must use US Letter');assert(result.textPresent,'Download missing record text');assert(result.unicode,'Download missing Unicode text');assert(result.printTextPresent,'Browser print missing record text');assert(result.printTitle,'Print missing worksheet heading');
  assert(result.completeDownloadValues,'Download clipped full-length record values');
  assert(result.completePrintValues,'Browser print clipped full-length record values');
  const commands=fs.readFileSync(file).toString('latin1');
  const positions=[...commands.matchAll(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/g)];
  assert(positions.length>=67,'Missing positioned record text');
  assert(positions.every(m=>Number(m[1])>=42&&Number(m[1])<570&&Number(m[2])>=22&&Number(m[2])<=760),'PDF text outside Letter margins');
  result.textWithinPage=true;
  // A cleared browser draft must not leak previous service/serial values into
  // the exported PDF, printed mirror fields, or a subsequent reload.
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#clear-log').click();
  assert.equal(await page.locator('[data-record-key="detail-0"]').first().inputValue(), '', 'Clear failed to empty generator detail');
  assert.equal(await page.locator('[data-print-key="detail-0"]').first().textContent(), '', 'Clear left stale printable value');
  assert.equal(await page.evaluate(() => sessionStorage.getItem('sgg-generator-maintenance-log-session-v1')), null, 'Clear left saved draft');
  const clearedPromise=page.waitForEvent('download');
  await page.locator('#download-log').click();
  const cleared=await clearedPromise;
  const clearedFile=`${out}/cleared-${width}.pdf`;
  await cleared.saveAs(clearedFile);
  const clearedText=execFileSync('pdftotext',['-raw',clearedFile,'-'],{encoding:'utf8'});
  assert(!clearedText.includes('DETAIL0')&&!clearedText.includes('ROW0COL0'),'Cleared PDF leaked old worksheet data');
  assert(clearedText.includes('SERVICE ENTRY 12'),'Cleared PDF lost blank service rows');
  await page.reload();
  assert.equal(await page.locator('[data-record-key="detail-0"]').first().inputValue(), '', 'Cleared entries returned after reload');
  result.clearResetVerified=true;
 }
 const emptyPage=await browser.newPage({viewport:{width:390,height:900}});
 await emptyPage.goto(base+'/maintenance/maintenance-log/');
 const downloadPromise=emptyPage.waitForEvent('download');await emptyPage.locator('#download-log').click();
 const emptyDownload=await downloadPromise;const emptyFile=`${out}/empty.pdf`;await emptyDownload.saveAs(emptyFile);
 const emptyText=execFileSync('pdftotext',['-raw',emptyFile,'-'],{encoding:'utf8'});
 const pages=emptyText.split('\f').filter(p=>p.trim());
 assert(emptyText.includes('SERVICE ENTRY 12'),'Empty log lost available service records');
 assert(pages.every(p=>/Generator model|SERVICE ENTRY|Run hours|Performed by|Next due|Work, parts/.test(p)),'Header-only PDF page');
 report.push({scenario:'empty',pages:pages.length,noBlankPages:true,serviceEntries:12});
}finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));await browser.close();server.close();}
console.log('PDF data and paper assertions PASS',JSON.stringify(report));
