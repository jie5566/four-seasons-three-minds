import * as THREE from '../vendor/three.js';
const $=s=>document.querySelector(s);
const seasons=[{char:'春',name:'Spring',sub:'Everything blooms in its own time.',poem:'At four in the morning,<br>the begonia is still awake.',verse:'At four in the morning,<br>the begonia is still awake.',bot:'PRUNUS · CHERRY BLOSSOM',bg:0xe4e5d8,colors:[0xf2c6b8,0xffe7d9,0xe9ab9e,0xf7d6ce],sun:0xffedcf},{char:'夏',name:'Summer',sub:'Long days beneath a green canopy.',poem:'The shade deepens in the quiet noon.<br>A single blossom remembers spring.',verse:'The shade deepens in the quiet noon.<br>A single blossom remembers spring.',bot:'FOLIUM · SUMMER FOLIAGE',bg:0xdce2cd,colors:[0x607d37,0x899b42,0x3d652e,0xb0b565],sun:0xfff1ce},{char:'秋',name:'Autumn',sub:'A change carried on the breeze.',poem:'One leaf falls.<br>The whole world turns to autumn.',verse:'One leaf falls.<br>The whole world turns to autumn.',bot:'ACER · AUTUMN LEAF',bg:0xe7dbc7,colors:[0xad502d,0xc77535,0xe2a447,0x843e24],sun:0xffd293},{char:'冬',name:'Winter',sub:'Stillness before the world begins again.',poem:'Evening comes, and snow is near.<br>Will you stay for a cup of warmth?',verse:'Evening comes, and snow is near.<br>Will you stay for a cup of warmth?',bot:'RAMUS · WINTER BRANCH',bg:0xdce2e1,colors:[0xf1f2ed,0xdbe4e6,0xf7faf6],sun:0xe8f0ff}];
let selected=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,wind=true,time=0,last=performance.now(),pointer={x:0,y:0,active:false,energy:0,vx:0,vy:0,last:0};
const scene=new THREE.Scene();scene.background=new THREE.Color(seasons[0].bg);scene.fog=new THREE.Fog(seasons[0].bg,20,42);
const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,70);camera.position.set(0,0,15);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('#loading').textContent='WebGL is unavailable. Please use a browser that supports WebGL.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;$('#scene').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xf2f3e9,0x655d48,1.5));const sun=new THREE.DirectionalLight(0xffedcf,3.6);sun.position.set(-3,7,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:40});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);sun.target.position.set(2,0,0);scene.add(sun.target);
const bounce=new THREE.DirectionalLight(0xf7e6d0,.6);bounce.position.set(5,-2,4);scene.add(bounce);
const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:seasons[0].bg,roughness:1}));backdrop.position.z=-2;backdrop.receiveShadow=true;scene.add(backdrop);
// A fine, vertically fissured bark surface, generated locally rather than fetched.
const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#827568';ctx.fillRect(0,0,256,512);let seed=83;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
for(let i=0;i<1800;i++){let x=rand()*256,y=rand()*512;ctx.strokeStyle=rand()>.5?'rgba(30,22,15,.32)':'rgba(210,193,162,.24)';ctx.lineWidth=.3+rand()*2;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+rand()*5,y+12,x-3,y+27,x+rand()*7,y+45);ctx.stroke();}
const bark=new THREE.CanvasTexture(c);bark.wrapS=bark.wrapT=THREE.RepeatWrapping;bark.repeat.set(2,3);bark.colorSpace=THREE.SRGBColorSpace;const wood=new THREE.MeshStandardMaterial({color:0x766451,map:bark,bumpMap:bark,bumpScale:.055,roughness:.96});
const tree=new THREE.Group();scene.add(tree);const tips=[],joints=[];
// Each season has a different branching habit; each visit gets a fresh specimen.
const habits=[
 {depth:5,split:.68,third:.10,spread:.64,curve:.32,shrink:.74,lean:-.53,length:2.7,radius:.12,leaves:2200,shedRate:.08,shedDelay:35,shedWindow:100,hold:1.15,holdRange:2,gustSpeed:1.4},
 {depth:6,split:.86,third:.23,spread:.83,curve:.23,shrink:.71,lean:-.32,length:2.8,radius:.16,leaves:2700,shedRate:.02,shedDelay:65,shedWindow:150,hold:1.65,holdRange:2.2,gustSpeed:2},
 {depth:5,split:.56,third:.09,spread:1.08,curve:.42,shrink:.75,lean:-.64,length:2.65,radius:.14,leaves:1150,shedRate:1,shedDelay:2,shedWindow:32,hold:.05,holdRange:.5,gustSpeed:0},
 {depth:6,split:.58,third:.03,spread:1.23,curve:.65,shrink:.72,lean:-.25,length:2.6,radius:.17,leaves:45,shedRate:1,shedDelay:2,shedWindow:32,hold:.05,holdRange:.5,gustSpeed:0}
];let habit=habits[0],generation=0;
function regenerateBranches(i){
 for(const child of [...tree.children]){child.traverse(node=>{if(node.isMesh)node.geometry.dispose();});tree.remove(child);}
 tips.length=0;joints.length=0;habit=habits[i];
 const entropy=new Uint32Array(1);crypto.getRandomValues(entropy);seed=1+((entropy[0]+(++generation)*7919)%2147483646);
 branch(new THREE.Vector3(5.2+(rand()-.5)*1.1,-5.6,0),new THREE.Vector3(habit.lean+(rand()-.5)*.22,.9,(rand()-.5)*.1).normalize(),habit.length*(.94+rand()*.12),habit.radius,habit.depth);
 tree.updateMatrixWorld(true);pointer.energy=0;
}
function branch(start,dir,len,radius,depth,parent=tree){
 const joint=new THREE.Group();joint.position.copy(start);parent.add(joint);
 const end=dir.clone().multiplyScalar(len),mid=end.clone().multiplyScalar(.52).add(new THREE.Vector3((rand()-.5)*habit.curve*2,(rand()-.5)*habit.curve,(rand()-.5)*habit.curve));
 const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),mid,end);
 const g=new THREE.TubeGeometry(curve,9,radius,8,false),pos=g.attributes.position;
 for(let i=0;i<pos.count;i++){const u=Math.floor(i/9)/9,center=curve.getPointAt(u);pos.setXYZ(i,center.x+(pos.getX(i)-center.x)*(1-u*.5),center.y+(pos.getY(i)-center.y)*(1-u*.5),center.z+(pos.getZ(i)-center.z)*(1-u*.5));}
 g.computeVertexNormals();const m=new THREE.Mesh(g,wood);m.castShadow=m.receiveShadow=true;joint.add(m);
 joints.push({node:joint,depth,phase:rand()*6.28,angle:0,velocity:0,tilt:0,tiltVelocity:0});
 if(depth<4)for(let j=0;j<5;j++)tips.push({owner:joint,pos:curve.getPoint(.25+rand()*.75)});
 if(depth<=0)return;const n=depth===habit.depth?2:rand()<habit.split?(rand()<habit.third?3:2):1;
 for(let k=0;k<n;k++){const angle=(k-(n-1)/2)*habit.spread*(.65+rand()*.65)+(rand()-.5)*.45;const d=dir.clone().applyAxisAngle(new THREE.Vector3(0,0,1),angle);d.z+=(rand()-.5)*.5;d.normalize();branch(end,d,len*(habit.shrink-.06+rand()*.12),radius*(.53+rand()*.14),depth-1,joint);}
}

