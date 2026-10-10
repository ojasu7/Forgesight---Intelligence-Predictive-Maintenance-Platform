// Shared by the browser and Node verification. No network calls or API keys.
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo,v));
export function random(seed) { let a=seed>>>0; return () => {a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export function telemetry(mode='normal',seed=10,severity=.8,n=30) {
  const rng=random(seed); const noise=s => (rng()+rng()+rng()+rng()-2)*s;
  const base=207+rng()*8; const out=[];
  for(let i=0;i<n;i++) {
    let temp=base+noise(.9), vibration=1.1+noise(.22), motor=1.35+noise(.12), extrusion=4.4+noise(.15);
    if(mode==='blockage') {extrusion-=severity*(1.3+i*.055);motor+=severity*(1.2+i*.028);}
    if(mode==='thermal') temp+=Math.sin(i*.75)*severity*9+i*severity*.32;
    if(mode==='vibration') {vibration+=severity*(3+i*.085);motor+=severity*.6;}
    out.push({timestamp:i*10,temp_c:temp,vibration_mm_s:Math.max(.01,vibration),motor_a:Math.max(.01,motor),extrusion_mm_s:Math.max(.01,extrusion)});
  } return out;
}
export function extract(rows) {
  if(rows.length<12) throw new Error('Use at least 12 telemetry samples per machine.');
  const n=rows.length, avg=k=>rows.reduce((s,r)=>s+r[k],0)/n;
  const temp=avg('temp_c'); let den=0,ts=0,es=0;
  rows.forEach((r,i)=>{let t=i-(n-1)/2;den+=t*t;ts+=t*r.temp_c;es+=t*r.extrusion_mm_s;});
  return [Math.sqrt(rows.reduce((s,r)=>s+(r.temp_c-temp)**2,0)/n),ts/den,avg('motor_a'),avg('vibration_mm_s'),avg('extrusion_mm_s'),es/den];
}
export function infer(rows,model) {
  const f=extract(rows), z=f.map((x,i)=>(x-model.mean[i])/model.scale[i]);
  const logits=model.weights.map((w,c)=>w.reduce((s,v,i)=>s+v*z[i],model.intercept[c]));
  const m=Math.max(...logits), ex=logits.map(l=>Math.exp(l-m)), total=ex.reduce((a,b)=>a+b,0), scores=ex.map(x=>x/total);
  const idx=scores.indexOf(Math.max(...scores));
  const contributions=model.featureNames.map((name,i)=>({name,value:f[i],contribution:(model.weights[idx][i]-model.weights[0][i])*z[i],deviation:Math.abs((f[i]-model.healthyMean[i])/model.healthyStd[i])})).sort((a,b)=>b.contribution-a.contribution);
  const anomaly=Math.sqrt(f.reduce((s,x,i)=>s+clamp((x-model.healthyMean[i])/model.healthyStd[i],-20,20)**2,0)/f.length);
  return {features:f,scores,label:model.classes[idx],index:idx,concern:1-scores[0],anomaly,contributions};
}
export function machines() {
  return Array.from({length:6},(_,i)=>({id:`P0${i+1}`,name:['Atlas','Boreal','Cinder','Delta','Echo','Flux'][i],materials:i===1||i===4?['PLA','PETG']:['PLA'],speed:[1,1.1,.95,1.05,.9,1.2][i],available:[30,45,10,35,20,0][i],offline:false,concern:.03}));
}
export function jobs() {
  const labels=['Camera mount','Sensor housing','Gear prototype','Lab fixture','Phone stand','Cable bracket','Motor spacer','Probe holder','Enclosure lid','Rope guide','Bench clamp','Display mount'];
  return labels.map((name,i)=>({id:`J${181+i}`,name,material:[1,5,8].includes(i)?'PETG':'PLA',minutes:[90,70,140,55,45,110,65,95,85,40,75,60][i],due:[180,160,240,120,115,200,150,180,200,130,190,180][i],value:[32,45,55,28,18,38,24,34,40,20,30,28][i],materialCost:[3.2,4.8,6.5,2.8,2,4.1,2.6,3.4,4.2,1.9,3.2,2.7][i]}));
}
export function evaluate(assignments, fleet, {downtime=60,lateRate=12,machineRate=3}={}) {
  const ends=Object.fromEntries(fleet.map(m=>[m.id,m.available]));let cost=0,late=0,exposure=0,tardiness=0;const rows=[];
  for(const {job,machineId} of assignments) {
    const m=fleet.find(x=>x.id===machineId);
    if(!m||m.offline||!m.materials.includes(job.material)) return {cost:Infinity,late:Infinity,rows:[]};
    const start=ends[m.id],duration=job.minutes/m.speed, interruption=m.concern*downtime;
    const end=start+duration+interruption, delay=Math.max(0,end-job.due);
    const riskCost=m.concern*(job.materialCost+duration/60*machineRate);
    ends[m.id]=end;late+=delay>0?1:0;exposure+=riskCost;tardiness+=delay;
    cost+=delay/60*lateRate+riskCost;
    rows.push({...job,machineId,start,end,duration,delay,riskCost});
  }
  return {cost,late,exposure,tardiness,rows,makespan:Math.max(0,...Object.values(ends))};
}
export function baseline(queue,fleet,options) {
  let i=0;const a=[];
  for(const job of queue){const eligible=fleet.filter(m=>!m.offline&&m.materials.includes(job.material));if(!eligible.length)return {cost:Infinity,late:Infinity,rows:[],unassigned:job.id};a.push({job,machineId:eligible[i++%eligible.length].id});}
  return evaluate(a,fleet,options);
}
export function optimize(queue,fleet,options) {
  const ordered=[...queue].sort((a,b)=>a.due-b.due);let a=[];
  for(const job of ordered){const eligible=fleet.filter(m=>!m.offline&&m.materials.includes(job.material));if(!eligible.length)return {cost:Infinity,late:Infinity,rows:[],unassigned:job.id};let best=null;
    for(const m of eligible){const candidate=[...a,{job,machineId:m.id}], e=evaluate(candidate,fleet,options);if(!best||e.cost<best.cost)best={cost:e.cost,a:candidate};}a=best.a;}
  let best=evaluate(a,fleet,options);
  // Coordinate descent over machine assignment, then swaps of dispatch order.
  for(let pass=0;pass<4;pass++) {let changed=false;
    for(let i=0;i<a.length;i++)for(const m of fleet.filter(m=>!m.offline&&m.materials.includes(a[i].job.material))){const b=a.map((r,k)=>k===i?{...r,machineId:m.id}:r),e=evaluate(b,fleet,options);if(e.cost<best.cost-1e-7){a=b;best=e;changed=true;}}
    for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const b=[...a];[b[i],b[j]]=[b[j],b[i]];const e=evaluate(b,fleet,options);if(e.cost<best.cost-1e-7){a=b;best=e;changed=true;}}
    if(!changed)break;
  }
  // Always retain incumbent if heuristic cannot beat the baseline.
  const original=baseline(queue,fleet,options);return original.cost<best.cost?{...original,algorithm:'Baseline retained'}:{...best,algorithm:'Deadline dispatch + local search'};
}
export function parseCSV(text) {
  const records=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))records.push(row);row=[];field='';}else field+=c;}
  if(quoted)throw new Error('An opening quote has no closing quote.');row.push(field);if(row.some(x=>x.trim()))records.push(row);
  const header=(records.shift()||[]).map(x=>x.trim().replace(/^\uFEFF/,''));const required=['machine_id','timestamp','temp_c','vibration_mm_s','motor_a','extrusion_mm_s'];
  for(const k of required)if(!header.includes(k))throw new Error(`Missing column: ${k}. Download the sample CSV for the format.`);
  const grouped={};for(const r of records){const item=Object.fromEntries(header.map((k,i)=>[k,(r[i]||'').trim()]));if(!/^P0[1-6]$/.test(item.machine_id))throw new Error('Machine IDs must be P01 through P06.');const sample={};
    for(const k of required.slice(1)){if(item[k]==='')throw new Error(`Empty ${k} value.`);sample[k]=Number(item[k]);if(!Number.isFinite(sample[k]))throw new Error(`Invalid numeric value in ${k}.`);}
    if(sample.temp_c<0||sample.temp_c>500||sample.vibration_mm_s<0||sample.vibration_mm_s>100||sample.motor_a<0||sample.motor_a>100||sample.extrusion_mm_s<0||sample.extrusion_mm_s>100)throw new Error('Telemetry outside supported sensor ranges.');
    (grouped[item.machine_id]??=[]).push(sample);
  }
  if(!Object.keys(grouped).length)throw new Error('The CSV contains no telemetry.');
  for(const [id,rows] of Object.entries(grouped)){rows.sort((a,b)=>a.timestamp-b.timestamp);if(rows.length<12)throw new Error(`${id}: at least 12 samples required.`);if(rows.some((r,i)=>i&&r.timestamp<=rows[i-1].timestamp))throw new Error(`${id}: timestamps must be distinct.`);const dt=rows[1].timestamp-rows[0].timestamp;if(rows.some((r,i)=>i&&Math.abs(r.timestamp-rows[i-1].timestamp-dt)>.01))throw new Error(`${id}: evenly spaced samples are required.`);grouped[id]=rows.slice(-30);}
  return grouped;
}
