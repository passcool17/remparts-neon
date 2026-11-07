import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {Vector3} from '../vendor/three.module.min.js';
import * as feel from '../js/weapon-feel.js';
const baseline=execFileSync('git',['show','8ce6e169fd13ae4461118bf2364c19fd64e4ae74:js/main.js'],{encoding:'utf8'});
const current=()=>readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
const section=(src,a,b)=>src.slice(src.indexOf(`function ${a}(`),src.indexOf(`function ${b}(`));
const clone=x=>JSON.parse(JSON.stringify(x));
function scenario(src,path,alt,up,on,miss,lethal=false) {
 const G={path,up,shots:0,P:{x:0,z:0,yaw:0,pitch:0,bob:0},enemies:[],projs:[],shake:0};
 const events=[]; const math=Object.create(Math);math.random=()=>.5;
 const noop=()=>{};const fx=new Proxy({},{get:()=>noop});const music=new Proxy({},{get:()=>noop});
 const elements={};const $=id=>elements[id]||=( {className:'',classList:{add:noop}} );
 for(let i=0;i<3;i++)G.enemies.push({id:i,x:miss?30:0,z:miss?30:-1-i*.4,y:0,hp:lethal?1:10000,T:{r:.5,h:2,colors:[0xffffff]},type:i===1?'plow':'cone',kx:0,kz:0,dead:false,untouchable:false});
 const context={G,Math:math,V3:Vector3,tmpV:new Vector3(),isTouch:false,save:{nums:false},fx,music,$,
  clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),rnd:(a,b)=>(a+b)/2,judgeBeat:()=>on,
  floatText:noop,flushDmg:noop,hitMark:noop,feel:feel.createFeel(),...feel,
  killEnemy:e=>{e.dead=true;events.push(['kill',e.id]);},
  addProj:(kind,pos,vel,o)=>events.push(['proj',kind,clone(pos),clone(vel),clone(o)])};
 vm.createContext(context);
 const funcs=section(src,'computeStats','disposeTree').split('// ---------- État')[0]+section(src,'aimDir','beatErr')+section(src,'dmgEnemy','flushDmg')+section(src,'attack','perfectDodge');
 vm.runInContext(funcs,context);context.computeStats();context.attack(alt);
 const damage=G.enemies.map(e=>[e.hp,e.kx,e.kz,e.dead]);
 // Exercise the actual explosion path separately (radius, falloff, chains).
 if(path==='onde')context.explode({boom:G.st.radius,dmg:G.st.dmg,pos:new Vector3(0,1,-2),on,feedbackId:G.shots});
 return {result:clone({st:G.st,shots:G.shots,damage,after:G.enemies.map(e=>[e.hp,e.kx,e.kz,e.dead]),events,shake:G.shake}),context};
}
const upgrades={b_dmg:5,b_arc:3,b_puck:3,p_dmg:5,p_rate:5,p_burst:3,p_pierce:2,o_dmg:5,o_rad:4,o_pulse:3,o_chain:3,beat:3,xtra:2,crit:2};
for(const path of ['baton','pelle','onde'])for(const alt of [false,true])for(const up of [{},upgrades])for(const on of [false,true])for(const miss of [false,true])for(const lethal of [false,true]) {
 test(`unchanged combat ${path}/${alt}/${Object.keys(up).length}/${on}/${miss}/${lethal}`,()=>{
  const a=scenario(baseline,path,alt,up,on,miss,lethal).result,b=scenario(current(),path,alt,up,on,miss,lethal).result;
  // Presentation metadata on projectiles is deliberately outside combat state.
  for(const r of [a,b])for(const e of r.events)if(e[0]==='proj'){delete e[4].feedbackId;delete e[4].feedbackKind;}
  assert.deepEqual(b,a);
 });
}
test('real attack triggers the presentation independently of hits',()=>{
 for(const path of ['baton','pelle','onde'])for(const alt of [false,true]){
  const {context:c}=scenario(current(),path,alt,{},false,true);feel.stepFeel(c.feel,.025);
  const p=feel.sampleFeel(c.feel);assert.ok(Math.abs(p.rx)+Math.abs(p.ry)>0,`${path}/${alt}`);
 }
});
test('hit adds cosmetic directional flinch, no physical stat mutation',()=>{
 const {context:c}=scenario(current(),'pelle',false,{},false,false);
 assert.equal(c.G.enemies[0].flinchAge,0);assert.ok(Number.isFinite(c.G.enemies[0].flinchSide));
});
test('player update, projectile trajectory, saves/shop and shake multiplication unchanged',()=>{
 for(const [a,b] of [['updPlayer','updProjs'],['buy','nextFromShop'],['computeStats','disposeTree']]) {
  assert.equal(section(current(),a,b),section(baseline,a,b));
 }
 assert.ok(current().includes('G.shake * G.shake * 0.12 * save.shake'));
 assert.equal((current().match(/G\.hitstop\s*=/g)||[]).length,(baseline.match(/G\.hitstop\s*=/g)||[]).length);
});
test('real hitmarker preserves kill priority and original lifetime',()=>{
 const marker={className:''};const G={};const c={G,$:()=>marker,markerKind:feel.markerKind};vm.createContext(c);
 vm.runInContext(section(current(),'hitMark','killEnemy'),c);
 c.hitMark('kill');c.hitMark('');c.hitMark('beat');assert.equal(marker.className,'on kill');assert.equal(G.hitT,.22);
 G.hitT=0;c.hitMark('');assert.equal(marker.className,'on ');assert.equal(G.hitT,.1);
});
test('respawn clears presentation and audio IDs so a new run can reuse shot IDs',()=>{
 const s=feel.createFeel();feel.triggerFeel(s,'onde',true,true);
 const marker={className:'on kill'},G={li:0,st:{hpMax:100,dashMax:1},hitKind:'kill',hitT:.2,mflashT:.05,swing:1,recoil:1};
 const music={impactGate:{ids:[1],last:100}};
 const c={G,feel:s,music,createFeel:feel.createFeel,$:()=>marker,LEVELS:[{arena:{type:'circle'}}]};vm.createContext(c);
 vm.runInContext(section(current(),'newPlayer','startRun'),c);c.newPlayer();
 assert.equal(feel.sampleFeel(s).energy,0);assert.equal(G.mflashT,0);assert.equal(G.swing,0);assert.equal(G.recoil,0);assert.equal(marker.className,'');assert.deepEqual(clone(music.impactGate),{});
});
test('projectile physics, enemy death rewards and all non-combat assets remain unchanged',()=>{
 const strip=s=>s.replaceAll(', undefined, p.feedbackId','');
 assert.equal(strip(section(current(),'updProjs','setText')),section(baseline,'updProjs','setText'));
 for(const [a,b] of [['killEnemy','attack'],['judgeBeat','dmgEnemy'],['pollPad','focusables']])assert.equal(section(current(),a,b),section(baseline,a,b));
 for(const path of ['js/fx.js','js/world.js','js/text.js','js/enemies.js','js/fullscreen.js','style.css','index.html']){
  assert.equal(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),execFileSync('git',['show',`8ce6e169fd13ae4461118bf2364c19fd64e4ae74:${path}`],{encoding:'utf8'}));
 }
});
