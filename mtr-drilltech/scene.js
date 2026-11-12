import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {buildJackup} from './assets/jackup-model.js';
import {buildLandRig} from './assets/land-model.js';
import {buildHWU} from './assets/hwu-model.js';

export function createScene(container,components,onSelect,onHover,mode='jackup'){
  const land=mode==='land',hwu=mode==='hwu';
  const scene=new THREE.Scene();scene.background=new THREE.Color('#dbe8ed');scene.fog=new THREE.FogExp2('#dbe8ed',0.0015);
  const camera=new THREE.PerspectiveCamera(37,1,.2,2200);camera.position.set(151,113,170);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,29,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=7;controls.maxDistance=350;controls.maxPolarAngle=Math.PI*.495;controls.zoomToCursor=true;controls.screenSpacePanning=true;
  const ambient=new THREE.HemisphereLight('#dceef8','#62878c',2.3);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff1d5',3.4);sun.position.set(-100,160,100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-110,right:110,top:110,bottom:-110,near:1,far:420});sun.shadow.bias=-.0008;sun.shadow.normalBias=.08;scene.add(sun);
  const fill=new THREE.DirectionalLight('#c9e7ff',1.3);fill.position.set(90,65,-120);scene.add(fill);

  const waterGeometry=new THREE.PlaneGeometry(1800,1800,100,100);waterGeometry.rotateX(-Math.PI/2);
  const waterMaterial=new THREE.ShaderMaterial({transparent:true,uniforms:{uTime:{value:0},uOpacity:{value:1},uEye:{value:camera.position},uFog:{value:new THREE.Color('#dbe8ed')}},vertexShader:`
  uniform float uTime;varying vec3 vWorld;varying vec3 vNormal;
  void main(){vec3 p=position;float a=.17; p.y+=sin(p.x*.12+uTime*.5)*a+sin(p.z*.17+uTime*.36)*a*.6;vNormal=normalize(vec3(-cos(p.x*.12+uTime*.5)*a*.12,1.,-cos(p.z*.17+uTime*.36)*a*.102));vWorld=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
  fragmentShader:`uniform float uTime;uniform float uOpacity;uniform vec3 uEye;uniform vec3 uFog;varying vec3 vWorld;varying vec3 vNormal;
  void main(){vec3 viewDir=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(viewDir,vNormal),0.),3.);float wave=sin(vWorld.x*1.8+sin(vWorld.z*.6+uTime))*sin(vWorld.z*1.1-uTime*.45);vec3 c=mix(vec3(.045,.29,.36),vec3(.48,.69,.75),fresnel*.85+.12);c+=wave*.017;vec3 reflectDir=reflect(-normalize(vec3(-.5,1.,.6)),vNormal+vec3(wave*.028,0.,wave*.025));float spec=pow(max(dot(viewDir,reflectDir),0.),95.);c+=spec*.8;float dist=length(uEye-vWorld);c=mix(c,uFog,1.-exp(-dist*.0017));gl_FragColor=vec4(c,uOpacity);}`});
  const water=new THREE.Mesh(waterGeometry,waterMaterial);water.position.y=0;water.renderOrder=2;scene.add(water);
  const seabed=new THREE.Mesh(new THREE.PlaneGeometry(450,450,1,1),new THREE.MeshStandardMaterial({color:'#b3ab84',roughness:1}));seabed.rotation.x=-Math.PI/2;seabed.position.y=-24;seabed.receiveShadow=true;scene.add(seabed);
  const grid=new THREE.GridHelper(200,20,'#849d8c','#849d8c');grid.position.y=-23.9;grid.material.transparent=true;grid.material.opacity=.18;grid.visible=false;scene.add(grid);

  if(hwu){seabed.position.y=-4;grid.position.y=-3.9;}
  let terrain=null;
  if(land){
    water.visible=false;seabed.position.y=-32;grid.position.y=-31.9;scene.background.set('#e5e9e7');scene.fog.color.set('#e5e9e7');
    const g=new THREE.PlaneGeometry(1800,1800,130,130);g.rotateX(-Math.PI/2);const p=g.attributes.position;const colors=[];
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),d=Math.hypot(x,z);let h=0;if(d>150)h=Math.pow(Math.max(0,Math.sin(x*.013)+Math.cos(z*.012)+.2),2)*Math.min(48,(d-150)*.15);p.setY(i,h-.1);const c=new THREE.Color('#bfb49b');c.multiplyScalar(.9+Math.sin(x*1.38+z*3.31)*.045+Math.min(h/500,.08));colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.receiveShadow=true;scene.add(terrain);
  }
  const model=hwu?buildHWU():land?buildLandRig():buildJackup();scene.add(model.group);model.group.updateMatrixWorld(true);
  const parts=model.parts instanceof Map?model.parts:new Map(Object.entries(model.parts));
  const walkDeck=hwu?{spawn:[-12,8.18,10],y:8.18,x:18,z:14.2}:land?{spawn:[4.6,9.45,3],y:9.45,x:6.6,z:11.4}:{spawn:[0,16.3,0],y:16.3,x:31,z:27};
  // A deliberately simple PPE-clad operator keeps the walkthrough educational
  // and avoids suggesting any real operating procedure or work authorisation.
  const operator=new THREE.Group();operator.name='Walk mode operator · illustrative';
  const avatarMaterial={skin:new THREE.MeshStandardMaterial({color:'#ad7659',roughness:.8}),helmet:new THREE.MeshStandardMaterial({color:'#f5f4e9',roughness:.55,metalness:.15}),visor:new THREE.MeshStandardMaterial({color:'#20353a',roughness:.25,metalness:.5}),vest:new THREE.MeshStandardMaterial({color:'#e7c93f',roughness:.7}),coveralls:new THREE.MeshStandardMaterial({color:'#193f49',roughness:.72}),boots:new THREE.MeshStandardMaterial({color:'#17252a',roughness:.9})};
  const avatarBox=(size,pos,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;operator.add(mesh);};
  const avatarCylinder=(radius,height,pos,material)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,10),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;operator.add(mesh);};
  avatarCylinder(.22,.95,[-.16,.5,0],avatarMaterial.coveralls);avatarCylinder(.22,.95,[.16,.5,0],avatarMaterial.coveralls);avatarBox([.28,.13,.48],[-.16,.06,0],avatarMaterial.boots);avatarBox([.28,.13,.48],[.16,.06,0],avatarMaterial.boots);
  avatarBox([.58,.78,.3],[0,1.42,0],avatarMaterial.vest);avatarBox([.54,.76,.28],[0,1.36,.025],avatarMaterial.coveralls);avatarCylinder(.18,.78,[-.43,1.35,0],avatarMaterial.coveralls);avatarCylinder(.18,.78,[.43,1.35,0],avatarMaterial.coveralls);
  avatarCylinder(.25,.38,[0,2.1,0],avatarMaterial.skin);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.3,14,10,0,Math.PI*2,0,Math.PI*.58),avatarMaterial.helmet);helmet.position.set(0,2.32,0);helmet.castShadow=true;operator.add(helmet);avatarBox([.28,.12,.04],[0,2.12,.245],avatarMaterial.visor);
  operator.scale.setScalar(.78);operator.visible=false;scene.add(operator);
  // Keep clean local transforms so the construction sequence can replay
  // without rebuilding the authored rig geometry.
  const constructionParts=[...parts.entries()].map(([id,part],index)=>({id,part,index,position:part.position.clone(),quaternion:part.quaternion.clone(),scale:part.scale.clone()}));
  const componentLookup=new Map(components.map(c=>[c.id,c]));
  const renderables=[];const materialCache=new Map();const baseMaterials=new Map();
  for(const [id,part] of parts){part.userData.componentId=id;part.traverse(o=>{if(o.isMesh){o.userData.componentId=id;let parent=o,isInterior=false;while(parent&&parent!==part){if(parent.userData.interior)isInterior=true;parent=parent.parent;}const sources=Array.isArray(o.material)?o.material:[o.material];const ms=sources.map(m=>{const key=id+':'+isInterior+':'+m.uuid;if(!materialCache.has(key)){const copy=m.clone();materialCache.set(key,copy);baseMaterials.set(copy,{opacity:copy.opacity,transparent:copy.transparent,depthWrite:copy.depthWrite,color:copy.color?.clone(),emissive:copy.emissive?.clone(),emissiveIntensity:copy.emissiveIntensity});}return materialCache.get(key);});o.material=Array.isArray(o.material)?ms:ms[0];o.castShadow=true;o.receiveShadow=true;renderables.push(o);}});}
  const interiors=[];model.group.traverse(o=>{if(o.userData.interior){interiors.push(o);o.visible=false;}});
  const selectionBox=new THREE.Box3Helper(new THREE.Box3(),'#72f3d0');selectionBox.visible=false;selectionBox.material.transparent=true;selectionBox.material.opacity=.7;selectionBox.material.depthTest=false;selectionBox.renderOrder=10;scene.add(selectionBox);
  const connectionsGroup=new THREE.Group();scene.add(connectionsGroup);
  let selected=null,isolate=false,fade=false,internals=false,subsurface=false,connections=false;
  let construction=null;
  let walk=null,lastWalkUpdate=0;
  const walkKeys=new Set();
  const hidden=new Set(),hiddenSystems=new Set();let targetCamera=null,targetLook=null;const clock=new THREE.Clock();let lastRender=0;let fps=0,frames=0,fpsAt=0;
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let pointerDown=null,pointerLatest=null,hovered=null;
  function ancestorVisible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
  function hitTest(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(renderables,false).find(hit=>ancestorVisible(hit.object))?.object.userData.componentId??null;}
  renderer.domElement.addEventListener('pointerdown',e=>{if(walk){renderer.domElement.requestPointerLock?.();return;}pointerDown={x:e.clientX,y:e.clientY};targetCamera=null;targetLook=null;});
  renderer.domElement.addEventListener('pointerup',e=>{if(walk)return;if(!frameHook&&pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)<5&&e.button===0){const id=hitTest(e);if(id)onSelect(id,false);}pointerDown=null;});
  renderer.domElement.addEventListener('pointermove',e=>{if(walk)return;pointerLatest=e;if(frameHook||pointerDown){onHover(null);return;}const id=hitTest(e);if(id!==hovered){hovered=id;renderer.domElement.style.cursor=id?'pointer':'grab';}const rect=container.getBoundingClientRect();onHover(id?{id,name:componentLookup.get(id)?.name??id,x:e.clientX-rect.left,y:e.clientY-rect.top}:null);});
  renderer.domElement.addEventListener('pointerleave',()=>onHover(null));
  renderer.domElement.addEventListener('dblclick',e=>{if(walk||frameHook)return;const id=hitTest(e);if(id){onSelect(id,true);focus(id);}});
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(w>0&&h>0){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}};const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(container);resize();
  function bounds(id){return new THREE.Box3().setFromObject(parts.get(id));}
  function center(id){return bounds(id).getCenter(new THREE.Vector3());}
  function animateCamera(position,target){targetCamera=position.clone();targetLook=target.clone();if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.copy(position);controls.target.copy(target);targetCamera=targetLook=null;}}
  function focus(id=selected){if(!parts.has(id))return;const box=bounds(id);const size=box.getSize(new THREE.Vector3());const c=box.getCenter(new THREE.Vector3());const radius=Math.max(size.x,size.y,size.z,4);const d=radius/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.25;const direction=new THREE.Vector3().subVectors(camera.position,controls.target).normalize();direction.y=Math.max(direction.y,.25);direction.normalize();animateCamera(c.clone().addScaledVector(direction,Math.min(d,230)),c);}
  function clearConnections(){while(connectionsGroup.children.length){const o=connectionsGroup.children[0];connectionsGroup.remove(o);o.geometry?.dispose();o.material?.dispose();}}
  function updateConnections(){clearConnections();if(!connections||!selected)return;const c=componentLookup.get(selected);if(!c)return;for(const id of c.connections){if(!parts.has(id))continue;const a=center(selected),b=center(id);const midpoint=a.clone().lerp(b,.5);midpoint.y+=Math.max(5,a.distanceTo(b)*.2);const curve=new THREE.QuadraticBezierCurve3(a,midpoint,b);const geometry=new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#f4a03a',transparent:true,opacity:.95,depthTest:false}));line.renderOrder=9;connectionsGroup.add(line);const dot=new THREE.Mesh(new THREE.SphereGeometry(.55,8,8),new THREE.MeshBasicMaterial({color:'#f4a03a',depthTest:false}));dot.position.copy(b);dot.renderOrder=9;connectionsGroup.add(dot);}}
  function apply(){
    for(const [id,part] of parts){const system=componentLookup.get(id)?.system;part.visible=!hidden.has(id)&&!hiddenSystems.has(system)&&(!isolate||!selected||id===selected);part.traverse(o=>{if(!o.isMesh)return;for(const mat of(Array.isArray(o.material)?o.material:[o.material])){const base=baseMaterials.get(mat);if(!base)continue;const dim=fade&&selected&&id!==selected;mat.opacity=dim?.13:base.opacity;mat.transparent=dim||base.transparent;mat.depthWrite=dim?false:base.depthWrite;if(mat.color&&base.color)mat.color.copy(base.color);if(mat.emissive){mat.emissive.copy(base.emissive||new THREE.Color(0));mat.emissiveIntensity=base.emissiveIntensity??1;if(id===selected){mat.emissive.set('#00d49f');mat.emissiveIntensity=.2;}}mat.needsUpdate=true;}});}
    for(const interior of interiors){let p=interior;while(p&&!p.userData.componentId)p=p.parent;interior.visible=internals&&p?.userData.componentId===selected;}
    if(internals&&selected){const part=parts.get(selected);part?.traverse(o=>{if(!o.isMesh)return;let p=o,isInterior=false;while(p&&p!==part){if(p.userData.interior)isInterior=true;p=p.parent;}if(!isInterior)for(const mat of(Array.isArray(o.material)?o.material:[o.material])){mat.transparent=true;mat.opacity=.2;mat.depthWrite=false;}});}
    waterMaterial.uniforms.uOpacity.value=subsurface?.15:1;water.material.depthWrite=!subsurface;grid.visible=subsurface;controls.maxPolarAngle=subsurface?Math.PI*.76:Math.PI*.495;
    if(terrain){terrain.material.transparent=subsurface;terrain.material.opacity=subsurface?.17:1;terrain.material.depthWrite=!subsurface;}
    selectionBox.visible=!!selected&&parts.get(selected)?.visible; if(selectionBox.visible)selectionBox.box.copy(bounds(selected));updateConnections();
  }
  function restoreConstruction(){
    construction=null;
    for(const item of constructionParts){item.part.position.copy(item.position);item.part.quaternion.copy(item.quaternion);item.part.scale.copy(item.scale);}
  }
  function startConstruction(){
    restoreConstruction();
    // With an assembly selected, build that assembly. Otherwise build the rig.
    const targets=selected?constructionParts.filter(item=>item.id===selected):constructionParts;
    isolate=fade=internals=connections=false;hidden.clear();hiddenSystems.clear();apply();
    construction={startedAt:clock.getElapsedTime(),targets:targets.map((item,order)=>{
      const angle=item.index*2.3999632297;
      const offset=new THREE.Vector3(Math.cos(angle)*(10+(item.index%4)*2.4),7+(item.index%5)*2.25,Math.sin(angle)*(10+(item.index%3)*2.6));
      const fromPosition=item.position.clone().add(offset);
      const turn=new THREE.Quaternion().setFromEuler(new THREE.Euler(.18+(item.index%3)*.08,angle*.28,.1));
      return{...item,order,fromPosition,fromQuaternion:item.quaternion.clone().multiply(turn),fromScale:item.scale.clone().multiplyScalar(.035)};
    })};
    return targets.length;
  }
  function updateConstruction(time){
    if(!construction)return;
    let complete=true;
    for(const item of construction.targets){
      const progress=THREE.MathUtils.clamp((time-construction.startedAt-item.order*.12)/.68,0,1);
      const eased=1-Math.pow(1-progress,4);
      item.part.position.lerpVectors(item.fromPosition,item.position,eased);
      item.part.quaternion.slerpQuaternions(item.fromQuaternion,item.quaternion,eased);
      item.part.scale.lerpVectors(item.fromScale,item.scale,eased);
      if(progress<1)complete=false;
    }
    if(selectionBox.visible&&selected)selectionBox.box.copy(bounds(selected));
    if(connections&&selected)updateConnections();
    if(complete)construction=null;
  }
  function nearestAssembly(){
    let nearest=null,distance=Infinity;
    for(const [id] of parts){const d=center(id).distanceTo(operator.position);if(d<distance){distance=d;nearest=id;}}
    return distance<8?nearest:null;
  }
  function startWalk(){
    restoreConstruction();
    walk={yaw:0,pitch:-.08};lastWalkUpdate=0;walkKeys.clear();
    operator.position.set(...walkDeck.spawn);operator.position.y=walkDeck.y;operator.rotation.set(0,walk.yaw,0);operator.visible=true;
    targetCamera=targetLook=null;controls.enabled=false;renderer.domElement.style.cursor='crosshair';onHover(null);
  }
  function stopWalk(){
    if(!walk)return;
    walk=null;walkKeys.clear();operator.visible=false;controls.enabled=true;renderer.domElement.style.cursor='grab';
    if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  }
  function updateWalk(time){
    if(!walk)return;
    const delta=lastWalkUpdate?Math.min(.05,Math.max(0,time-lastWalkUpdate)):0;lastWalkUpdate=time;
    const forward=new THREE.Vector3(Math.sin(walk.yaw),0,Math.cos(walk.yaw)),right=new THREE.Vector3(forward.z,0,-forward.x),input=new THREE.Vector3();
    if(walkKeys.has('KeyW'))input.add(forward);if(walkKeys.has('KeyS'))input.sub(forward);if(walkKeys.has('KeyD'))input.add(right);if(walkKeys.has('KeyA'))input.sub(right);
    if(input.lengthSq()){input.normalize().multiplyScalar((walkKeys.has('ShiftLeft')||walkKeys.has('ShiftRight')?8.2:4.2)*delta);operator.position.add(input);operator.position.x=THREE.MathUtils.clamp(operator.position.x,-walkDeck.x,walkDeck.x);operator.position.z=THREE.MathUtils.clamp(operator.position.z,-walkDeck.z,walkDeck.z);}
    operator.position.y=walkDeck.y;operator.rotation.y=walk.yaw;
    const cameraPosition=operator.position.clone().addScaledVector(forward,-13.5);cameraPosition.y+=7.4+walk.pitch*2.4;
    const lookAt=operator.position.clone().addScaledVector(forward,2.8);lookAt.y+=1.15+walk.pitch*2.2;
    camera.position.lerp(cameraPosition,.14);camera.lookAt(lookAt);controls.target.copy(lookAt);
  }
  const onWalkKeyDown=e=>{if(!walk)return;if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyE'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat){const id=nearestAssembly();if(id)onSelect(id,false);}else walkKeys.add(e.code);};
  const onWalkKeyUp=e=>{if(walk)walkKeys.delete(e.code);};
  const onWalkMouse=e=>{if(walk&&document.pointerLockElement===renderer.domElement){walk.yaw-=e.movementX*.003;walk.pitch=THREE.MathUtils.clamp(walk.pitch-e.movementY*.002,-.35,.35);}};
  document.addEventListener('keydown',onWalkKeyDown);document.addEventListener('keyup',onWalkKeyUp);document.addEventListener('mousemove',onWalkMouse);
  function select(id,frame=false){if(!parts.has(id))return false;selected=id;internals=false;hidden.delete(id);hiddenSystems.delete(componentLookup.get(id)?.system);apply();if(frame)focus(id);return true;}
  function hasInternals(id=selected){return interiors.some(o=>{let p=o;while(p){if(p.userData.componentId===id)return true;p=p.parent;}return false;});}
  function action(action){if(action==='walk'){window.mtrWalk?.toggle();return{selected,walk:!!frameHook};}if(action==='escape'&&walk){stopWalk();setView('iso');apply();return{selected,walk:false};}if(['focus','isolate','fade','hide','internals','connections'].includes(action)&&!selected)return{message:'Select a component in the rig or navigator first.'};if(action==='construction'){const count=startConstruction();return{selected,construction:true,constructionCount:count};}if(action==='focus'){focus();return{};}if(action==='isolate')isolate=!isolate;if(action==='fade')fade=!fade;if(action==='hide'){hidden.add(selected);isolate=false;}if(action==='unhide'){hidden.clear();hiddenSystems.clear();}if(action==='internals'){if(!hasInternals())return{message:'No authored internal assembly is available for this component.'};internals=!internals;}if(action==='connections')connections=!connections;if(action==='subsurface')subsurface=!subsurface;if(action==='reset'){stopWalk();restoreConstruction();selected=null;isolate=fade=internals=subsurface=connections=false;hidden.clear();hiddenSystems.clear();setView('iso');}if(action==='escape'){if(isolate||fade||internals||connections){isolate=fade=internals=connections=false;}else selected=null;}apply();return{selected,isolate,fade,internals,subsurface,connections,construction:!!construction,walk:!!walk};}
  function setView(view){const views=hwu?{iso:{position:[64,48,65],target:[0,15,0]},top:{position:[0,100,1],target:[0,8,0]},deck:{position:[32,26,33],target:[0,17,0]}}:land?{iso:{position:[108,85,114],target:[-5,22,0]},top:{position:[-5,175,1],target:[-5,9,0]},deck:{position:[54,30,46],target:[0,10,0]}}:{iso:{position:[151,113,170],target:[0,29,0]},top:{position:[0,211,1],target:[0,19,0]},deck:{position:[87,52,85],target:[0,23,-4]}};const v=views[view]||views.iso;animateCamera(new THREE.Vector3(...v.position),new THREE.Vector3(...v.target));}
  function toggleSystem(system){hiddenSystems.has(system)?hiddenSystems.delete(system):hiddenSystems.add(system);apply();return!hiddenSystems.has(system);}
  let disposed=false,animationHandle,frameHook=null;
  function dispose(){dispatchEvent(new CustomEvent('mtr-scene-dispose'));if(window.__mtrScene===api)window.__mtrScene=null;disposed=true;stopWalk();cancelAnimationFrame(animationHandle);resizeObserver.disconnect();document.removeEventListener('keydown',onWalkKeyDown);document.removeEventListener('keyup',onWalkKeyUp);document.removeEventListener('mousemove',onWalkMouse);controls.dispose();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.dispose();});renderer.domElement.remove();}
  function frame(time){if(disposed)return;animationHandle=requestAnimationFrame(frame);if(document.hidden||container.clientWidth<1||time-lastRender<(frameHook?1000/62:1000/35))return;lastRender=time;const t=clock.getElapsedTime();waterMaterial.uniforms.uTime.value=t;waterMaterial.uniforms.uEye.value.copy(camera.position);updateConstruction(t);if(frameHook)frameHook(t);else if(walk)updateWalk(t);else{if(targetCamera&&!frameHook){camera.position.lerp(targetCamera,.085);controls.target.lerp(targetLook,.085);if(camera.position.distanceTo(targetCamera)<.03){camera.position.copy(targetCamera);controls.target.copy(targetLook);targetCamera=targetLook=null;}}controls.update();}renderer.render(scene,camera);frames++;if(time-fpsAt>1500){fps=Math.round(frames*1000/(time-fpsAt));fpsAt=time;frames=0;}}
  if(hwu){camera.position.set(64,48,65);controls.target.set(0,15,0);}else if(land){camera.position.set(108,85,114);controls.target.set(-5,22,0);}
  animationHandle=requestAnimationFrame(frame);
  const api={select,action,focus,setView,toggleSystem,hasInternals,resize,dispose,get selected(){return selected;},get state(){return{selected,isolate,fade,internals,subsurface,connections,construction:!!construction,walk:!!frameHook,hiddenSystems:[...hiddenSystems],hiddenComponents:[...hidden]};},integrity(){const modelIds=[...parts.keys()];const unmatched=components.filter(c=>!parts.has(c.id)).map(c=>c.id);return{components:components.length,modelled:modelIds.length,meshes:renderables.length,triangles:renderer.info.render.triangles,unmatched,fps,internals:interiors.length};}};api.walkKit={THREE,scene,camera,controls,renderer,container,renderables,parts,components,mode,onSelect,setFrameHook(fn){frameHook=fn;}};window.__mtrScene=api;dispatchEvent(new CustomEvent('mtr-scene',{detail:api}));return api;
}
