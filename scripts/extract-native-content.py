from html.parser import HTMLParser
from pathlib import Path
class N:
 def __init__(self,t,a):self.tag=t;self.attrs=dict(a);self.children=[];self.parent=None
 def walk(self):
  yield self
  for c in self.children:
   if isinstance(c,N):yield from c.walk()
class P(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=N('root',[]);self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=N(t,a);n.parent=self.stack[-1];n.parent.children.append(n)
  if t not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,s):self.stack[-1].children.append(s)

# Build editable JSX from the archived public presentation, replacing every
# interactive island with our React implementation. No archived JS is executed.
import json, re, html
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'reference/route-data.json').read_text())
p=P();p.feed((root/'reference/local.html').read_text())
products={}; videos={}; rives={}; apps={}; search=[]
def index(value):
 if isinstance(value,dict):
  if 'descriptionHtml' in value and value.get('handle') and str(value.get('id','')).startswith('gid://shopify/Product/'): products[value['handle']]=value
  if str(value.get('id','')).startswith('gid://shopify/Video/'):videos[value['id']]=value
  for v in value.values():index(v)
 elif isinstance(value,list):
  for v in value:index(v)
index(data)
for handle,product in products.items():
 rive=product.get('productMedia',{}).get('rive')
 if rive:rives[handle]=rive
 for app in product.get('customData') or []:
  if isinstance(app,dict) and app.get('identifier') and app.get('rive'):apps[app['identifier']]=app
def js(v):return json.dumps(v,ensure_ascii=False)
def style(value):
 result={}
 for declaration in value.split(';'):
  if ':' not in declaration:continue
  k,v=declaration.split(':',1);k=k.strip();v=v.strip()
  result[k if k.startswith('--') else re.sub(r'-([a-z])',lambda m:m[1].upper(),k)]=v
 return result
case={'class':'className','for':'htmlFor','tabindex':'tabIndex','srcset':'srcSet','viewbox':'viewBox','fill-rule':'fillRule','clip-rule':'clipRule','stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin','stroke-miterlimit':'strokeMiterlimit','stroke-dasharray':'strokeDasharray','stroke-dashoffset':'strokeDashoffset','stroke-opacity':'strokeOpacity','fill-opacity':'fillOpacity','preserveaspectratio':'preserveAspectRatio','xlink:href':'xlinkHref','gradientunits':'gradientUnits','gradienttransform':'gradientTransform','stop-color':'stopColor','stop-opacity':'stopOpacity','clippathunits':'clipPathUnits','clip-path':'clipPath','color-interpolation-filters':'colorInterpolationFilters','flood-color':'floodColor','flood-opacity':'floodOpacity','filterunits':'filterUnits','stddeviation':'stdDeviation','autoplay':'autoPlay','playsinline':'playsInline','crossorigin':'crossOrigin'}
void={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
def attrs(a):
 out=[]
 for k,v in a.items():
  if k.startswith('on') or k in ['data-nosnippet','data-initiated']:continue
  k=case.get(k,k)
  if k=='style':out.append('style={'+js(style(v))+' as CSSProperties}');continue
  if k in ['autoPlay','loop','muted','playsInline','controls','hidden','disabled']:out.append(k+'={true}');continue
  if k=='tabIndex':out.append(k+'={'+str(int(v))+'}');continue
  if v is None:v=''
  if k=='href' and v.startswith('/editions/winter2026#'):v=v.split('#',1)[1];v='#'+v
  out.append(k+'={'+js(v)+'}')
 return ' '.join(out)
def render(n,product=None):
 if isinstance(n,str):return '{'+js(n)+'}' if n else ''
 a=n.attrs.copy();tag=n.tag
 if tag in ['script','link','style','noscript']:return ''
 if a.get('data-component-name')=='product':product=products.get(a.get('id'),product)
 handle=product.get('handle') if product else ''
 if a.get('data-component-name')=='rive-container' or 'data-rollout-rive-container' in a:
  if handle in rives:
   cl=a.get('class','')
   # The original inner canvas replaces these placeholder descendants.
   return '<RiveArtwork config={rives['+js(handle)+']} className={'+js(cl)+'} />'
 if a.get('data-id') in videos:
  v=videos[a['data-id']];sources=v.get('sources',[])
  src=next((x['url'] for x in sources if x.get('mimeType')=='video/mp4'),'')
  poster=v.get('previewImage',{}).get('url','')
  return '<LoopVideo src={'+js(src)+'} poster={'+js(poster)+'} className={'+js(a.get('class',''))+'} />'
 if tag=='video':
  return '<LoopVideo '+attrs({'src':a.get('src') or a.get('data-src',''),'poster':a.get('poster',''),'class':a.get('class','')})+' />'
 if tag=='button':
  kind=a.get('data-component-name')
  if kind=='cta-open-video-modal':tag='VideoTrigger';a['videoId']=data['youtubeVideos'][a['data-transition-id']]
  elif kind=='skill-tag':tag='SkillTrigger';a['skillId']=a['data-component-extra-skill-id']
  elif kind=='sidekick-apps-card':tag='AppTrigger';a['appId']=a['data-component-extra-cardid']
  else:tag='BackToNavigation'
 if 'cloud-card' in a.get('class',''):
  st=style(a.get('style',''));st['opacity']=a.get('data-base-opacity','0.6');st['transform']='scale('+a.get('data-base-scale','1')+')'
  a['style']=';'.join(k+':'+v for k,v in st.items())
 if a.get('data-skill-popup') is not None:return ''
 if 'data-skill-tag' in a:
  a['style']=a.get('style','')+';--skill-tag-dynamic-scale:1;--skill-tag-dynamic-opacity:1'
 content=''.join(render(c,product) for c in n.children)
 return '<'+tag+' '+attrs(a)+(' />' if tag in void else '>'+content+'</'+tag+'>')
sections=[n for n in p.root.walk() if n.tag=='section' and n.attrs.get('data-section-id')]
dest=root/'components/renaissance/chapters';dest.mkdir(exist_ok=True)
names=[]
for section in sections:
 handle=section.attrs['id'];name=''.join(v.title() for v in handle.split('-'))+'Chapter';names.append(name)
 for n in section.walk():
  if n.attrs.get('data-component-name')=='product':
   pr=products.get(n.attrs.get('id'))
   if pr:search.append({'id':pr['handle'],'title':pr['title'],'description':html.unescape(re.sub('<[^>]*>','',pr['descriptionHtml'])),'chapter':handle})
 content='import type { CSSProperties } from "react";\nimport { RiveArtwork } from "../RiveArtwork";\nimport { LoopVideo, VideoTrigger, SkillTrigger, AppTrigger, BackToNavigation } from "../InteractiveContent";\n'
 content+='import rives from "@/lib/renaissance/data/rives.json";\n\nexport function '+name+'() { return ('+render(section)+'); }\n'
 (dest/(name+'.tsx')).write_text(content)
(dest/'EditionContent.tsx').write_text('\n'.join('import { '+n+' } from "./'+n+'";' for n in names)+'\nexport function EditionContent() { return <>\n'+''.join('<'+n+' />\n' for n in names)+'</>; }\n')
out=root/'lib/renaissance/data'
for filename,value in [('rives',rives),('search',search),('interactions',{'skills':data['topSkills'],'apps':apps,'editions':data['allEditionsDropdownItems']})]:
 (out/(filename+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2))
print('Generated',len(sections),'native chapter components,',len(search),'product entries,',len(rives),'Rive configurations,',len(videos),'videos,',len(apps),'app demos.')
