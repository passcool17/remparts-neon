// Presentation only: no combat clock, camera aim, damage or collision state.
const profiles = {
  baton: [0.32, 0.44], pelle: [0.17, 0.38], onde: [0.28, 0.48]
};
export const createFeel = () => ({
  path:'baton', primary:1, secondary:1,
  primaryFrom:0, secondaryFrom:0, primaryPeak:1, secondaryPeak:1
});
export function triggerFeel(s, path, alt, on) {
  if (s.path !== path) Object.assign(s, createFeel(), {path});
  const channel = alt ? 'secondary' : 'primary';
  // Capture this channel's current displacement before restarting its clock.
  // Beat gain belongs to the channel, so a new shot cannot rescale the other one.
  s[channel + 'From'] = channelValue(s[channel], s[channel + 'From'], s[channel + 'Peak']);
  s[channel + 'Peak'] = on ? 1.08 : 1;
  s[channel] = 0;
}
export function stepFeel(s, dt) {
  const d=profiles[s.path];
  s.primary=Math.min(1,s.primary+Math.max(0,dt)/d[0]);
  s.secondary=Math.min(1,s.secondary+Math.max(0,dt)/d[1]);
}
// Fast contact from the current displacement, followed by a smooth landing.
function channelValue(t, from, peak) {
  if (t >= 1) return 0;
  return t < .12 ? from + (peak - from) * Math.sin(t / .12 * Math.PI / 2)
    : peak * Math.pow((1 - t) / .88, 2);
}
const envelope = t => t >= 1 ? 0 : (t < .12 ? Math.sin(t/.12*Math.PI/2) : Math.pow((1-t)/.88,2));
export function sampleFeel(s) {
  const a=channelValue(s.primary, s.primaryFrom, s.primaryPeak);
  const b=channelValue(s.secondary, s.secondaryFrom, s.secondaryPeak);
  if (!a && !b) return {x:0,y:0,z:0,rx:0,ry:0,rz:0,energy:0,trail:0};
  let x=0,y=0,z=0,rx=0,ry=0,rz=0,energy=0,trail=0;
  if(s.path==='baton') {
    x=-.19*a+.06*b; y=-.04*a+.05*b; z=.025*a-.12*b;
    rx=-.52*a-.7*b; ry=-.95*a+.34*b; rz=.65*a-.3*b; trail=Math.max(a,b*.7);
  } else if(s.path==='pelle') {
    x=.012*a-.025*b; y=-.018*a-.045*b; z=.085*a+.15*b;
    rx=.2*a+.38*b; ry=.025*a-.06*b; rz=-.025*a+.09*b;
  } else {
    x=-.025*b; y=.025*a+.065*b; z=.065*a-.13*b;
    rx=-.12*a-.4*b; ry=.08*a+.24*b; rz=-.06*a-.16*b; energy=Math.max(a,b);
  }
  return {x,y,z,rx,ry,rz,energy,trail};
}
export function markerKind(current,remaining,next) {
  const priority={'':0,beat:1,kill:2};
  return remaining>0 && priority[current]>priority[next] ? current : next;
}
export function allowImpact(s,id,now) {
  s.ids ||= [];
  if(s.ids.includes(id) || now-(s.last ?? -Infinity)<.045) return false;
  s.ids.push(id); if(s.ids.length>16) s.ids.shift(); s.last=now; return true;
}
export function flinchPose(age,strength,side) {
  if(age>=.2) return {x:0,z:0};
  const f=envelope(Math.max(0,age)/.2)*Math.max(0,Math.min(1,strength));
  return {x:-.22*f,z:.16*f*side};
}