const raycaster=new THREE.Raycaster(),interactionPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0),gustPoint=new THREE.Vector3(100,100,0),scratch=new THREE.Vector3();
function leafGeometry(petal=false,maple=false){const sh=new THREE.Shape();sh.moveTo(0,0);if(petal){sh.bezierCurveTo(-.15,.12,-.2,.35,-.05,.39);sh.quadraticCurveTo(0,.34,.05,.39);sh.bezierCurveTo(.2,.35,.15,.12,0,0);}else if(maple){[[-.08,.10],[-.22,.16],[-.14,.23],[-.20,.32],[-.07,.29],[0,.46],[.07,.29],[.20,.32],[.14,.23],[.22,.16],[.08,.10],[0,0]].forEach(p=>sh.lineTo(...p));}else{sh.bezierCurveTo(-.18,.14,-.13,.38,0,.53);sh.bezierCurveTo(.13,.38,.18,.14,0,0);}const g=new THREE.ShapeGeometry(sh,5);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(y*7)*.055+x*x*2);}g.computeVertexNormals();return g;}
const geometries=[leafGeometry(true),leafGeometry(),leafGeometry(false,true),leafGeometry(true)];let foliage,particles,leafData=[];const dummy=new THREE.Object3D(),color=new THREE.Color(),leafQuaternion=new THREE.Quaternion();
function disposeFoliage(){if(foliage){tree.remove(foliage);foliage.material.dispose();foliage.dispose();foliage=null;}if(particles){scene.remove(particles);particles.geometry.dispose();particles.material.dispose();}}
function nextRelease(){return rand()<habit.shedRate?time+habit.shedDelay+rand()*habit.shedWindow:Infinity;}
function setSeason(i){selected=i;const s=seasons[i];disposeFoliage();regenerateBranches(i);const count=Math.round(habit.leaves*(.88+rand()*.24));const mat=new THREE.MeshPhysicalMaterial({roughness:.86,metalness:0,side:THREE.DoubleSide,sheen:.35,sheenColor:0xffe7ce,sheenRoughness:.9});foliage=new THREE.InstancedMesh(geometries[i],mat,count);foliage.castShadow=foliage.receiveShadow=true;leafData=[];for(let j=0;j<count;j++){const tip=tips[Math.floor(rand()*tips.length)];const anchor=tip.pos.clone();anchor.x+=(rand()-.5)*.45;anchor.y+=(rand()-.5)*.45;anchor.z+=(rand()-.5)*.7;const rot=new THREE.Euler((rand()-.5)*2.2,(rand()-.5)*2.8,rand()*Math.PI*2);const scale=i===3?.13+rand()*.25:i===0?.28+rand()*.32:.4+rand()*.48;leafData.push({anchor,owner:tip.owner,rot,baseRot:rot.clone(),scale,phase:rand()*6.28,pos:new THREE.Vector3(),velocity:new THREE.Vector3(),falling:false,age:0,regrow:1,releaseAt:nextRelease(),spin:(rand()-.5)*3,threshold:habit.hold+rand()*habit.holdRange});color.set(s.colors[j%s.colors.length]);color.multiplyScalar(.8+rand()*.35);foliage.setColorAt(j,color);}tree.add(foliage);const n=i===3?350:65;const positions=new Float32Array(n*3);for(let j=0;j<n;j++){positions[j*3]=(rand()-.5)*19;positions[j*3+1]=(rand()-.5)*12;positions[j*3+2]=rand()*6-1;}const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(positions,3));const pc=document.createElement('canvas');pc.width=pc.height=32;const pctx=pc.getContext('2d');let gr=pctx.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'#fff');gr.addColorStop(.25,'#fff9');gr.addColorStop(1,'#fff0');pctx.fillStyle=gr;pctx.fillRect(0,0,32,32);const tex=new THREE.CanvasTexture(pc);const pm=new THREE.PointsMaterial({color:i===3?0xffffff:0xfff4db,size:i===3?.045:.025,map:tex,transparent:true,opacity:i===3?.8:.45,depthWrite:false});pm.addEventListener('dispose',()=>tex.dispose());particles=new THREE.Points(pg,pm);scene.add(particles);
$('#char').textContent=s.char;$('#english').textContent=s.name;$('#subtitle').textContent=s.sub;$('#poem').innerHTML=s.poem;$('#number').textContent=`0${i+1} / 04`;$('#botanical').textContent=s.bot;document.querySelectorAll('[data-season]').forEach((b,j)=>{b.classList.toggle('active',j===i);b.setAttribute('aria-pressed',j===i);});sun.color.set(s.sun);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);tree.position.set(innerWidth<700?-1.5:.4,innerWidth<700?-1.1:0,0);tree.scale.setScalar(innerWidth<700?.76:1);}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;const step=paused?0:dt;if(!paused)time+=dt;
 const s=seasons[selected];scene.background.lerp(color.set(s.bg),.025);backdrop.material.color.lerp(color.set(s.bg),.025);scene.fog.color.copy(scene.background);
 pointer.energy*=Math.exp(-step*2.8);
 tree.updateMatrixWorld(true);
 if(pointer.active){raycaster.setFromCamera(new THREE.Vector2(pointer.x,pointer.y),camera);if(raycaster.ray.intersectPlane(interactionPlane,scratch))gustPoint.copy(tree.worldToLocal(scratch));}
 const breeze=wind?1:0;
 for(const j of joints){
  j.node.getWorldPosition(scratch);tree.worldToLocal(scratch);const dist=scratch.distanceTo(gustPoint);
  const influence=pointer.active?Math.exp(-dist*dist/3)*pointer.energy:0;
  const flexibility=.25+(habit.depth-j.depth)*.16;
  const target=flexibility*(breeze*(Math.sin(time*.9+j.phase)*.024+Math.sin(time*.42)*.035)+influence*pointer.vx*.12);
  j.velocity+=(target-j.angle)*step*24;j.velocity*=Math.exp(-step*5);j.angle+=j.velocity*step;
  j.tiltVelocity+=(influence*pointer.vy*.055*flexibility-j.tilt)*step*20;j.tiltVelocity*=Math.exp(-step*5);j.tilt+=j.tiltVelocity*step;
  j.node.rotation.z=j.angle;j.node.rotation.x=j.tilt;
 }
 tree.updateMatrixWorld(true);
 for(let i=0;i<leafData.length;i++){
  const p=leafData[i];scratch.copy(p.anchor);p.owner.localToWorld(scratch);tree.worldToLocal(scratch);
  const dx=p.pos.x-gustPoint.x,dy=p.pos.y-gustPoint.y;
  const near=pointer.active?Math.exp(-((scratch.x-gustPoint.x)**2+(scratch.y-gustPoint.y)**2)/1.2)*pointer.energy:0;
  if(!paused&&!p.falling&&((near>p.threshold&&Math.hypot(pointer.vx,pointer.vy)>habit.gustSpeed)||(wind&&time>p.releaseAt))){
   p.falling=true;p.age=0;p.pos.copy(scratch);p.velocity.set(.16*breeze+pointer.vx*near*.9,-.12+pointer.vy*near*.35,.08+near*.2);
  }
  if(p.falling&&step){
   p.age+=step;const local=pointer.active?Math.exp(-(dx*dx+dy*dy)/2)*pointer.energy:0;
   p.velocity.x+=(breeze*(.18+Math.sin(time*1.3+p.phase)*.3)+local*pointer.vx*3)*step;
   p.velocity.y+=(-.48+local*pointer.vy*1.3)*step;p.velocity.z+=Math.sin(time+p.phase)*step*.08;
   p.velocity.multiplyScalar(Math.exp(-step*.55));p.pos.addScaledVector(p.velocity,step);p.pos.z=Math.max(-1.65,p.pos.z);
   p.rot.x+=step*(1.1+p.spin);p.rot.y+=step*.8;p.rot.z+=step*(p.spin+Math.sin(time+p.phase)*.8);
   if(p.age>20||p.pos.y<-10||Math.abs(p.pos.x)>14){p.falling=false;p.regrow=0;p.rot.copy(p.baseRot);p.releaseAt=nextRelease();}
  }
  if(!p.falling){p.pos.copy(scratch);if(step)p.regrow=Math.min(1,p.regrow+step*.6);dummy.quaternion.copy(p.owner.getWorldQuaternion(leafQuaternion));dummy.rotateX(p.rot.x+Math.sin(time*1.7+p.phase)*.13*breeze);dummy.rotateY(p.rot.y);dummy.rotateZ(p.rot.z);}else dummy.rotation.copy(p.rot);
  dummy.position.copy(p.pos);dummy.scale.setScalar(p.scale*p.regrow);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);
 }
 foliage.instanceMatrix.needsUpdate=true;foliage.frustumCulled=false;
 if(step&&particles){const p=particles.geometry.attributes.position;for(let j=0;j<p.count;j++){p.setY(j,p.getY(j)-step*(selected===3?.24:.055));p.setX(j,p.getX(j)+Math.sin(time*.5+j)*step*.025*breeze);if(p.getY(j)<-6)p.setY(j,6);}p.needsUpdate=true;}
 renderer.render(scene,camera);
}
function pointerMove(e){
 if(e.target.closest('button,input,#info'))return;
 const now=performance.now(),x=e.clientX/innerWidth*2-1,y=-(e.clientY/innerHeight*2-1),elapsed=Math.max(.016,(now-pointer.last)/1000);
 if(pointer.active){pointer.vx=THREE.MathUtils.clamp((x-pointer.x)/elapsed,-3,3);pointer.vy=THREE.MathUtils.clamp((y-pointer.y)/elapsed,-3,3);pointer.energy=Math.min(2,pointer.energy+Math.hypot(x-pointer.x,y-pointer.y)*8);}
 pointer.x=x;pointer.y=y;pointer.active=true;pointer.last=now;
}
document.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>setSeason(+b.dataset.season));$('#light').oninput=e=>{let t=e.target.value/100;sun.position.set(-6+12*t,8-5*t,4+2*Math.sin(t*Math.PI));sun.intensity=3.9-t*1.1;$('#lightname').textContent=t<.33?'Morning':t<.75?'Afternoon':'Dusk';};$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'▷':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'Play animation':'Pause animation');};$('#wind').onclick=()=>{wind=!wind;$('#wind span').textContent=wind?'On':'Off';$('#wind').setAttribute('aria-pressed',wind);};function toggleInfo(v){$('#info').hidden=!v;$('#about').setAttribute('aria-expanded',v);}$('#about').onclick=()=>toggleInfo($('#info').hidden);$('#close').onclick=()=>toggleInfo(false);addEventListener('keydown',e=>{if(e.key==='Escape')toggleInfo(false);});addEventListener('pointermove',pointerMove);addEventListener('pointerdown',e=>{pointerMove(e);if(!e.target.closest('button,input,#info')){pointer.energy=2;pointer.vx=pointer.vx||1;}});document.addEventListener('pointerleave',()=>pointer.active=false);addEventListener('pointercancel',()=>pointer.active=false);addEventListener('resize',resize);setSeason(0);resize();$('#light').dispatchEvent(new Event('input'));$('#pause').textContent=paused?'▷':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'Play animation':'Pause animation');$('#wind').setAttribute('aria-pressed','true');requestAnimationFrame(frame);$('#loading').classList.add('done');
