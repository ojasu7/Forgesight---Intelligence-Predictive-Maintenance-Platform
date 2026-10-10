import {telemetry,infer,machines,jobs,baseline,optimize} from './engine.js';

// These scene timings are the single source of truth for the recorded duration.
export const SCENES = [
  {id:'intro',seconds:8,chapter:'THE IDEA',title:'Meet ForgeSight.',caption:'Machine signals become clearer production decisions. A manufacturing intelligence prototype for small 3D-print farms.'},
  {id:'problem',seconds:12,chapter:'01 / THE PROBLEM',title:'One bad print. A longer queue.',caption:'A machine problem can waste filament, occupy a printer, and delay the next order. Operators need to connect the warning to a decision.'},
  {id:'floor',seconds:12,chapter:'02 / OBSERVE',title:'Six machines. One workspace.',caption:'The sandbox contains six printers and twelve queued orders. Each machine has its own material compatibility, speed, and next-available time.'},
  {id:'telemetry',seconds:12,chapter:'02 / OBSERVE',title:'Start with the actual signals.',caption:'Temperature, vibration, motor current, and extrusion flow form a 30-sample observation window. The readings in this tour are generated.'},
  {id:'fault',seconds:14,chapter:'03 / DETECT',title:'Now change the conditions.',caption:'An extrusion-blockage scenario is introduced on P03. Motor current rises while extrusion flow falls. The classifier responds to the changing data.'},
  {id:'evidence',seconds:14,chapter:'03 / DETECT',title:'See why the model reacted.',caption:'The classifier identifies an extrusion-blockage pattern. Signal deviations and class scores make its reasoning inspectable; the score is not physical failure probability.'},
  {id:'patterns',seconds:14,chapter:'03 / DETECT',title:'Three faults. Different signatures.',caption:'The same trained model distinguishes extrusion blockage, thermal instability, and mechanical vibration. Each result here is computed from a separate generated window.'},
  {id:'baseline',seconds:14,chapter:'04 / UNDERSTAND',title:'A warning has a business cost.',caption:'The compatible round-robin baseline is evaluated using delay penalties and a risk-weighted waste proxy. All cost assumptions are explicit.'},
  {id:'optimize',seconds:14,chapter:'05 / OPTIMIZE',title:'Give the queue a better plan.',caption:'Deadline-aware dispatch and local search compare machine assignments and job order. Watch the future queue rearrange; current jobs stay in place.'},
  {id:'results',seconds:14,chapter:'05 / OPTIMIZE',title:'Compare before you act.',caption:'These results are calculated for this scenario. They compare the scheduling objective and late orders, rather than claiming measured factory savings.'},
  {id:'offline',seconds:12,chapter:'06 / RESPOND',title:'What if P03 goes offline?',caption:'The planner excludes P03 from new work and recalculates the queue. Assignments still obey machine availability and PLA/PETG compatibility.'},
  {id:'model',seconds:14,chapter:'07 / THE AI',title:'Learned weights. Real inference.',caption:'A four-class logistic regression was trained on 3,600 synthetic windows and tested on 1,200 held-out windows from the same simulator.'},
  {id:'import',seconds:12,chapter:'08 / EXTEND',title:'Bring a telemetry file.',caption:'CSV upload, model inference, and scheduling run locally in the browser. Imported data still needs appropriate operating conditions and real-world validation.'},
  {id:'outro',seconds:14,chapter:'THE NEXT STEP',title:'A prototype you can build on.',caption:'Next: labeled real-printer telemetry, machine-specific baselines, calibrated scores, and measured scheduling outcomes. ForgeSight is a working research prototype.'},
];
export const TOTAL_SECONDS=SCENES.reduce((s,x)=>s+x.seconds,0);
export class DemoClock {
  constructor(){this.elapsed=0;this.playing=false;this.last=null;}
  start(now=0){this.elapsed=0;this.playing=true;this.last=now;}
  tick(now){if(this.playing&&this.last!==null)this.elapsed=Math.min(TOTAL_SECONDS,this.elapsed+Math.max(0,now-this.last)/1000);this.last=now;if(this.elapsed>=TOTAL_SECONDS)this.playing=false;return this.position();}
  pause(){this.playing=false;this.last=null;}
  resume(now=0){if(this.elapsed<TOTAL_SECONDS){this.playing=true;this.last=now;}}
  seek(index,now=0){this.elapsed=SCENES.slice(0,Math.max(0,Math.min(index,SCENES.length-1))).reduce((s,x)=>s+x.seconds,0);this.last=now;return this.position();}
  position(){let t=this.elapsed;for(let i=0;i<SCENES.length;i++){if(t<SCENES[i].seconds||i===SCENES.length-1)return {index:i,scene:SCENES[i],progress:Math.min(1,t/SCENES[i].seconds),elapsed:this.elapsed,finished:this.elapsed>=TOTAL_SECONDS};t-=SCENES[i].seconds;}}
}
function prepare(fleet,model){for(const [i,m] of fleet.entries()){m.rows=telemetry(i===2?'blockage':'normal',28+(i+1)*79,.8);m.result=infer(m.rows,model);m.concern=m.result.concern;}return fleet;}
export function createDemoScenario(model){
  const queue=jobs(),healthy=machines();for(const [i,m] of healthy.entries()){m.rows=telemetry('normal',28+(i+1)*79,.8);m.result=infer(m.rows,model);m.concern=m.result.concern;}
  const fleet=prepare(machines(),model),base=baseline(queue,fleet),plan=optimize(queue,fleet),offline=fleet.map(m=>({...m,offline:m.id==='P03'}));
  const offlinePlan=optimize(queue,offline);
  const patternModes=['blockage','thermal','vibration'];const patterns=patternModes.map((mode,i)=>{const rows=telemetry(mode,900+i,.8);return {mode,rows,result:infer(rows,model)};});
  const csv='machine_id,timestamp,temp_c,vibration_mm_s,motor_a,extrusion_mm_s\n'+healthy[0].rows.map(r=>`P01,${r.timestamp},${r.temp_c.toFixed(2)},${r.vibration_mm_s.toFixed(2)},${r.motor_a.toFixed(2)},${r.extrusion_mm_s.toFixed(2)}`).join('\n');
  return {model,queue,healthy,fleet,base,plan,offline,offlinePlan,patterns,csv,healthyCost:baseline(queue,healthy).cost,orderValue:queue.reduce((s,j)=>s+j.value,0),moved:plan.rows.filter(r=>base.rows.find(x=>x.id===r.id).machineId!==r.machineId).length};
}
export function faultAt(progress,model){const severity=.8*Math.min(1,Math.max(0,progress)/.72);const rows=telemetry('blockage',265,severity);return {rows,result:infer(rows,model),severity};}
