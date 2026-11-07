import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Music} from '../js/audio.js';
function audio(){const m=new Music(),calls=[];m.ctx={currentTime:0};m.tone=(...a)=>calls.push(['tone',...a]);m.snz=(...a)=>calls.push(['noise',...a]);return {m,calls};}
test('weapon impact palettes differ',()=>{
 const random=Math.random;Math.random=()=>.5;
 const palettes=['baton','pelle','onde'].map(k=>{const {m,calls}=audio();m.hit(k,1);return JSON.stringify(calls);});
 Math.random=random;assert.equal(new Set(palettes).size,3);
});
test('one impact sound per salvo; burst never silences damage or kill sound',()=>{
 const {m,calls}=audio();m.hit('pelle',1);const count=calls.length;assert.ok(count>0);
 for(let i=0;i<20;i++)m.hit('pelle',1);assert.equal(calls.length,count);
 m.kill(1);assert.ok(calls.length>count);
});
test('new feedback noise does not consume the shared combat RNG',()=>{
 const random=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};
 const node=()=>({frequency:{value:0},Q:{value:0},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}});
 try {
  const m=new Music();m.mode=1;m.ctx={currentTime:0,state:'running',createBufferSource:node,createBiquadFilter:node,createGain:node};m.tone=()=>{};
  for(let i=0;i<10;i++)m.hit('pelle',1);
  assert.equal(draws,10,'exactly original hit variation draw even if coalesced');
  draws=0;m.shoot('onde',false);assert.equal(draws,0,'original onde departure had no noise RNG');
 } finally {Math.random=random;}
});
