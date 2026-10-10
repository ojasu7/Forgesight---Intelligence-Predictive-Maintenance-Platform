// Exercise the actual presentation controller with a minimal DOM stand-in.
// This checks event/timing wiring, not browser layout or animation rendering.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAutoDemo} from '../dist/demo.js';
class Element {
  constructor(tag='div'){this.tag=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.parent=null;this._html='';this.textContent='';
    this.classList={add:c=>this.classes(new Set([...this.className.split(' ').filter(Boolean),c])),remove:c=>this.classes(new Set(this.className.split(' ').filter(x=>x&&x!==c))),toggle:(c,flag)=>{const has=this.className.split(' ').includes(c);if(flag??!has)this.classList.add(c);else this.classList.remove(c);}};
  }
  classes(set){this.className=[...set].join(' ');}
  get className(){return this.attributes.class||'';}set className(v){this.attributes.class=v;}
  setAttribute(k,v){this.attributes[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  append(e){e.parent=this;this.children.push(e);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);this.parent=null;}
  focus(){document.activeElement=this;}
  requestFullscreen(){return Promise.resolve();}
  set innerHTML(html){this._html=html;this.children=[];const stack=[this];for(const token of html.match(/<[^>]+>/g)||[]){if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<!'))continue;const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const e=new Element(tag);for(const a of token.matchAll(/([\w:-]+)="([^"]*)"/g))e.setAttribute(a[1],a[2]);for(const a of token.matchAll(/\s(data-[\w-]+)(?=\s|>|\/)/g))e.setAttribute(a[1],'');stack.at(-1).append(e);if(!/\/>$/.test(token)&&!['input','br','img','meta','link','hr'].includes(tag))stack.push(e);}}
  get innerHTML(){return this._html;}
  matches(s){const not=s.match(/:not\(\.([\w-]+)\)/);if(not&&this.className.split(' ').includes(not[1]))return false;s=s.replace(/:not\([^)]+\)/,'');if(s.startsWith('.'))return this.className.split(' ').includes(s.slice(1));if(s.startsWith('[')){const m=s.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);return m&&m[1] in this.attributes&&(m[2]===undefined||m[2]===this.attributes[m[1]]);}return this.tag===s;}
  querySelectorAll(selector){const parts=selector.split(' '),nodes=[];const walk=e=>{for(const c of e.children){let matches=c.matches(parts.at(-1));if(matches&&parts.length>1){let p=c.parent;for(let i=parts.length-2;i>=0;i--){while(p&&!p.matches(parts[i]))p=p.parent;if(!p){matches=false;break;}p=p.parent;}}if(matches)nodes.push(c);walk(c);}};walk(this);return nodes;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
let now=0,frame=null,opens=0,closes=0;const listeners=new Map();
globalThis.document={body:new Element('body'),activeElement:null,hidden:false,fullscreenElement:null,createElement:t=>new Element(t),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
globalThis.performance={now:()=>now};globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{frame=null;};globalThis.setTimeout=fn=>{fn();return 0;};
const model=JSON.parse(readFileSync(new URL('../dist/model.json',import.meta.url)));
const demo=createAutoDemo({model,onOpen:()=>opens++,onClose:()=>closes++});
const pump=t=>{now=t;frame?.(t);};const root=()=>document.body.children[0];
demo.start();assert.equal(demo.active,true);assert.ok(root().querySelector('.demo-countdown'));
pump(1000);pump(2000);pump(3000);assert.equal(root().querySelector('.demo-countdown'),null);
pump(7000);const before=demo.position.elapsed;root().querySelector('[data-demo-play]').onclick();pump(15000);assert.equal(demo.position.elapsed,before);
root().querySelector('[data-demo-play]').onclick();pump(16000);assert.equal(demo.position.elapsed,before+1);
document.hidden=true;listeners.get('visibilitychange')();pump(22000);assert.equal(demo.position.elapsed,before+1);
document.hidden=false;root().querySelector('[data-demo-play]').onclick();
const visited=new Set();for(let t=23000;t<=205000;t+=1000){pump(t);visited.add(demo.position.scene.id);}
assert.equal(demo.position.finished,true);assert.ok(root().querySelector('.demo-finished'));assert.equal(visited.size,14);
root().querySelector('[data-demo-replay]').onclick();assert.equal(demo.position.elapsed,0);assert.equal(opens,2);assert.equal(closes,1);
root().querySelector('[data-demo-close]').onclick();assert.equal(demo.active,false);assert.equal(document.body.children.length,0);assert.equal(document.body.style.overflow,undefined);assert.equal(closes,2);
console.log('Actual presentation controller passed countdown, all 14 scenes, pause/resume, visibility pause, completion, replay, and exit. Browser visuals remain unverified.');
