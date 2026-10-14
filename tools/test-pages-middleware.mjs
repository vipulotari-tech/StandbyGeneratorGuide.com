import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/_middleware.js';
for(const host of ['www.standbygeneratorguide.com','standbygeneratorguide.pages.dev']){
 test(`${host} permanently redirects to apex with path and query`,async()=>{
  let called=false;
  const response=await onRequest({request:new Request(`https://${host}:8443/maintenance/maintenance-log/?ref=qa&next=https://example.com`),next:()=>{called=true;return new Response('unexpected');}});
  assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://standbygeneratorguide.com/maintenance/maintenance-log/?ref=qa&next=https://example.com');assert.equal(called,false);
 });
}
test('canonical apex remains indexable and preserves status/body',async()=>{
 const original=new Response('content',{status:200});
 const response=await onRequest({request:new Request('https://standbygeneratorguide.com/'),next:()=>original});
 assert.equal(response,original);assert.equal(response.headers.get('x-robots-tag'),null);assert.equal(await response.text(),'content');
});
test('preview retains status/body and explicitly prevents indexing',async()=>{
 const response=await onRequest({request:new Request('https://qa-full-production.standbygeneratorguide.pages.dev/missing/'),next:()=>new Response('not found',{status:404,headers:{'Content-Type':'text/html'}})});
 assert.equal(response.status,404);assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');assert.equal(await response.text(),'not found');
});

test('retired sitemaps never reach stale asset storage, including query and HEAD variants', async () => {
 for (const host of ['standbygeneratorguide.com', 'preview.standbygeneratorguide.pages.dev']) {
  for (const path of ['/sitemap-index.xml', '/sitemap-0.xml', '/sitemap-1.xml?old=1', '/sitemap-0.xml/']) {
   for (const method of ['GET', 'HEAD']) {
    let called = false;
    const response = await onRequest({
     request: new Request(`https://${host}${path}`, {method}),
     next: () => { called = true; return new Response('<urlset>stale</urlset>'); },
    });
    assert.equal(called, false, `${method} ${host}${path}`);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), 'noindex');
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'Not found. Use /sitemap.xml.\n');
   }
  }
 }
});

test('canonical sitemap passes through unchanged without noindex', async () => {
 const original = new Response('<urlset/>', {headers: {'Content-Type': 'application/xml'}});
 const response = await onRequest({
  request: new Request('https://standbygeneratorguide.com/sitemap.xml?check=1'),
  next: () => original,
 });
 assert.equal(response, original);
 assert.equal(response.headers.get('x-robots-tag'), null);
});
