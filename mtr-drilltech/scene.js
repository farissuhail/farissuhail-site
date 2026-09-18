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
  const componentLookup=new Map(components.map(c=>[c.id,c]));
  const renderables=[];const materialCache=new Map();const baseMaterials=new Map();
  for(const [id,part] of parts){part.userData.componentId=id;part.traverse(o=>{if(o.isMesh){o.userData.componentId=id;let parent=o,isInterior=false;while(parent&&parent!==part){if(parent.userData.interior)isInterior=true;parent=parent.parent;}const sources=Array.isArray(o.material)?o.material:[o.material];const ms=sources.map(m=>{const key=id+':'+isInterior+':'+m.uuid;if(!materialCache.has(key)){const copy=m.clone();materialCache.set(key,copy);baseMaterials.set(copy,{opacity:copy.opacity,transparent:copy.transparent,depthWrite:copy.depthWrite,color:copy.color?.clone(),emissive:copy.emissive?.clone(),emissiveIntensity:copy.emissiveIntensity});}return materialCache.get(key);});o.material=Array.isArray(o.material)?ms:ms[0];o.castShadow=true;o.receiveShadow=true;renderables.push(o);}});}
  const interiors=[];model.group.traverse(o=>{if(o.userData.interior){interiors.push(o);o.visible=false;}});
  const selectionBox=new THREE.Box3Helper(new THREE.Box3(),'#72f3d0');selectionBox.visible=false;selectionBox.material.transparent=true;selectionBox.material.opacity=.7;selectionBox.material.depthTest=false;selectionBox.renderOrder=10;scene.add(selectionBox);
  const connectionsGroup=new THREE.Group();scene.add(connectionsGroup);
  let selected=null,isolate=false,fade=false,internals=false,subsurface=false,connections=false;
  const hidden=new Set(),hiddenSystems=new Set();let targetCamera=null,targetLook=null;const clock=new THREE.Clock();let lastRender=0;let fps=0,frames=0,fpsAt=0;
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let pointerDown=null,pointerLatest=null,hovered=null;
  function ancestorVisible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
  function hitTest(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(renderables,false).find(hit=>ancestorVisible(hit.object))?.object.userData.componentId??null;}
  renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};targetCamera=null;targetLook=null;});
  renderer.domElement.addEventListener('pointerup',e=>{if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)<5&&e.button===0){const id=hitTest(e);if(id)onSelect(id,false);}pointerDown=null;});
  renderer.domElement.addEventListener('pointermove',e=>{pointerLatest=e;if(pointerDown){onHover(null);return;}const id=hitTest(e);if(id!==hovered){hovered=id;renderer.domElement.style.cursor=id?'pointer':'grab';}const rect=container.getBoundingClientRect();onHover(id?{id,name:componentLookup.get(id)?.name??id,x:e.clientX-rect.left,y:e.clientY-rect.top}:null);});
  renderer.domElement.addEventListener('pointerleave',()=>onHover(null));
  renderer.domElement.addEventListener('dblclick',e=>{const id=hitTest(e);if(id){onSelect(id,true);focus(id);}});
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
  function select(id,frame=false){if(!parts.has(id))return false;selected=id;internals=false;hidden.delete(id);hiddenSystems.delete(componentLookup.get(id)?.system);apply();if(frame)focus(id);return true;}
  function hasInternals(id=selected){return interiors.some(o=>{let p=o;while(p){if(p.userData.componentId===id)return true;p=p.parent;}return false;});}
  function action(action){if(['focus','isolate','fade','hide','internals','connections'].includes(action)&&!selected)return{message:'Select a component in the rig or navigator first.'};if(action==='focus'){focus();return{};}if(action==='isolate')isolate=!isolate;if(action==='fade')fade=!fade;if(action==='hide'){hidden.add(selected);isolate=false;}if(action==='unhide'){hidden.clear();hiddenSystems.clear();}if(action==='internals'){if(!hasInternals())return{message:'No authored internal assembly is available for this component.'};internals=!internals;}if(action==='connections')connections=!connections;if(action==='subsurface')subsurface=!subsurface;if(action==='reset'){selected=null;isolate=fade=internals=subsurface=connections=false;hidden.clear();hiddenSystems.clear();setView('iso');}if(action==='escape'){if(isolate||fade||internals||connections){isolate=fade=internals=connections=false;}else selected=null;}apply();return{selected,isolate,fade,internals,subsurface,connections};}
  function setView(view){const views=hwu?{iso:{position:[64,48,65],target:[0,15,0]},top:{position:[0,100,1],target:[0,8,0]},deck:{position:[32,26,33],target:[0,17,0]}}:land?{iso:{position:[108,85,114],target:[-5,22,0]},top:{position:[-5,175,1],target:[-5,9,0]},deck:{position:[54,30,46],target:[0,10,0]}}:{iso:{position:[151,113,170],target:[0,29,0]},top:{position:[0,211,1],target:[0,19,0]},deck:{position:[87,52,85],target:[0,23,-4]}};const v=views[view]||views.iso;animateCamera(new THREE.Vector3(...v.position),new THREE.Vector3(...v.target));}
  function toggleSystem(system){hiddenSystems.has(system)?hiddenSystems.delete(system):hiddenSystems.add(system);apply();return!hiddenSystems.has(system);}
  let disposed=false,animationHandle;
  function dispose(){disposed=true;cancelAnimationFrame(animationHandle);resizeObserver.disconnect();controls.dispose();renderer.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.dispose();});renderer.domElement.remove();}
  function frame(time){if(disposed)return;animationHandle=requestAnimationFrame(frame);if(document.hidden||container.clientWidth<1||time-lastRender<1000/35)return;lastRender=time;const t=clock.getElapsedTime();waterMaterial.uniforms.uTime.value=t;waterMaterial.uniforms.uEye.value.copy(camera.position);if(targetCamera){camera.position.lerp(targetCamera,.085);controls.target.lerp(targetLook,.085);if(camera.position.distanceTo(targetCamera)<.03){camera.position.copy(targetCamera);controls.target.copy(targetLook);targetCamera=targetLook=null;}}controls.update();renderer.render(scene,camera);frames++;if(time-fpsAt>1500){fps=Math.round(frames*1000/(time-fpsAt));fpsAt=time;frames=0;}}
  if(hwu){camera.position.set(64,48,65);controls.target.set(0,15,0);}else if(land){camera.position.set(108,85,114);controls.target.set(-5,22,0);}
  animationHandle=requestAnimationFrame(frame);
  return{select,action,focus,setView,toggleSystem,hasInternals,resize,dispose,get selected(){return selected;},get state(){return{selected,isolate,fade,internals,subsurface,connections,hiddenSystems:[...hiddenSystems],hiddenComponents:[...hidden]};},integrity(){const modelIds=[...parts.keys()];const unmatched=components.filter(c=>!parts.has(c.id)).map(c=>c.id);return{components:components.length,modelled:modelIds.length,meshes:renderables.length,triangles:renderer.info.render.triangles,unmatched,fps,internals:interiors.length};}};
}
