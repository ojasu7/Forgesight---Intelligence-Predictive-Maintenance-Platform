import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENES,TOTAL_SECONDS,DemoClock,createDemoScenario,faultAt} from '../dist/demo-core.js';
import {sceneVisual} from '../dist/demo.js';
import {evaluate} from '../dist/engine.js';
const model=JSON.parse(readFileSync(new URL('../dist/model.json',import.meta.url)));
test('the recording is exactly three minutes, with all chapters visited once',()=>{
  assert.equal(TOTAL_SECONDS,180);assert.equal(new Set(SCENES.map(s=>s.id)).size,14);
  const c=new DemoClock();c.start(100);let elapsed=0;
  for(let i=0;i<SCENES.length;i++){assert.equal(c.tick(100+elapsed*1000).index,i);assert.equal(c.position().progress,0);elapsed+=SCENES[i].seconds;}
  const end=c.tick(180100);assert.equal(end.finished,true);assert.equal(c.playing,false);assert.equal(end.progress,1);
});
test('pause, resume, and seeking preserve time instead of skipping chapters',()=>{
  const c=new DemoClock();c.start(0);c.tick(16000);c.pause();c.tick(100000);assert.equal(c.elapsed,16);
  c.resume(100000);c.tick(104000);assert.equal(c.elapsed,20);assert.equal(c.seek(8,105000).scene.id,'optimize');assert.equal(c.position().progress,0);
  c.pause();c.seek(4);assert.equal(c.position().scene.id,'fault');assert.equal(c.playing,false);
  c.seek(-9);assert.equal(c.position().index,0);c.seek(999);assert.equal(c.position().index,13);
});
test('replay resets a finished sequence and ignores negative clock deltas',()=>{
  const c=new DemoClock();c.start(0);c.tick(999999);assert.equal(c.elapsed,180);c.start(1000);assert.equal(c.elapsed,0);assert.equal(c.playing,true);c.tick(500);assert.equal(c.elapsed,0);
});
test('replays calculate the same results; only queued, compatible jobs are scheduled',()=>{
  const a=createDemoScenario(model),b=createDemoScenario(model);assert.deepEqual(a.base,b.base);assert.deepEqual(a.plan,b.plan);assert.ok(a.plan.cost<a.base.cost);assert.ok(a.plan.late<a.base.late);
  assert.equal(a.plan.rows.length,12);assert.equal(a.offlinePlan.rows.length,12);assert.ok(!a.offlinePlan.rows.some(r=>r.machineId==='P03'));
  for(const r of a.plan.rows){const m=a.fleet.find(m=>m.id===r.machineId);assert.ok(m.materials.includes(r.material));assert.ok(r.start>=m.available);}
  const e=evaluate(a.plan.rows.map(r=>({job:a.queue.find(j=>j.id===r.id),machineId:r.machineId})),a.fleet);assert.equal(e.cost,a.plan.cost);
});
test('animated fault begins normal and ends at the exact model output used in later scenes',()=>{
  const a=createDemoScenario(model),start=faultAt(0,model),end=faultAt(1,model);assert.equal(start.result.index,0);assert.equal(end.result.index,1);assert.ok(end.result.concern>start.result.concern);assert.deepEqual(end.rows,a.fleet[2].rows);assert.deepEqual(end.result,a.fleet[2].result);
});
test('every visual scene renders computed values without missing data',()=>{
  const s=createDemoScenario(model);
  for(const scene of SCENES){const html=sceneVisual(scene.id,s,m=>`<svg aria-label="${m.id}"></svg>`);assert.ok(html.length>300);assert.doesNotMatch(html,/undefined|NaN|Infinity/);}
  const result=sceneVisual('results',s);assert.ok(result.includes('$'+s.plan.cost.toFixed(2)));assert.ok(result.includes('$'+s.base.cost.toFixed(2)));
});
