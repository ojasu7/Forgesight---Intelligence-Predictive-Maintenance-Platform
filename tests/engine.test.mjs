import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {telemetry,infer,machines,jobs,baseline,optimize,evaluate,parseCSV} from '../dist/engine.js';
const model=JSON.parse(readFileSync(new URL('../dist/model.json',import.meta.url)));
test('JS inference classifies independent simulated windows and probabilities normalize',()=>{
  let correct=0,total=0;
  for(const [label,mode] of ['normal','blockage','thermal','vibration'].entries())for(let seed=500;seed<550;seed++){
    const r=infer(telemetry(mode,seed,.65),model);if(r.index===label)correct++;total++;
    assert.ok(Math.abs(r.scores.reduce((a,b)=>a+b,0)-1)<1e-10);assert.ok(Number.isFinite(r.anomaly));
  }
  assert.ok(correct/total>.95,`JS generator accuracy ${correct/total}`);
});
test('optimized schedule is compatible, serial, complete, and no worse than baseline',()=>{
  for(let seed=1;seed<=30;seed++){
    const f=machines();for(const [i,m] of f.entries())m.concern=infer(telemetry(i%2?'normal':'blockage',seed+i,.5),model).concern;
    f[2].offline=seed%2===0;
    const q=jobs(),b=baseline(q,f),p=optimize(q,f);assert.ok(p.cost<=b.cost+1e-8);assert.equal(p.rows.length,q.length);assert.equal(new Set(p.rows.map(x=>x.id)).size,q.length);
    for(const m of f){let end=m.available;for(const r of p.rows.filter(r=>r.machineId===m.id)){assert.ok(!m.offline);assert.ok(m.materials.includes(r.material));assert.ok(r.start>=end-1e-8);assert.ok(r.end>=r.start);end=r.end;}}
  }
});
test('infeasible PETG allocation returns no proposed dispatch',()=>{
  const f=machines();f[1].offline=true;f[4].offline=true;assert.equal(optimize(jobs(),f).cost,Infinity);assert.ok(optimize(jobs(),f).unassigned);
});
test('cost terms match hand calculation',()=>{
  const f=[{id:'P01',available:10,speed:1,concern:.5,offline:false,materials:['PLA']}];
  const job={id:'X',material:'PLA',minutes:60,due:80,materialCost:4};
  const e=evaluate([{job,machineId:'P01'}],f,{downtime:60,lateRate:12,machineRate:2});
  assert.equal(e.rows[0].end,100);assert.equal(e.late,1);assert.equal(e.exposure,3);assert.equal(e.cost,7);
});
test('CSV parsing handles quoting, BOM, spacing, rejects invalid sensor data and timestamps',()=>{
  const head='\uFEFFmachine_id,timestamp,temp_c,vibration_mm_s,motor_a,extrusion_mm_s\r\n';
  const good=head+telemetry('normal',9).map(r=>`"P01",${r.timestamp},${r.temp_c},${r.vibration_mm_s},${r.motor_a},${r.extrusion_mm_s}`).join('\r\n');
  assert.equal(parseCSV(good).P01.length,30);
  assert.throws(()=>parseCSV(good.replace('"P01"','"P99"')),/Machine IDs/);
  assert.throws(()=>parseCSV(head+'P01,0,NaN,1,1,4'),/numeric/);
  assert.throws(()=>parseCSV(head+'P01,0,200,-1,1,4'),/ranges/);
  assert.throws(()=>parseCSV(head+'P01,0,200,1,1,4'),/12 samples/);
  assert.throws(()=>parseCSV(good.replace('"P01",10,','"P01",0,')),/distinct/);
  assert.throws(()=>parseCSV(good.replace('"P01",10,','"P01",11,')),/evenly spaced/);
});
test('zero-cost assumption leaves costs zero',()=>{
  const p=optimize(jobs().map(j=>({...j,materialCost:0})),machines(),{downtime:0,lateRate:0,machineRate:0});assert.equal(p.cost,0);
});
