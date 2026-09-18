import * as THREE from 'three';

/**
 * Original, generic hydraulic workover spread. Nominal metre units, Y up.
 * Illustrative arrangement, not a design, load calculation or operating procedure.
 * The low open platform is supporting context; it is not a vessel or jack-up rig.
 * Component arrangement references: Joeny Holdings, Hydraulic Workover services;
 * WellGear, Equipment. Geometry is authored here, not copied from either source.
 */
export function buildHWU() {
  const group = new THREE.Group();
  group.name = 'Hydraulic workover unit · generic platform installation';
  const labels = {
    'hwu-base':'Supporting platform and load-spreading base',
    'hwu-jack':'Hydraulic jack cylinders and frame',
    'hwu-travelling-slips':'Travelling slip head',
    'hwu-stationary-slips':'Stationary slip head',
    'hwu-workbasket':'Elevated open work basket',
    'hwu-guide':'Telescoping tubing guide',
    'hwu-bop':'Illustrative pressure-control stack',
    'hwu-hpu':'Hydraulic power unit',
    'hwu-controls':'Operator controls and shelter',
    'hwu-pipe':'Work string and tubing rack',
    'hwu-handling':'Tubular handling boom and winches',
    'hwu-manifold':'Surface flow-control manifold',
    'hwu-tank':'Service fluid tank and transfer pump',
    'hwu-access':'Access stairs and landings'
  };
  const parts = new Map();
  for (const [id,name] of Object.entries(labels)) {const p=new THREE.Group();p.name=name;p.userData.componentId=id;parts.set(id,p);group.add(p);}
  const material=(name,color,roughness=.57,metalness=.5)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name=name;return m;};
  const M={
    teal:material('MTR deep teal','#0b796e'),lightTeal:material('Teal panels','#259990'),
    dark:material('Dark steel','#283f43'),steel:material('Galvanized steel','#a9bbb9',.48,.65),
    chrome:material('Polished piston rods','#e3eded',.21,.85),deck:material('Deck plate','#8da6a5',.83,.25),
    yellow:material('Safety yellow','#f3bf42',.55,.35),black:material('Rubber and hose','#14282e',.85,.05),
    red:material('Pressure-control red','#b75340'),pale:material('Light equipment panels','#dae4de'),
    blue:material('Hydraulic fittings','#427e9b'),brass:material('Bronze internals','#d0aa62',.42,.7),
    glass:material('Dark blue glazing','#346572',.25,.55),white:material('Instrument faces','#eff3e8',.6,.05)
  };
  const cube=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,16),
    hex=new THREE.CylinderGeometry(1,1,1,6),sphere=new THREE.SphereGeometry(1,12,8),
    donut=new THREE.TorusGeometry(1,.09,8,28),flangeGeo=new THREE.LatheGeometry([
      new THREE.Vector2(.36,-.5),new THREE.Vector2(1,-.5),new THREE.Vector2(1,.5),new THREE.Vector2(.36,.5),new THREE.Vector2(.36,-.5)
    ],28), sleeveGeo=new THREE.LatheGeometry([
      new THREE.Vector2(.7,-.5),new THREE.Vector2(1,-.5),new THREE.Vector2(1,.5),new THREE.Vector2(.7,.5),new THREE.Vector2(.7,-.5)
    ],24);
  const batches=new Map(),up=new THREE.Vector3(0,1,0),V=a=>new THREE.Vector3(...a);
  const eulerQ=r=>new THREE.Quaternion().setFromEuler(new THREE.Euler(...r));
  function instance(p,geo,mat,pos,scale,q=new THREE.Quaternion()) {
    if(!batches.has(p))batches.set(p,new Map());const table=batches.get(p),key=geo.uuid+mat.uuid;
    if(!table.has(key))table.set(key,{geo,mat,matrices:[]});
    table.get(key).matrices.push(new THREE.Matrix4().compose(V(pos),q,V(scale)));
  }
  function box(p,s,pos,m=M.steel,r=[0,0,0]){instance(p,cube,m,pos,s,eulerQ(r));}
  function cyl(p,r,h,pos,m=M.steel,rotation=[0,0,0]){instance(p,cylinder,m,pos,[r,h,r],eulerQ(rotation));}
  function ball(p,r,pos,m=M.black){instance(p,sphere,m,pos,[r,r,r]);}
  function beam(p,a,b,w=.15,d=w,m=M.teal){const aa=V(a),bb=V(b),delta=bb.clone().sub(aa);instance(p,cube,m,aa.add(bb).multiplyScalar(.5).toArray(),[w,delta.length(),d],new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()));}
  function tube(p,a,b,r=.07,m=M.steel){const aa=V(a),bb=V(b),delta=bb.clone().sub(aa);instance(p,cylinder,m,aa.add(bb).multiplyScalar(.5).toArray(),[r,delta.length(),r],new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()));}
  function ring(p,r,h,pos,m=M.steel,rotation=[0,0,0]){instance(p,flangeGeo,m,pos,[r,h,r],eulerQ(rotation));}
  function loop(p,r,pos,m=M.black,rotation=[0,0,0],thickness=1){instance(p,donut,m,pos,[r,r,r*thickness],eulerQ(rotation));}
  function bolt(p,pos,r=.06,h=.1,rotation=[0,0,0]){instance(p,hex,M.chrome,pos,[r,h,r],eulerQ(rotation));}
  function flange(p,pos,r=.8,h=.16,m=M.steel,rotation=[0,0,0],count=12){
    ring(p,r,h,pos,m,rotation);const q=eulerQ(rotation);
    for(let i=0;i<count;i++){const t=i/count*Math.PI*2,pt=V([r*.78*Math.cos(t),h*.65,r*.78*Math.sin(t)]).applyQuaternion(q).add(V(pos));bolt(p,pt.toArray(),Math.min(.08,r*.075),.13,rotation);}
  }
  function path(p,points,r=.055,m=M.black){for(let i=1;i<points.length;i++)tube(p,points[i-1],points[i],r,m);for(let i=1;i<points.length-1;i++)ball(p,r,points[i],m);}
  function rail(p,a,b,h=1.2){
    const av=V(a),bv=V(b),count=Math.max(1,Math.ceil(av.distanceTo(bv)/2));
    for(let i=0;i<=count;i++){const v=av.clone().lerp(bv,i/count);tube(p,v.toArray(),[v.x,v.y+h,v.z],.043,M.yellow);box(p,[.16,.06,.16],[v.x,v.y+.03,v.z],M.dark);}
    for(const y of [.12,.6,h])tube(p,[a[0],a[1]+y,a[2]],[b[0],b[1]+y,b[2]],y===.12?.075:.038,y===.12?M.dark:M.yellow);
  }
  function grate(p,x,y,z,w,d){
    box(p,[w,.12,d],[x,y,z],M.dark);
    for(let a=-w/2+.1;a<w/2;a+=.24)box(p,[.038,.048,d-.06],[x+a,y+.085,z],M.steel);
    for(let b=-d/2+.1;b<d/2;b+=.65)box(p,[w,.025,.04],[x,y+.075,z+b],M.steel);
  }
  function skid(p,x,z,w,d,y=8.38){
    for(const dx of [-w/2+.2,w/2-.2])box(p,[.35,.4,d],[x+dx,y,z],M.teal);
    for(const dz of [-d/2+.2,d/2-.2])box(p,[w,.4,.35],[x,y,z+dz],M.teal);
    for(const dx of [-w/2+.18,w/2-.18])for(const dz of [-d/2+.18,d/2-.18]){
      box(p,[.7,.18,.7],[x+dx,y-.2,z+dz],M.dark);loop(p,.15,[x+dx,y+.38,z+dz],M.yellow,[0,Math.PI/2,0]);
    }
  }
  function interior(p,name){const g=new THREE.Group();g.name=name;g.userData.interior=true;g.visible=false;p.add(g);return g;}
  function wheel(p,pos,r=.28,rotation=[0,0,0]){loop(p,r,pos,M.red,rotation);const q=eulerQ(rotation);for(let i=0;i<4;i++){const a=i*Math.PI/2,outer=V([r*Math.cos(a),r*Math.sin(a),0]).applyQuaternion(q).add(V(pos));tube(p,pos,outer.toArray(),.025,M.red);}ball(p,.065,pos,M.dark);}
  function gauge(p,x,y,z,r=.14){cyl(p,r,.06,[x,y,z],M.dark,[Math.PI/2,0,0]);cyl(p,r*.83,.067,[x,y,z+.02],M.white,[Math.PI/2,0,0]);tube(p,[x,y,z+.06],[x+r*.5,y+r*.4,z+.06],.008,M.red);}
  function pipeFlanges(p,a,b,r=.14,m=M.teal){tube(p,a,b,r,m);const d=V(b).sub(V(a)).normalize(),q=new THREE.Quaternion().setFromUnitVectors(up,d),rot=new THREE.Euler().setFromQuaternion(q);for(const end of [a,b])flange(p,end,r*1.8,.11,M.steel,[rot.x,rot.y,rot.z],6);}

  // The context deck is intentionally an open fixed platform, with no ship hull,
  // jacking machinery, accommodation block or derrick.
  const base=parts.get('hwu-base');
  for(const x of [-14,14])for(const z of [-11,11]){
    cyl(base,.66,11.6,[x,2,z],M.dark);
    for(const y of [-3.5,3.2,6.7])ring(base,.85,.3,[x,y,z],M.teal);
    box(base,[2.4,.25,2.4],[x,6.65,z],M.teal);
    for(const dx of [-.82,.82])for(const dz of [-.82,.82])bolt(base,[x+dx,6.85,z+dz],.1,.18);
  }
  for(const z of [-11,11]){
    beam(base,[-14,-3,z],[14,6.5,z],.37,.37,M.steel);
    beam(base,[14,-3,z],[-14,6.5,z],.37,.37,M.steel);
  }
  for(const x of [-14,14]){
    beam(base,[x,-3,-11],[x,6.5,11],.32,.32,M.steel);
    beam(base,[x,-3,11],[x,6.5,-11],.32,.32,M.steel);
  }
  for(const x of [-18,-12,-6,0,6,12,18])box(base,[.3,.8,31.4],[x,7.1,0],M.teal);
  for(const z of [-15.6,-10,-5,0,5,10,15.6])box(base,[39.6,.72,.32],[0,7.3,z],M.teal);
  // Four panels leave a central well opening.
  box(base,[18.6,.25,32],[-10.7,7.8,0],M.deck);box(base,[18.6,.25,32],[10.7,7.8,0],M.deck);
  box(base,[2.8,.25,14.6],[0,7.8,-8.7],M.deck);box(base,[2.8,.25,14.6],[0,7.8,8.7],M.deck);
  for(const z of [-16,16]){box(base,[40,.45,.17],[0,7.72,z],M.dark);rail(base,[-20,7.95,z],[20,7.95,z]);}
  for(const x of [-20,20]){box(base,[.17,.45,32],[x,7.72,0],M.dark);rail(base,[x,7.95,-16],[x,7.95,16]);}
  for(let z=-14;z<=14;z+=2)for(const x of [-19.85,19.85])box(base,[.08,.025,.55],[x,7.95,z],M.yellow);
  for(const x of [-3.2,3.2])box(base,[.55,.6,8.8],[x,8.17,0],M.teal);
  for(const z of [-4,4])box(base,[7.2,.6,.5],[0,8.2,z],M.teal);
  for(const x of [-2.6,2.6])for(const z of [-2.6,2.6]){
    box(base,[1.3,.22,1.3],[x,8.48,z],M.steel);for(const dx of [-.42,.42])for(const dz of [-.42,.42])bolt(base,[x+dx,8.65,z+dz],.085,.14);
    beam(base,[x,8.5,z],[x*.77,15.1,z*.77],.34,.34,M.teal);
    beam(base,[x,8.7,z],[x*.77,13.6,-z*.77],.16,.16,M.steel);
  }
  for(const z of [-2.0,2.0])box(base,[4.65,.35,.3],[0,15.08,z],M.teal);
  for(const x of [-2,2])box(base,[.3,.35,4.65],[x,15.08,0],M.teal);
  for(const x of [-17.8,17.8])for(const z of [-14,14]){
    tube(base,[x,8,z],[x,11.4,z],.055,M.steel);box(base,[.62,.17,.36],[x,11.4,z],M.pale,[.2,0,0]);
  }

  // Compact stack through the deck. Ram bonnets sit across the bore; flanges,
  // bonnet bolts and control ports retain readability at close zoom.
  const bop=parts.get('hwu-bop');
  cyl(bop,.43,4.5,[0,6.55,0],M.dark);flange(bop,[0,8.25,0],.88,.26,M.steel);
  cyl(bop,.55,1,[0,8.77,0],M.teal);
  for(const y of [9.55,10.95]){
    box(bop,[2.12,.94,1.35],[0,y,0],M.red);
    cyl(bop,.69,.9,[0,y,0],M.red);
    for(const s of [-1,1]){
      box(bop,[1.25,.7,1.05],[s*1.55,y,0],M.red);
      cyl(bop,.36,.65,[s*2.34,y,0],M.dark,[0,0,Math.PI/2]);
      box(bop,[.16,.92,1.24],[s*2.04,y,0],M.red);
      for(const yy of [-.32,.32])for(const zz of [-.44,.44])bolt(bop,[s*2.15,y+yy,zz],.072,.13,[0,0,Math.PI/2]);
      tube(bop,[s*2.1,y+.25,.48],[s*2.5,y+.25,.48],.07,M.brass);
    }
    flange(bop,[0,y+.58,0],.91,.18,M.steel);
  }
  cyl(bop,.77,1.1,[0,12.48,0],M.red);ring(bop,.86,.3,[0,12.98,0],M.dark);
  flange(bop,[0,13.24,0],.95,.23,M.steel);
  cyl(bop,.54,.82,[0,13.7,0],M.dark);flange(bop,[0,14.2,0],.8,.22,M.steel);
  pipeFlanges(bop,[0,10.15,.58],[0,10.15,2.4],.17,M.red);
  path(bop,[[0,10.15,2.4],[-3.9,10.15,2.4],[-3.9,8.45,2.4],[-7.4,8.45,2.4]],.16,M.red);
  for(let i=0;i<4;i++)path(bop,[[-2.5,9.3+i*.46,.45],[-3.1,9.3+i*.46,.55],[-3.5,8.4,1+i*.18],[-8.2,8.4,1+i*.18]],.045,M.black);
  const bi=interior(bop,'BOP · simplified bore, opposed rams and annular seal');
  cyl(bi,.26,5.6,[0,11.2,0],M.brass);
  for(const y of [9.55,10.95])for(const s of [-1,1]){
    box(bi,[1.0,.5,.75],[s*.7,y,0],M.brass);box(bi,[.22,.51,.52],[s*.28,y,0],M.black);
    tube(bi,[s*1.18,y,0],[s*2.48,y,0],.15,M.chrome);
  }
  ring(bi,.57,.64,[0,12.52,0],M.black);ring(bi,.38,.67,[0,12.52,0],M.brass);

  // Four lift cylinders with exposed chrome rods, a fixed open frame and
  // travelling crosshead. This is the visual centre of the HWU, not a derrick.
  const jack=parts.get('hwu-jack');
  for(const x of [-1.55,1.55])for(const z of [-1.55,1.55]){
    box(jack,[1,.3,1],[x,15.3,z],M.teal);
    cyl(jack,.32,3.65,[x,17.2,z],M.teal);ring(jack,.39,.25,[x,15.48,z],M.dark);
    ring(jack,.42,.23,[x,19.1,z],M.yellow);ring(jack,.33,.18,[x,19.28,z],M.dark);
    cyl(jack,.165,2.1,[x,20.33,z],M.chrome);ring(jack,.28,.18,[x,21.34,z],M.steel);
    for(const y of [15.7,18.85]){tube(jack,[x,y,z],[x+.5,y,z],.075,M.brass);cyl(jack,.12,.17,[x+.51,y,z],M.blue,[0,0,Math.PI/2]);}
    for(const dz of [-.23,.23])for(const dx of [-.23,.23])bolt(jack,[x+dx,15.53,z+dz],.055,.12);
    path(jack,[[x+.5,18.85,z],[x+.7,18.85,z],[x+.74,15.6,z],[x+.74,14.7,z],[x+.9,8.6,z],[-8.8,8.6,z]],.042,M.black);
  }
  for(const x of [-2.38,2.38])for(const z of [-2.38,2.38]){
    box(jack,[.23,7.2,.23],[x,18.7,z],M.teal);
    for(const y of [15.4,18,21.9])box(jack,[.37,.35,.37],[x,y,z],M.steel);
  }
  for(const z of [-2.38,2.38])for(const y of [15.55,22.13])box(jack,[5,.26,.28],[0,y,z],M.teal);
  for(const x of [-2.38,2.38])for(const y of [15.55,22.13])box(jack,[.28,.26,5],[x,y,0],M.teal);
  for(const x of [-2.38,2.38])beam(jack,[x,15.8,-2.38],[x,22,2.38],.095,.095,M.steel);
  const ji=interior(jack,'Jack cylinders · pistons, rods and oil volumes');
  for(const x of [-1.55,1.55])for(const z of [-1.55,1.55]){
    cyl(ji,.245,.35,[x,17.55,z],M.brass);cyl(ji,.14,3.75,[x,19.35,z],M.chrome);
    ring(ji,.27,.07,[x,17.39,z],M.black);ring(ji,.27,.07,[x,17.72,z],M.black);
    cyl(ji,.22,1.45,[x,16.58,z],M.blue);
  }

  function slipHead(p,y,travelling){
    // Four bars form the crosshead around the central through-bore.
    for(const z of [-.96,.96])box(p,[3.9,.44,.58],[0,y,z],travelling?M.yellow:M.teal);
    for(const x of [-1.53,1.53])box(p,[.65,.44,1.85],[x,y,0],travelling?M.yellow:M.teal);
    ring(p,.99,.75,[0,y+.15,0],M.dark);flange(p,[0,y+.57,0],1.15,.2,M.steel, [0,0,0],16);
    ring(p,.72,.25,[0,y+.74,0],M.teal);
    for(const s of [-1,1]){
      box(p,[.75,.62,.68],[s*1.21,y+.2,0],M.teal);
      cyl(p,.2,.67,[s*1.67,y+.25,0],M.dark,[0,0,Math.PI/2]);
      path(p,[[s*1.96,y+.28,0],[s*2.12,y+.28,.4],[s*2.12,y-.5,.65],[s*2.5,y-.7,.8]],.045,M.black);
    }
    for(const x of [-1.55,1.55])for(const z of [-1.55,1.55]){
      box(p,[.85,.32,.85],[x,y,z],travelling?M.yellow:M.teal);bolt(p,[x,y+.24,z],.12,.16);
    }
    const inside=interior(p,'Slip bowl · illustrative gripping wedges');
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,x=.47*Math.cos(a),z=.47*Math.sin(a);
      box(inside,[.27,.66,.28],[x,y+.15,z],M.brass,[0,-a,0]);
      for(let j=0;j<7;j++)box(inside,[.29,.035,.035],[.325*Math.cos(a),y-.12+j*.083,.325*Math.sin(a)],M.chrome,[0,-a+Math.PI/2,0]);
    }
    ring(inside,.85,.2,[0,y-.31,0],M.blue);
  }
  slipHead(parts.get('hwu-stationary-slips'),15.8,false);
  slipHead(parts.get('hwu-travelling-slips'),21.38,true);

  const guide=parts.get('hwu-guide');
  for(const [r,y,h] of [[.39,16.8,1.4],[.33,18.1,1.4],[.28,19.43,1.4],[.24,20.47,.65]]){
    instance(guide,sleeveGeo,M.steel,[0,y,0],[r,h,r]);instance(guide,sleeveGeo,M.dark,[0,y+h/2,0],[r+.045,.1,r+.045]);
  }
  for(const z of [-.75,.75]){
    tube(guide,[0,16.3,z],[0,20.86,z],.065,M.chrome);
    for(const y of [16.5,18.1,19.5,20.7]){box(guide,[1.22,.12,.2],[0,y,z],M.teal);tube(guide,[0,y,z],[0,y,z*.38],.065,M.steel);}
  }

  const basket=parts.get('hwu-workbasket');
  grate(basket,-3.25,22.12,0,2,8.1);grate(basket,3.25,22.12,0,2,8.1);
  grate(basket,0,22.12,-3.25,4.6,1.6);grate(basket,0,22.12,3.25,4.6,1.6);
  for(const x of [-4.27,4.27]){
    box(basket,[.22,.4,8.6],[x,21.9,0],M.teal);
    if(x<0)rail(basket,[x,22.24,-4.1],[x,22.24,4.1]);
    else {rail(basket,[x,22.24,-4.1],[x,22.24,-1.2]);rail(basket,[x,22.24,1.2],[x,22.24,4.1]);}
  }
  for(const z of [-4.1,4.1]){box(basket,[8.5,.4,.22],[0,21.9,z],M.teal);rail(basket,[-4.27,22.24,z],[4.27,22.24,z]);}
  for(const x of [-3.9,3.9])for(const z of [-3.75,3.75])beam(basket,[x*.61,20.0,z*.61],[x,21.86,z],.17,.17,M.teal);
  // Removable rail gates around the central work opening.
  for(const x of [-2.24,2.24])rail(basket,[x,22.24,-1.5],[x,22.24,1.5],.95);
  for(const z of [-2.34,2.34])rail(basket,[-1.8,22.24,z],[1.8,22.24,z],.95);
  for(const z of [-3.6,3.6])for(const x of [-3.9,3.9]){
    tube(basket,[x,22.2,z],[x,24.6,z],.044,M.steel);box(basket,[.5,.17,.3],[x,24.6,z],M.pale,[0,0,.12]);
  }
  box(basket,[.42,.75,.26],[-3.94,22.82,1.8],M.red);
  ring(basket,.27,.06,[3.98,22.91,-1.8],M.yellow,[0,0,Math.PI/2]);

  // Work string and a horizontal tubular rack share one selectable identity.
  const pipe=parts.get('hwu-pipe');
  tube(pipe,[0,4.3,0],[0,29.35,0],.125,M.chrome);
  for(const y of [6.5,15.55,24.6])cyl(pipe,.185,.34,[0,y,0],M.dark);
  cyl(pipe,.14,.12,[0,29.4,0],M.dark);
  for(const z of [-1,5.5,12]){
    box(pipe,[6.6,.24,.55],[11.5,9.2,z],M.yellow);
    for(const x of [8.8,14.2]){beam(pipe,[x,8.0,z],[x,9.24,z],.16,.16,M.teal);box(pipe,[.85,.14,.8],[x,8.02,z],M.dark);}
    for(const x of [8.1,14.9])tube(pipe,[x,9.2,z],[x,10.7,z],.072,M.teal);
  }
  for(let layer=0;layer<3;layer++)for(let i=0;i<12-layer;i++){
    const x=8.75+i*.45+layer*.225,y=9.48+layer*.31;
    tube(pipe,[x,y,-1.8],[x,y,13],.155,M.steel);
    for(const z of [-1.73,12.9])cyl(pipe,.19,.2,[x,y,z],M.dark,[Math.PI/2,0,0]);
  }
  for(const z of [1.2,9.8])box(pipe,[5.75,.07,.17],[11.4,10.47,z],M.yellow);

  // Narrow gin pole above the work basket; small side knuckle boom feeds pipe.
  const handling=parts.get('hwu-handling');
  for(const x of [-3.25,-2.5]){
    beam(handling,[x,22.25,-2.9],[x+.15,29.6,-2.9],.16,.16,M.teal);
    for(let y=22.6;y<29.6;y+=.68)tube(handling,[x,y,-2.9],[x+.5,y+.45,-2.9],.045,M.steel);
  }
  for(let y=22.4;y<29.6;y+=.74)beam(handling,[-3.25,y,-2.9],[-2.5,y,-2.9],.085,.085,M.teal);
  beam(handling,[-3.1,29.55,-2.9],[.3,29.55,-.3],.19,.22,M.yellow);
  for(const [x,z] of [[-3,-2.8],[.25,-.25]]){
    cyl(handling,.3,.17,[x,29.5,z],M.dark,[Math.PI/2,0,0]);ring(handling,.34,.05,[x,29.5,z+.08],M.yellow,[Math.PI/2,0,0]);
  }
  tube(handling,[.25,29.3,-.25],[.25,26.1,-.25],.022,M.black);
  box(handling,[.34,.5,.2],[.25,25.97,-.25],M.yellow);loop(handling,.18,[.25,25.61,-.25],M.dark);
  for(const z of [-3.45,-2.55]){
    box(handling,[1.35,.18,.6],[-3,22.47,z],M.teal);cyl(handling,.22,.78,[-3,22.83,z],M.black,[0,0,Math.PI/2]);
    for(const x of [-3.47,-2.53])cyl(handling,.34,.07,[x,22.83,z],M.yellow,[0,0,Math.PI/2]);
  }
  // Short auxiliary handling boom, not a full drilling mast.
  cyl(handling,.5,.5,[8,8.3,-1.9],M.teal);flange(handling,[8,8.63,-1.9],.7,.18,M.steel);
  cyl(handling,.28,2.8,[8,10.1,-1.9],M.teal);
  beam(handling,[8,11.5,-1.9],[6,17,-1.9],.42,.52,M.teal);
  beam(handling,[6,17,-1.9],[3.8,22.8,-1.9],.33,.4,M.yellow);
  tube(handling,[8,10.3,-1.9],[6.8,15.0,-1.9],.15,M.dark);tube(handling,[6.8,15,-1.9],[6.4,16.3,-1.9],.095,M.chrome);
  for(const [x,y] of [[8,11.5],[6,17],[3.8,22.8]])cyl(handling,.3,.72,[x,y,-1.9],M.steel,[Math.PI/2,0,0]);
  tube(handling,[3.8,22.8,-1.9],[3.8,20.7,-1.9],.024,M.black);loop(handling,.2,[3.8,20.5,-1.9],M.dark);

  const hpu=parts.get('hwu-hpu');
  skid(hpu,-11,-8,10.5,6.1);
  box(hpu,[3.4,2.15,4.75],[-14.05,9.66,-8],M.teal);
  box(hpu,[3.52,.16,4.87],[-14.05,10.8,-8],M.lightTeal);
  for(const z of [-9.4,-6.6]){cyl(hpu,.24,.14,[-14.05,10.93,z],M.dark);ring(hpu,.31,.05,[-14.05,10.99,z],M.yellow);}
  box(hpu,[.055,1.2,.22],[-12.31,9.72,-7.6],M.black);box(hpu,[.058,.67,.12],[-12.28,9.61,-7.6],M.brass);
  for(const z of [-9.5,-6.6]){
    box(hpu,[4.8,.25,1.8],[-9.25,8.75,z],M.dark);
    box(hpu,[1.7,1.2,1.2],[-9.8,9.55,z],M.teal);
    cyl(hpu,.55,2.2,[-8,9.5,z],M.dark,[0,0,Math.PI/2]);
    for(let x=-8.8;x<-7.05;x+=.17)ring(hpu,.57,.055,[x,9.5,z],M.steel,[0,0,Math.PI/2]);
    cyl(hpu,.33,.8,[-10.9,9.5,z],M.steel,[0,0,Math.PI/2]);
    for(const dx of [-.45,0,.45])box(hpu,[.19,.65,1.05],[-9.8+dx,10.12,z],M.steel,[0,0,-.08]);
    path(hpu,[[-10.95,9.72,z],[-11.5,9.72,z],[-11.5,10.5,z],[-12.3,10.5,z]],.115,M.black);
    tube(hpu,[-9.1,10.1,z],[-9.1,11.7,z],.11,M.dark);cyl(hpu,.17,.5,[-9.1,11.9,z],M.steel);
  }
  box(hpu,[.32,2.3,4.3],[-6.55,9.76,-8],M.dark);
  for(let z=-9.95;z<=-6.05;z+=.13)box(hpu,[.39,2.1,.035],[-6.54,9.76,z],M.steel);
  for(const z of [-9,-7]){cyl(hpu,.7,.16,[-6.3,9.75,z],M.black,[0,0,Math.PI/2]);loop(hpu,.77,[-6.2,9.75,z],M.steel,[0,Math.PI/2,0]);}
  for(const x of [-16.1,-5.9])for(const z of [-10.8,-5.2])tube(hpu,[x,8.6,z],[x,11.6,z],.055,M.teal);
  for(const z of [-10.8,-5.2])tube(hpu,[-16.1,11.6,z],[-5.9,11.6,z],.055,M.teal);
  for(const x of [-15,-13]){
    box(hpu,[1.7,.25,1.3],[x,8.6,-3.9],M.teal);
    cyl(hpu,.56,.66,[x,9.18,-3.9],M.black,[0,0,Math.PI/2]);
    for(const dx of [-.43,.43])cyl(hpu,.68,.08,[x+dx,9.18,-3.9],M.yellow,[0,0,Math.PI/2]);
    for(let dx=-.28;dx<.3;dx+=.105)loop(hpu,.56,[x+dx,9.18,-3.9],M.black,[0,Math.PI/2,0]);
  }
  const hi=interior(hpu,'HPU · simplified motor shaft and pump internals');
  for(const z of [-9.5,-6.6]){tube(hi,[-11.3,9.5,z],[-6.9,9.5,z],.1,M.chrome);for(let x=-10.9;x<-10.4;x+=.2)ring(hi,.28,.12,[x,9.5,z],M.brass,[0,0,Math.PI/2]);}

  const control=parts.get('hwu-controls');
  skid(control,10,-9,5.4,5.2);
  box(control,[5,2.9,4.7],[10,10.04,-9],M.pale);box(control,[5.3,.21,5.0],[10,11.62,-9],M.teal);
  box(control,[5.06,.5,4.76],[10,8.9,-9],M.teal);
  for(const x of [8.7,10,11.3]){box(control,[1.03,1.22,.03],[x,10.57,-6.632],M.dark);box(control,[.88,1.05,.04],[x,10.58,-6.6],M.glass);}
  for(const x of [7.49,12.51]){box(control,[.04,1.25,2.5],[x,10.56,-9],M.dark);box(control,[.05,1.06,2.3],[x,10.56,-9],M.glass);}
  box(control,[1.1,2.3,.07],[11.75,9.79,-11.39],M.teal);tube(control,[11.44,9.7,-11.48],[11.44,10.1,-11.48],.03,M.chrome);
  for(let i=0;i<7;i++)box(control,[.045,.035,1.3],[12.55,9.05+i*.1,-10.05],M.dark);
  box(control,[1.3,.65,.52],[10,12.02,-8.95],M.pale);tube(control,[8,11.7,-10.6],[8,13,-10.6],.024,M.steel);
  cyl(control,.13,.23,[11.8,11.87,-7.2],M.yellow);cyl(control,.15,.06,[11.8,11.75,-7.2],M.dark);
  // Basket console belongs to the controls identity, independently selectable.
  box(control,[1.9,.9,.6],[-3.22,22.84,2.85],M.teal);
  box(control,[1.96,.14,.77],[-3.22,23.36,2.81],M.dark,[-.23,0,0]);
  for(let i=0;i<5;i++)gauge(control,-3.9+i*.33,23.28,3.18,.1);
  for(let i=0;i<5;i++){tube(control,[-3.88+i*.34,23.4,2.72],[-3.88+i*.34,23.7,2.62],.024,M.chrome);ball(control,.06,[-3.88+i*.34,23.7,2.62],i===4?M.red:M.black);}
  for(const x of [-3.7,-2.75])path(control,[[x,22.6,2.65],[x,22.1,2.65],[x,21.7,2.3],[x,8.4,2.3],[6.8,8.4,-6.3]],.055,M.black);

  const manifold=parts.get('hwu-manifold');
  skid(manifold,-10,3.5,6,4.2);
  box(manifold,[5.2,.24,3.5],[-10,8.75,3.5],M.deck);
  // Generic surface-flow headers and manual valves, separate from hydraulic power.
  for(const z of [2.5,4.6]){
    pipeFlanges(manifold,[-12.5,9.55,z],[-7.5,9.55,z],.20,M.red);
    for(const x of [-11.8,-9.9,-8.1]){
      box(manifold,[.64,.78,.72],[x,9.55,z],M.red);
      cyl(manifold,.18,.28,[x,10.03,z],M.steel);
      tube(manifold,[x,10.1,z],[x,10.64,z],.06,M.chrome);
      wheel(manifold,[x,10.72,z],.34,[Math.PI/2,0,0]);
      for(const dx of [-.38,.38])ring(manifold,.28,.10,[x+dx,9.55,z],M.steel,[0,0,Math.PI/2]);
    }
    for(const x of [-12.3,-7.8]){tube(manifold,[x,8.84,z],[x,9.4,z],.10,M.teal);gauge(manifold,x,9.93,z+.17,.15);}
  }
  for(const x of [-12.5,-7.5])pipeFlanges(manifold,[x,9.55,2.5],[x,9.55,4.6],.18,M.red);
  path(manifold,[[-7.5,9.55,2.5],[-6.7,9.55,2.5],[-6.7,8.5,1],[-2.4,8.5,1],[-2.4,10.5,1]],.16,M.red);
  path(manifold,[[-10,9.55,4.6],[-10,8.5,6.5],[-5.5,8.5,6.5]],.16,M.red);
  for(const x of [-12.75,-7.25]){tube(manifold,[x,8.65,1.6],[x,11.1,1.6],.065,M.teal);tube(manifold,[x,8.65,5.35],[x,11.1,5.35],.065,M.teal);tube(manifold,[x,11.1,1.6],[x,11.1,5.35],.065,M.teal);}

  const tank=parts.get('hwu-tank');
  skid(tank,-12,11,7.3,5.3);
  box(tank,[6.8,2.35,4.6],[-12,9.82,11],M.teal);box(tank,[7,.16,4.8],[-12,11.08,11],M.steel);
  for(const z of [8.69,13.31])for(const x of [-14.4,-12,-9.6])box(tank,[.1,2.3,.08],[x,9.85,z],M.lightTeal);
  for(const x of [-15.41,-8.59])for(const z of [9.5,11,12.5])box(tank,[.08,2.3,.1],[x,9.85,z],M.lightTeal);
  for(const x of [-13.5,-10.5]){ring(tank,.6,.12,[x,11.2,11],M.dark);cyl(tank,.52,.11,[x,11.28,11],M.steel);tube(tank,[x-.18,11.35,11],[x+.18,11.35,11],.035,M.dark);}
  rail(tank,[-15.4,11.23,8.68],[-8.6,11.23,8.68]);rail(tank,[-15.4,11.23,13.32],[-8.6,11.23,13.32]);
  rail(tank,[-15.4,11.23,8.68],[-15.4,11.23,13.32]);rail(tank,[-8.6,11.23,8.68],[-8.6,11.23,13.32]);
  for(const x of [-10.55,-9.8])tube(tank,[x,8.1,13.8],[x,12.25,13.8],.042,M.steel);
  for(let y=8.25;y<11.5;y+=.3)tube(tank,[-10.55,y,13.8],[-9.8,y,13.8],.035,M.steel);
  pipeFlanges(tank,[-8.6,8.95,10.7],[-6.5,8.95,10.7],.16,M.teal);
  cyl(tank,.38,1.35,[-6.3,8.98,11.35],M.dark,[Math.PI/2,0,0]);
  for(let z=10.9;z<11.85;z+=.13)ring(tank,.4,.055,[-6.3,8.98,z],M.steel,[Math.PI/2,0,0]);
  box(tank,[1.4,.16,1.8],[-6.3,8.4,11.2],M.teal);
  path(tank,[[-6.3,8.98,10.5],[-5.5,8.98,10.5],[-5.5,8.4,7],[-5.5,8.4,2.4]],.125,M.black);
  tube(tank,[-14.5,11.2,12],[-14.5,12.7,12],.1,M.steel);tube(tank,[-14.5,12.7,12],[-14.05,12.7,12],.1,M.steel);

  const access=parts.get('hwu-access');
  function stairs(a,b,w=1.6){
    const av=V(a),bv=V(b),diff=bv.clone().sub(av),run=Math.hypot(diff.x,diff.z),n=Math.ceil(diff.y/.24),side=V([diff.z,0,-diff.x]).normalize(),yaw=Math.atan2(diff.x,diff.z);
    for(let i=0;i<n;i++){
      const pos=av.clone().lerp(bv,(i+.5)/n);box(access,[w,.1,run/n+.05],pos.toArray(),M.steel,[0,yaw,0]);
      const nose=pos.clone().add(V([Math.sin(yaw),0,Math.cos(yaw)]).multiplyScalar(run/n*.45));box(access,[w,.025,.055],[nose.x,nose.y+.07,nose.z],M.yellow,[0,yaw,0]);
    }
    for(const sign of [-1,1]){const off=side.clone().multiplyScalar(sign*w/2),lo=av.clone().add(off).toArray(),hi=bv.clone().add(off).toArray();beam(access,lo,hi,.12,.22,M.teal);rail(access,lo,hi,1.08);}
  }
  // Three distinct flights occupy the side bay and reach the basket from deck.
  stairs([6.1,8.04,8.2],[6.1,12.75,.5]);
  grate(access,7.1,12.75,-.6,3.9,2.2);
  stairs([8.1,12.87,.5],[8.1,17.56,8.2]);
  grate(access,7.1,17.56,9.25,3.9,2.1);
  stairs([6.1,17.68,8.2],[6.1,22.24,.7]);
  grate(access,5.2,22.13,-.1,3.8,2.2);
  for(const [x,z] of [[5.15,-1.55],[9.05,-1.55],[5.15,10.2],[9.05,10.2]]){
    box(access,[.17,9.7,.17],[x,12.82,z],M.teal);
    for(const y of [12.65,17.48])box(access,[.33,.16,.33],[x,y,z],M.steel);
  }
  for(const [y,z] of [[12.88,-1.7],[17.69,10.3]])rail(access,[5.16,y,z],[9.05,y,z]);
  for(const x of [5.12,9.08]){
    beam(access,[x,8.1,-1.55],[x,12.65,10.2],.075,.075,M.steel);
    rail(access,[x,17.69,8.25],[x,17.69,10.25]);
  }
  rail(access,[4.27,22.25,-1.23],[7.1,22.25,-1.23]);
  // Short deck-level step at the control shelter.
  for(let i=0;i<3;i++)box(access,[2,.12,.4],[10,8.03+i*.18,-5.65-i*.33],M.steel);

  // Batch repeated members while preserving a separate material set per component
  // at scene integration. Interior batches remain under their tagged groups.
  for(const [p,table] of batches)for(const {geo,mat,matrices} of table.values()){
    const inst=new THREE.InstancedMesh(geo,mat,matrices.length);
    inst.name=mat.name;matrices.forEach((matrix,i)=>inst.setMatrixAt(i,matrix));
    inst.instanceMatrix.needsUpdate=true;inst.castShadow=true;inst.receiveShadow=true;
    inst.computeBoundingBox();inst.computeBoundingSphere();p.add(inst);
  }
  group.updateMatrixWorld(true);
  for(const [id,p] of parts){
    const b=new THREE.Box3().setFromObject(p);
    p.userData.bounds={min:b.min.toArray(),max:b.max.toArray()};
    p.userData.focusTarget=b.getCenter(new THREE.Vector3()).toArray();
    p.traverse(node=>{node.userData.componentId=id;});
  }
  const bounds=new THREE.Box3().setFromObject(group);
  group.userData.bounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  group.userData.description='Original illustrative hydraulic workover spread on a generic supporting platform. Nominal metre units. No unit identity, rating, certification, ownership or operating claim.';
  return {group,parts,bounds};
}

export default buildHWU;
