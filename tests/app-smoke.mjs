// Non-browser smoke test for view rendering and user-action wiring.
// Does not substitute for visual/real-DOM browser QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const model=JSON.parse(readFileSync(new URL('../dist/model.json',import.meta.url)));
const nodes=new Map(), groups=new Map();let markup='';
function node(id){return {id,value:'',files:[],dataset:{},classList:{add(){},remove(){},toggle(){}},click(){this.onclick?.()},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},getBoundingClientRect(){return {top:0,left:0,bottom:600,right:600};}};}
for(const id of ['#app','#crumb','#toast','#walkthrough','#walkthrough .close','#guide-btn','#manual-guide-btn','#csv-input','#demo-fault','#demo-plan','#demo-model','#full-guide'])nodes.set(id,node(id));
const baseIds=new Set(nodes.keys());
Object.defineProperty(nodes.get('#app'),'innerHTML',{get(){return markup;},set(v){markup=v;for(const id of [...nodes.keys()])if(!baseIds.has(id))nodes.delete(id);groups.clear();
  for(const match of v.matchAll(/<[^>]+(?:data-action|data-machine|data-check)="[^"]+"[^>]*>/g)){const n=node('');for(const a of match[0].matchAll(/data-([\w]+)="([^"]+)"/g))n.dataset[a[1]]=a[2];const key='[data-'+Object.keys(n.dataset)[0]+']';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
  for(const match of v.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)){const n=node(match[1]);const val=match[0].match(/value="([^"]+)"/);n.value=val?.[1]||'';n.validity={valid:true};nodes.set('#'+match[1],n);}
}});
globalThis.document={hidden:false,activeElement:null,querySelector:s=>nodes.get(s)||null,querySelectorAll:s=>groups.get(s)||[],createElement:()=>node('')};
globalThis.window={addEventListener(){},scrollTo(){}};globalThis.location={hash:'#overview'};
globalThis.fetch=async()=>({ok:true,json:async()=>model});globalThis.setInterval=()=>0;
globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
await import('../dist/app.js');
assert.match(markup,/A clearer view of your factory/);
assert.equal(groups.get('[data-machine]').length,6);
nodes.get('#demo-fault').onclick();assert.match(markup,/extrusion blockage/);
const optimizeButton=groups.get('[data-action]').find(n=>n.dataset.action==='optimize');optimizeButton.onclick();
assert.match(markup,/Proposed dispatch schedule/);assert.match(markup,/Baseline|BASELINE/);
groups.get('[data-action]').find(n=>n.dataset.action==='accept').onclick();assert.match(markup,/Plan accepted in this sandbox/);
nodes.get('#downtime').value='100';nodes.get('#downtime').onchange({target:nodes.get('#downtime')});assert.match(markup,/Proposed dispatch schedule/);
const sample='machine_id,timestamp,temp_c,vibration_mm_s,motor_a,extrusion_mm_s\n'+Array.from({length:30},(_,i)=>`P01,${i*10},210,1.1,1.3,4.4`).join('\n');
nodes.get('#csv-input').files=[{size:sample.length,text:async()=>sample}];await nodes.get('#csv-input').onchange({target:nodes.get('#csv-input')});
assert.match(markup,/Imported \+ synthetic telemetry/);assert.match(markup,/IMPORTED CSV/);
console.log('App smoke passed: overview, injected fault, schedule, plan acceptance, assumptions, and CSV import. Visual browser QA remains unverified.');
