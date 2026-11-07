import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const url = new URL('../js/weapon-feel.js', import.meta.url);
test('presentation module exists', () => assert.ok(existsSync(url), 'missing weapon feel implementation'));
if (existsSync(url)) {
 const {createFeel,triggerFeel,stepFeel,sampleFeel,markerKind,allowImpact,flinchPose} = await import(url);
 const gestures = [];
 for (const path of ['baton','pelle','onde']) for (const alt of [false,true]) {
  test(`${path} ${alt ? 'secondary' : 'primary'}: readable, continuous, bounded and settles`, () => {
   const s = createFeel(); triggerFeel(s,path,alt,true);
   stepFeel(s,.025); const pose = sampleFeel(s); gestures.push(JSON.stringify(pose));
   assert.ok(Math.abs(pose.rx)+Math.abs(pose.ry)+Math.abs(pose.z) > .02);
   let prev=pose;
   for(let i=0;i<200;i++) {stepFeel(s,.005); const p=sampleFeel(s); for(const k of Object.keys(p)) {assert.ok(Number.isFinite(p[k])); assert.ok(Math.abs(p[k]-prev[k])<.25,`${k} discontinuity`);} prev=p;}
   assert.deepEqual(sampleFeel(s),sampleFeel(createFeel()));
  });
 }
 test('six gestures differ',()=>assert.equal(new Set(gestures).size,6));
 test('rapid retrigger never queues or grows; pause freezes; reset is idle',()=>{
  const s=createFeel(); for(let i=0;i<10000;i++){triggerFeel(s,'pelle',i%2===0,false);stepFeel(s,.01); assert.ok(Math.abs(sampleFeel(s).z)<.3);}
  const p=sampleFeel(s);stepFeel(s,0);assert.deepEqual(sampleFeel(s),p);
  assert.equal(Object.keys(s).length,Object.keys(createFeel()).length);
  assert.equal(sampleFeel(createFeel()).energy,0);
 });
 test('kill remains visible until expiry; beat outranks normal',()=>{
  assert.equal(markerKind('kill',.1,''),'kill');assert.equal(markerKind('kill',.1,'beat'),'kill');
  assert.equal(markerKind('kill',0,''),'');assert.equal(markerKind('beat',.05,''),'beat');assert.equal(markerKind('',.1,'kill'),'kill');
 });
 test('impact gate coalesces multi-pellet attacks and bounds voice rate without growing history',()=>{
  const gate={}; assert.equal(allowImpact(gate,1,0),true);
  for(let i=0;i<20;i++)assert.equal(allowImpact(gate,1,.01),false);
  assert.equal(allowImpact(gate,2,.01),false);assert.equal(allowImpact(gate,2,.06),true);
  assert.equal(allowImpact(gate,1,.12),false);
  for(let i=3;i<10000;i++)allowImpact(gate,i,i*.06);
  assert.ok(gate.ids.length<=16);
 });
 test('flinch settles, is directional and strength bounded',()=>{
  assert.deepEqual(flinchPose(1,1,1),{x:0,z:0});
  const a=flinchPose(.03,1,1),b=flinchPose(.03,1,-1),boss=flinchPose(.03,.08,1);
  assert.equal(a.z,-b.z); assert.ok(Math.abs(boss.x)<Math.abs(a.x));assert.ok(Math.abs(a.x)<.3);
 });
}
// Compare the exact sampled pose immediately before/after the event, not just bounds.
for (const path of ['baton','pelle','onde']) for (const alt of [false,true]) {
 const upgraded = path==='baton' ? (alt ? 2.4*.75**3 : .42)
   : path==='pelle' ? (alt ? 1.6*.85**3 : 1/(7.5*(1+.15*5)))
   : (alt ? 5*.8**3 : 1/3.2);
 for(const interval of [.1,upgraded])test(`continuous retrigger ${path}/${alt} every ${interval}s including beat changes`,async()=>{
  const {createFeel,triggerFeel,stepFeel,sampleFeel}=await import(url);
  const s=createFeel();triggerFeel(s,path,alt,false);
  for(let i=0;i<100;i++){
   for(let t=0;t<interval;t+=.001)stepFeel(s,Math.min(.001,interval-t));
   const before=sampleFeel(s);triggerFeel(s,path,alt,i%2===0);const after=sampleFeel(s);
   for(const key of Object.keys(before))assert.ok(Math.abs(after[key]-before[key])<1e-12,`${key} jumped ${before[key]} -> ${after[key]} on shot ${i}`);
   stepFeel(s,.001);const next=sampleFeel(s);
   for(const key of Object.keys(next))assert.ok(Math.abs(next[key]-after[key])<.09,`${key} jumped during first millisecond`);
  }
  stepFeel(s,2);assert.deepEqual(sampleFeel(s),sampleFeel(createFeel()));
 });
}
test('primary/secondary overlap stays continuous when beat changes',async()=>{
 const {createFeel,triggerFeel,stepFeel,sampleFeel}=await import(url);
 for(const path of ['baton','pelle','onde']){
  const s=createFeel();triggerFeel(s,path,false,true);stepFeel(s,.03);
  for(let i=0;i<100;i++){
   const before=sampleFeel(s);triggerFeel(s,path,i%2===0,i%3===0);const after=sampleFeel(s);
   for(const key of Object.keys(before))assert.ok(Math.abs(after[key]-before[key])<1e-12,`${path}/${key} overlap jump`);
   stepFeel(s,.017);
  }
 }
});
