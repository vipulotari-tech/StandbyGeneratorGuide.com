import concurrent.futures,json,re,time,urllib.request,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
BASE='https://standbygeneratorguide.com'
OUT=Path('.qa/production-discovery');OUT.mkdir(parents=True,exist_ok=True)
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.assets=[];self.controls=[];self.h1=0;self.ids=[];self.title='';self.intitle=False;self.meta={}
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='a' and 'href'in a:self.links.append(a['href'])
  if t in ['img','script']and a.get('src'):self.assets.append(a['src'])
  if t=='h1':self.h1+=1
  if a.get('id'):self.ids.append(a['id'])
  if t=='title':self.intitle=True
  if t in ['button','input','select','textarea','summary']:self.controls.append({'tag':t,'id':a.get('id'),'type':a.get('type'),'name':a.get('name')})
  if t=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
  if t=='link'and a.get('rel')=='canonical':self.meta['canonical']=a.get('href')
 def handle_endtag(self,t):
  if t=='title':self.intitle=False
 def handle_data(self,d):
  if self.intitle:self.title+=d

def get(url):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'StandbyGeneratorGuide authorized QA'}),timeout=35)as r:return r.status,r.url,dict(r.headers),r.read().decode('utf8')
 except Exception as e:return None,url,{},str(e)
status,url,headers,robots=get(BASE+'/robots.txt');(OUT/'robots.txt').write_text(robots)
status,url,headers,sitemap=get(BASE+'/sitemap.xml');(OUT/'sitemap.xml').write_text(sitemap)
assert status == 200, f'Sitemap fetch failed: {status}: {sitemap[:200]}'
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
root=ET.fromstring(sitemap)
assert root.tag == '{'+ns['s']+'}urlset', 'Expected one flat sitemap, not an index'
urls={n.text for n in root.findall('s:url/s:loc',ns)}
assert urls, 'Sitemap has no URLs'
rows=[];pending=set(urls);seen=set();rounds=0
while pending:
 batch=sorted(pending-seen);pending=set();seen.update(batch)
 with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:
  for u,(status,final,headers,html)in zip(batch,pool.map(get,batch)):
   p=Page();p.feed(html)
   row={'url':u,'status':status,'finalUrl':final,'headers':headers,'title':p.title,'h1':p.h1,'metadata':p.meta,'links':p.links,'assets':p.assets,'controls':p.controls,'duplicateIds':sorted({i for i in p.ids if p.ids.count(i)>1}),'inSitemap':u in urls};rows.append(row)
   for link in p.links:
    absolute=urllib.parse.urljoin(u,link);parsed=urllib.parse.urlparse(absolute)
    if parsed.netloc=='standbygeneratorguide.com'and not Path(parsed.path).suffix:
     pending.add(BASE+parsed.path)
   (OUT/'results.json').write_text(json.dumps({'sitemapCount':len(urls),'rows':rows},indent=2))
   print('Live discovery',len(rows),u,status,flush=True)
 rounds+=1
 if rounds>5:raise RuntimeError('Discovery did not converge')
print('Production URLs',len(rows),'Sitemap',len(urls))
