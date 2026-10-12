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
