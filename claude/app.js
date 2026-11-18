// Jvision — Four Seasons. A branch, a plaster wall, and one sun.
// Everything is generated here: branch growth, petal and leaf textures, soft shadows, depth of field, bloom.
import * as THREE from '../vendor/three.js';

const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const V3 = THREE.Vector3;

/* ───────────────────────── seasons ───────────────────────── */
const seasons = [
  { char: '春', name: 'Spring', sub: 'Everything blooms in its own time.',
    poem: 'At four in the morning,<br>the begonia is still awake.', bot: 'Prunus serrulata, cherry blossom',
    wall: 0xe9e3d6, bounce: 0xf3b9c0, barkA: 0x2e211d, barkB: 0x6b5148, lenticel: 1, snow: 0,
    trans: 1.0, spec: 0.06, dapple: 0.5, sunTint: [1.0, 0.98, 0.95], skyTint: [1.0, 1.0, 1.04], shed: 0.9, grav: 0.6 },
  { char: '夏', name: 'Summer', sub: 'Long days beneath a green canopy.',
    poem: 'The shade deepens in the quiet noon.<br>A single blossom remembers spring.', bot: 'Folium aestivum, summer foliage',
    wall: 0xe3e4d2, bounce: 0x9fbf63, barkA: 0x2a231b, barkB: 0x6a5c49, lenticel: 0.3, snow: 0,
    trans: 0.85, spec: 0.32, dapple: 0.62, sunTint: [1.0, 0.99, 0.93], skyTint: [0.96, 1.02, 1.0], shed: 0.22, grav: 1.25 },
  { char: '秋', name: 'Autumn', sub: 'A change carried on the breeze.',
    poem: 'One leaf falls.<br>The whole world turns to autumn.', bot: 'Acer palmatum, autumn leaf',
    wall: 0xeadfc9, bounce: 0xe59648, barkA: 0x2b2019, barkB: 0x65503f, lenticel: 0.15, snow: 0,
    trans: 1.0, spec: 0.1, dapple: 0.5, sunTint: [1.0, 0.93, 0.82], skyTint: [1.0, 0.98, 1.0], shed: 0.7, grav: 0.95 },
  { char: '冬', name: 'Winter', sub: 'Stillness before the world begins again.',
    poem: 'Evening comes, and snow is near.<br>Will you stay for a cup of warmth?', bot: 'Prunus mume, winter branch',
    wall: 0xe0e4e5, bounce: 0xcfd9e6, barkA: 0x1d1917, barkB: 0x4d443d, lenticel: 0.1, snow: 1,
    trans: 0.8, spec: 0.08, dapple: 0.32, sunTint: [0.97, 0.98, 1.0], skyTint: [0.95, 1.02, 1.12], shed: 0.16, grav: 0.8 }
];

// Branching habit per season. Each visit grows a new specimen.
const habits = [
  { r: 0.165, angle: 0.8, wander: 0.6, lift: 0.22, droop: 0.06, fork: 0.3, kink: 0, childRatio: 0.3, gaps: [1.25, 0.62, 0.38] },
  { r: 0.18, angle: 0.82, wander: 0.5, lift: 0.26, droop: 0.04, fork: 0.34, kink: 0, childRatio: 0.34, gaps: [1.05, 0.52, 0.32] },
  { r: 0.17, angle: 0.95, wander: 0.6, lift: 0.08, droop: 0.16, fork: 0.3, kink: 0, childRatio: 0.32, gaps: [1.3, 0.68, 0.42] },
  { r: 0.19, angle: 0.92, wander: 0.75, lift: 0.34, droop: 0.0, fork: 0.36, kink: 0.4, childRatio: 0.28, gaps: [1.3, 0.7, 0.42] }
];

/* ───────────────────────── rng ───────────────────────── */
let _s = 1;
const rand = () => { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = (a, b) => a + (b - a) * rand();
const reseed = () => { const e = new Uint32Array(1); crypto.getRandomValues(e); _s = e[0] | 0; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/* ───────────────────────── renderer ───────────────────────── */
let renderer;
try {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('no webgl2');
  renderer = new THREE.WebGLRenderer({ canvas, context: gl });
} catch (e) {
  $('#loading').textContent = 'This study needs WebGL 2. Please open it in a current browser.';
  throw e;
}
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = true;
$('#scene').appendChild(renderer.domElement);
const MSAA = Math.min(4, renderer.capabilities.maxSamples || 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 80);
const view = { dist: 15, cx: 0, cy: 0, px: 0, py: 0 };

/* ───────────────────────── shared uniforms ───────────────────────── */
const SHADOW_SIZE = 2048, SHADOW_HALF = 12, SHADOW_NEAR = 1, SHADOW_FAR = 40;
const lightCam = new THREE.OrthographicCamera(-SHADOW_HALF, SHADOW_HALF, SHADOW_HALF, -SHADOW_HALF, SHADOW_NEAR, SHADOW_FAR);
const lightCenter = new V3(1, -0.5, 0);
const shadowRT = new THREE.WebGLRenderTarget(SHADOW_SIZE, SHADOW_SIZE, { depthTexture: new THREE.DepthTexture(SHADOW_SIZE, SHADOW_SIZE, THREE.UnsignedIntType) });

const U = {
  uTime: { value: 0 }, uWindF: { value: 1 }, uGrow: { value: 0 },
  uPuffA: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uPuffB: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(-100, 0, 0, 0)) },
  uSunDir: { value: new V3(0, 1, 0.5).normalize() }, uSunCol: { value: new THREE.Color() }, uSkyCol: { value: new THREE.Color() },
  uBounceCol: { value: new THREE.Color(seasons[0].bounce) }, uWallCol: { value: new THREE.Color(seasons[0].wall) },
  uLightVP: { value: new THREE.Matrix4() }, uShadowMap: { value: shadowRT.depthTexture },
  uDepthRange: { value: SHADOW_FAR - SHADOW_NEAR }, uSunSize: { value: 0.03 }, uShadowExtent: { value: SHADOW_HALF * 2 },
  uGobo: { value: new THREE.Vector4(0.45, seasons[0].dapple, 0.6, 0) },
  uFocus: { value: 15 }, uAperture: { value: 200 }, uPx: { value: 1000 }
};
const shared = (...names) => Object.fromEntries(names.map(n => [n, U[n]]));

/* ───────────────────────── GLSL chunks ───────────────────────── */
const NOISE = /* glsl */`
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.,0.)),f.x),mix(hash12(i+vec2(0.,1.)),hash12(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float fbm3(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
`;

// Wind is evaluated on the GPU. Branch vertices and the leaves attached to them call the same function, so they move together.
const WIND = /* glsl */`
uniform float uTime,uWindF,uGrow;
uniform vec4 uPuffA[4]; uniform vec4 uPuffB[4];
// Where the pointer has passed, the air wakes for a moment, then drifts downwind and settles.
// It carries no direction from the pointer: branches only ever move the way the breeze moves them.
float stirAt(vec3 p){
  float acc=0.;
  for(int i=0;i<4;i++){
    float S=uPuffB[i].y, tau=uTime-uPuffB[i].x;
    if(S>0.&&tau>0.&&tau<9.){
      vec2 q=p.xy-(uPuffA[i].xy+vec2(-.8,.08)*tau);
      float rr=1.7+.45*tau;
      acc+=S*exp(-dot(q,q)/(rr*rr))*smoothstep(0.,.7,tau)*exp(-tau*.62);
    }
  }
  return min(acc,1.2);
}
vec3 windOffset(vec3 p,float flex){
  float e=stirAt(p), k=uWindF+e*.9;
  float w=sin(uTime*.9+p.x*.35)*.5+sin(uTime*.43+p.y*.21+1.3)*.7+sin(uTime*2.3+p.x*1.3+p.y*.8)*.16-.35;
  float tremble=sin(uTime*5.3+p.x*3.1+p.y*2.3)*e;
  return vec3(w*.11*k+tremble*.012, -abs(w)*.025*k, w*.05*k+tremble*.018)*flex;
}
float gustLocal(vec3 p){return stirAt(p);}
`;

// One sun. Its visibility is: soft shadow from the branch (contact-hardening) × a canopy somewhere out of frame.
const LIGHT = /* glsl */`
uniform vec3 uSunDir,uSunCol,uSkyCol,uBounceCol,uWallCol;
uniform mat4 uLightVP; uniform sampler2D uShadowMap;
uniform float uDepthRange,uSunSize,uShadowExtent;
uniform vec4 uGobo;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
vec2 vogel(float i,float n,float phi){float r=sqrt((i+.5)/n);float t=i*2.39996323+phi;return r*vec2(cos(t),sin(t));}
float gobo(vec2 g){
  vec2 q=g*uGobo.z+vec2(uTime*.018*uWindF,0.);
  vec2 warp=vec2(fbm3(q*2.1+vec2(3.,uTime*.05*uWindF)),fbm3(q*2.1-vec2(7.,uTime*.04*uWindF)));
  float n=fbm(q+.42*warp);
  float d=smoothstep(.3,.66,n);
  float pool=1.-smoothstep(.25,1.,length((g-vec2(1.5,.5))/vec2(15.,10.)));
  return mix(1.,d,uGobo.y)*mix(1.,pool,uGobo.x);
}
float sunVis(vec3 wp,vec3 offs,float quality){
  vec4 lp=uLightVP*vec4(wp+offs,1.);
  vec3 c=lp.xyz*.5+.5;
  float gb=gobo(lp.xy*uShadowExtent*.5);
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return gb;
  float phi=ign(gl_FragCoord.xy)*6.2831853;
  float bias=.0007;
  float sum=0.,cnt=0.;
  float search=.42/uShadowExtent;
  for(int i=0;i<10;i++){
    float d=texture2D(uShadowMap,c.xy+vogel(float(i),10.,phi)*search).r;
    if(d<c.z-bias){sum+=d;cnt+=1.;}
  }
  if(cnt<.5)return gb;
  float pen=(c.z-sum/cnt)*uDepthRange*uSunSize;
  float r=clamp(pen,.014,.42)/uShadowExtent;
  float s=0.;
  if(quality>.5){
    for(int i=0;i<20;i++)s+=step(c.z-bias,texture2D(uShadowMap,c.xy+vogel(float(i),20.,phi+1.7)*r).r);
    s/=20.;
  }else{
    for(int i=0;i<9;i++)s+=step(c.z-bias,texture2D(uShadowMap,c.xy+vogel(float(i),9.,phi+1.7)*r).r);
    s/=9.;
  }
  return s*gb;
}
`;

/* ───────────────────────── wall ───────────────────────── */
const WALL_Z = -1.4;
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 80),
  new THREE.ShaderMaterial({
    uniforms: shared('uTime', 'uWindF', 'uSunDir', 'uSunCol', 'uSkyCol', 'uBounceCol', 'uWallCol', 'uLightVP', 'uShadowMap', 'uDepthRange', 'uSunSize', 'uShadowExtent', 'uGobo'),
    vertexShader: /* glsl */`varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: /* glsl */`
      varying vec3 vW; uniform float uTime,uWindF;
      ${NOISE}${LIGHT}
      void main(){
        vec2 p=vW.xy;
        // hand-trowelled lime plaster: broad sweeps, medium float marks, fine sand
        float h=fbm(p*vec2(.9,2.6)+fbm3(p*.6)*1.5)*.9+fbm(p*11.)*.22+vnoise(p*52.)*.07;
        float dhx=dFdx(h)/max(abs(dFdx(p.x)),1e-5), dhy=dFdy(h)/max(abs(dFdy(p.y)),1e-5);
        vec3 N=normalize(vec3(-dhx*.022,-dhy*.022,1.));
        vec3 alb=uWallCol*(.93+.09*fbm3(p*.55+4.)+.04*fbm3(p*19.));
        float vis=sunVis(vW,vec3(0.),1.);
        float ndl=max(dot(N,uSunDir),0.);
        vec3 sky=uSkyCol*(.9+.1*N.y);
        // the room: light pools near the branch and falls away into the corners
        float room=1.-.2*smoothstep(4.,17.,length((p-vec2(1.,0.))*vec2(.75,1.)));
        float glow=exp(-dot(p-vec2(2.6,.4),p-vec2(2.6,.4))/26.);
        vec3 col=alb*(uSunCol*ndl*vis+sky*room+uBounceCol*uSunCol*glow*.045);
        gl_FragColor=vec4(col,1.);
      }`
  })
);
wall.position.z = WALL_Z;
scene.add(wall);

/* ───────────────────────── branch material ───────────────────────── */
const barkUniforms = {
  ...shared('uTime', 'uWindF', 'uGrow', 'uPuffA', 'uPuffB', 'uSunDir', 'uSunCol', 'uSkyCol', 'uBounceCol', 'uWallCol', 'uLightVP', 'uShadowMap', 'uDepthRange', 'uSunSize', 'uShadowExtent', 'uGobo'),
  uBarkA: { value: new THREE.Color() }, uBarkB: { value: new THREE.Color() }, uLenticel: { value: 1 }, uSnow: { value: 0 }
};
const BARK_VERT = /* glsl */`
  attribute float aFlex,aBirth,aRadius;
  uniform float uSnow;
  varying vec3 vW,vN; varying vec2 vUv; varying float vRad;
  ${WIND}
  void main(){
    float g=smoothstep(aBirth*.72,aBirth*.72+.14,uGrow);
    vec3 center=position-normal*aRadius;
    float cap=uSnow*smoothstep(.15,.95,normal.y);
    vec3 p=center+normal*aRadius*g+vec3(0.,1.,0.)*cap*(aRadius*.55+.022)*g;
    p+=windOffset(center,aFlex);
    vec4 w=modelMatrix*vec4(p,1.);
    vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vUv=uv; vRad=aRadius;
    gl_Position=projectionMatrix*viewMatrix*w;
  }`;
const barkMat = new THREE.ShaderMaterial({
  uniforms: barkUniforms, vertexShader: BARK_VERT,
  fragmentShader: /* glsl */`
    varying vec3 vW,vN; varying vec2 vUv; varying float vRad;
    uniform float uTime,uWindF,uSnow,uLenticel; uniform vec3 uBarkA,uBarkB;
    ${NOISE}${LIGHT}
    vec3 bump(vec3 N,vec3 P,float h,float k){
      vec3 dpx=dFdx(P),dpy=dFdy(P); float hx=dFdx(h),hy=dFdy(h);
      vec3 r1=cross(dpy,N),r2=cross(N,dpx); float det=dot(dpx,r1);
      return normalize(abs(det)*N-k*sign(det)*(hx*r1+hy*r2));
    }
    void main(){
      float circ=6.2832*max(vRad,.02);
      vec2 b=vec2(abs(vUv.x*2.-1.)*circ*.5,vUv.y);
      float fiss=1.-abs(2.*fbm(b*vec2(9.,2.2))-1.);
      float grain=fbm(b*vec2(26.,7.));
      float lent=smoothstep(.6,.78,vnoise(vec2(b.x*3.,b.y*24.)))*uLenticel*smoothstep(.02,.06,vRad);
      float h=fiss*.65+grain*.3+lent*.35;
      vec3 N0=normalize(vN);
      vec3 N=bump(N0,vW,h,.018);
      vec3 alb=mix(uBarkA,uBarkB,smoothstep(.35,.95,h));
      alb=mix(alb,alb*1.7+vec3(.05,.035,.03),lent);
      alb*=(.75+.5*fbm3(b*1.3+7.))*.82;
      float s=uSnow*smoothstep(.3,.62,N0.y+(fbm3(vW.xy*5.)-.5)*.55);
      alb=mix(alb,vec3(.9,.93,.97),s);
      N=normalize(mix(N,N0+vec3(0.,.6,0.),s));
      vec3 V=normalize(cameraPosition-vW);
      float ndl=dot(N,uSunDir);
      float vis=sunVis(vW,N0*.05,0.);
      float diff=mix(max(ndl*.8+.2,0.)/1.2,max(ndl*.6+.4,0.),s);
      vec3 H=normalize(uSunDir+V);
      float spec=pow(max(dot(N,H),0.),70.)*.3*s;
      float rim=pow(1.-max(dot(N0,V),0.),3.);
      vec3 amb=uSkyCol*(.55+.45*N.y)+uWallCol*uSunCol*.09*max(-N.z,0.)+uBounceCol*.05;
      vec3 col=alb*(uSunCol*diff*vis+amb)+uSunCol*vis*spec;
      gl_FragColor=vec4(col,1.);
    }`
});
const barkDepthMat = new THREE.ShaderMaterial({ uniforms: barkUniforms, vertexShader: BARK_VERT, fragmentShader: `void main(){gl_FragColor=vec4(1.);}` });

/* ───────────────────────── foliage material ───────────────────────── */
const atlas = buildAtlas();
const FOLIAGE_VERT = /* glsl */`
  attribute vec4 aAnchor,aTintCell,aMisc; attribute float aAlive;
  varying vec2 vUv; varying vec3 vW,vN,vTint;
  ${WIND}
  vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
  vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
  void main(){
    float g=smoothstep(aMisc.y,aMisc.y+.09,uGrow)*aAlive;
    g=g*(1.+.25*sin(g*3.14159));
    vec3 p=position; float cx=aMisc.z,cy=aMisc.w;
    p.z=cx*p.x*p.x*2.+cy*p.y*p.y;
    vec3 n=normalize(vec3(-4.*cx*p.x,-2.*cy*p.y,1.));
    float ph=aMisc.x, live=step(.0001,aAnchor.w);
    float gk=min(gustLocal(aAnchor.xyz)*.5,.5)*live;
    float a=(sin(uTime*(1.8+fract(ph*7.)*2.2)+ph*6.28)*.2+sin(uTime*5.1+ph*17.)*.07)*uWindF*live+(sin(uTime*8.+ph*31.)*.6+sin(uTime*13.+ph*53.)*.4)*gk;
    float b=sin(uTime*1.6+ph*9.)*.14*uWindF*live+sin(uTime*7.+ph*23.)*gk*.6;
    p=rotX(rotY(p,a),b); n=rotX(rotY(n,a),b);
    p*=g;
    vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);
    w.xyz+=windOffset(aAnchor.xyz,aAnchor.w);
    vW=w.xyz; vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*n); vTint=aTintCell.rgb;
    float c=aTintCell.w; vUv=(vec2(mod(c,4.),3.-floor(c/4.))+uv)*.25;
    gl_Position=projectionMatrix*viewMatrix*w;
  }`;
const foliageUniforms = () => ({
  ...shared('uTime', 'uWindF', 'uGrow', 'uPuffA', 'uPuffB', 'uSunDir', 'uSunCol', 'uSkyCol', 'uBounceCol', 'uWallCol', 'uLightVP', 'uShadowMap', 'uDepthRange', 'uSunSize', 'uShadowExtent', 'uGobo'),
  uAtlas: { value: atlas }, uTrans: { value: 1 }, uSpec: { value: 0.1 }
});
const FOLIAGE_FRAG = /* glsl */`
  varying vec2 vUv; varying vec3 vW,vN,vTint;
  uniform sampler2D uAtlas; uniform float uTime,uWindF,uTrans,uSpec;
  ${NOISE}${LIGHT}
  void main(){
    vec4 t=texture2D(uAtlas,vUv);
    float a=t.a;
    #ifdef A2C
      a=clamp((a-.5)/max(fwidth(a),1e-4)+.5,0.,1.); if(a<.01)discard;
    #else
      if(a<.5)discard; a=1.;
    #endif
    vec3 alb=pow(t.rgb/max(t.a,1e-3),vec3(2.2))*vTint;
    vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N;
    vec3 V=normalize(cameraPosition-vW);
    float ndl=dot(N,uSunDir);
    float vis=sunVis(vW,uSunDir*.07,0.);
    // thin tissue: what the sun does not reflect, it pushes through
    vec3 through=pow(alb,vec3(1.35))*1.55*max(-ndl,0.)*uTrans;
    vec3 diff=alb*max(ndl,0.)*(1.-.25*uTrans)+alb*.12*uTrans;
    vec3 H=normalize(uSunDir+V);
    float spec=pow(max(dot(N,H),0.),38.)*uSpec;
    vec3 amb=uSkyCol*(.62+.38*N.y)+uWallCol*uSunCol*.08*max(-N.z,0.);
    vec3 col=(diff+through)*uSunCol*vis+alb*amb+uSunCol*vis*spec;
    gl_FragColor=vec4(col,a);
  }`;
const makeFoliageMat = () => new THREE.ShaderMaterial({
  uniforms: foliageUniforms(), vertexShader: FOLIAGE_VERT, fragmentShader: FOLIAGE_FRAG,
  side: THREE.DoubleSide, defines: MSAA > 0 ? { A2C: 1 } : {}, alphaToCoverage: MSAA > 0
});
const foliageDepthMat = new THREE.ShaderMaterial({
  uniforms: foliageUniforms(), vertexShader: FOLIAGE_VERT, side: THREE.DoubleSide,
  fragmentShader: `varying vec2 vUv;uniform sampler2D uAtlas;void main(){if(texture2D(uAtlas,vUv).a<.5)discard;gl_FragColor=vec4(1.);}`
});
const foliageMat = makeFoliageMat(), fallMat = makeFoliageMat();
const cardGeo = new THREE.PlaneGeometry(1, 1, 4, 6); cardGeo.translate(0, 0.5, 0);

/* ───────────────────────── texture atlas (painted on a 2D canvas) ───────────────────────── */
function buildAtlas() {
  const S = 256, N = 4, c = document.createElement('canvas'); c.width = c.height = S * N;
  const x = c.getContext('2d');
  const cell = (i, fn) => { x.save(); x.translate((i % N) * S, Math.floor(i / N) * S); x.beginPath(); x.rect(0, 0, S, S); x.clip(); x.scale(S, S); fn(); x.restore(); };
  const grad = (y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const petalPath = (w, notch, top) => { x.beginPath(); x.moveTo(.5, .95); x.bezierCurveTo(.5 - w * .3, .82, .5 - w, .52, .5 - w * .62, top + .1); x.quadraticCurveTo(.5 - w * .3, top - .02, .5, top + notch); x.quadraticCurveTo(.5 + w * .3, top - .02, .5 + w * .62, top + .1); x.bezierCurveTo(.5 + w, .52, .5 + w * .3, .82, .5, .95); x.closePath(); };
  const petal = (i, w, notch, stops, vein, blush) => cell(i, () => {
    petalPath(w, notch, .07); x.fillStyle = grad(.95, .05, stops); x.fill(); x.save(); x.clip();
    const rg = x.createRadialGradient(.5, .9, 0, .5, .9, .5); rg.addColorStop(0, blush); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1, 1);
    x.strokeStyle = vein; x.lineWidth = .005;
    for (let k = -5; k <= 5; k++) { x.beginPath(); x.moveTo(.5, .94); x.quadraticCurveTo(.5 + k * .045, .62, .5 + k * .07, .13 + Math.abs(k) * .028); x.stroke(); }
    x.restore();
  });
  const centre = (i, disc, fil, anther, n, len) => cell(i, () => {
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU + R(-.12, .12), l = len * R(.55, 1), ex = .5 + Math.cos(a) * l, ey = .5 + Math.sin(a) * l;
      x.strokeStyle = fil; x.lineWidth = .013; x.beginPath(); x.moveTo(.5, .5); x.lineTo(ex, ey); x.stroke();
      x.fillStyle = anther; x.beginPath(); x.arc(ex, ey, .024, 0, TAU); x.fill();
    }
    const g = x.createRadialGradient(.5, .5, 0, .5, .5, .11); g.addColorStop(0, disc[0]); g.addColorStop(1, disc[1]); x.fillStyle = g; x.beginPath(); x.arc(.5, .5, .1, 0, TAU); x.fill();
  });
  const bud = (i, stops, calyx) => cell(i, () => {
    x.beginPath(); x.moveTo(.5, .96); x.bezierCurveTo(.22, .85, .27, .42, .5, .34); x.bezierCurveTo(.73, .42, .78, .85, .5, .96); x.closePath(); x.fillStyle = grad(.96, .34, stops); x.fill();
    x.beginPath(); x.moveTo(.5, .97); x.bezierCurveTo(.3, .93, .3, .8, .36, .7); x.lineTo(.44, .8); x.lineTo(.5, .68); x.lineTo(.56, .8); x.lineTo(.64, .7); x.bezierCurveTo(.7, .8, .7, .93, .5, .97); x.fillStyle = calyx; x.fill();
  });
  const leaf = (i, w, c1, c2, c3, veinCol) => cell(i, () => {
    const blade = () => { x.beginPath(); x.moveTo(.5, .88); x.bezierCurveTo(.5 - w * 1.15, .78, .5 - w, .34, .5, .04); x.bezierCurveTo(.5 + w, .34, .5 + w * 1.15, .78, .5, .88); x.closePath(); };
    x.strokeStyle = c1; x.lineWidth = .022; x.lineCap = 'round'; x.beginPath(); x.moveTo(.5, .985); x.lineTo(.5, .86); x.stroke();
    blade(); x.fillStyle = grad(.88, .04, [[0, c1], [.55, c2], [1, c3]]); x.fill(); x.save(); x.clip();
    const sg = x.createLinearGradient(.5 - w, 0, .5 + w, 0); sg.addColorStop(0, 'rgba(0,0,0,.16)'); sg.addColorStop(.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(255,255,220,.1)'); x.fillStyle = sg; x.fillRect(0, 0, 1, 1);
    x.strokeStyle = veinCol; x.lineWidth = .009; x.beginPath(); x.moveTo(.5, .88); x.lineTo(.5, .05); x.stroke();
    x.lineWidth = .005;
    for (let k = 0; k < 7; k++) { const y = .8 - k * .1; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(.5, y); x.quadraticCurveTo(.5 + s * w * .5, y - .06, .5 + s * w * 1.05, y - .16); x.stroke(); } }
    x.restore();
  });
  const maple = (i, c1, c2, c3, veinCol) => cell(i, () => {
    const J = [.5, .6], lobes = [[-138, .15], [-96, .33], [-47, .46], [0, .53], [47, .46], [96, .33], [138, .15]];
    const pt = (deg, l, off = 0) => { const a = deg * Math.PI / 180; return [J[0] + Math.sin(a) * l + Math.cos(a) * off, J[1] - Math.cos(a) * l + Math.sin(a) * off]; };
    const path = () => {
      x.beginPath(); x.moveTo(J[0], J[1] + .035);
      lobes.forEach(([d, l], k) => {
        x.lineTo(...pt(d, l * .42, -l * .17)); x.lineTo(...pt(d, l * .66, -l * .24)); x.lineTo(...pt(d, l * .7, -l * .1));
        x.lineTo(...pt(d, l, 0));
        x.lineTo(...pt(d, l * .7, l * .1)); x.lineTo(...pt(d, l * .66, l * .24)); x.lineTo(...pt(d, l * .42, l * .17));
        if (k < lobes.length - 1) { const [d2, l2] = lobes[k + 1]; x.lineTo(...pt((d + d2) / 2, Math.min(l, l2) * .3)); }
      });
      x.closePath();
    };
    x.strokeStyle = veinCol; x.lineWidth = .016; x.lineCap = 'round'; x.beginPath(); x.moveTo(.5, .985); x.lineTo(...J); x.stroke();
    path(); const g = x.createRadialGradient(J[0], J[1], 0, J[0], J[1], .5); g.addColorStop(0, c2); g.addColorStop(.55, c1); g.addColorStop(1, c3); x.fillStyle = g; x.fill();
    x.save(); x.clip();
    for (let k = 0; k < 26; k++) { x.fillStyle = k % 2 ? 'rgba(120,30,10,.1)' : 'rgba(255,220,120,.1)'; x.beginPath(); x.arc(R(.05, .95), R(.05, .95), R(.02, .09), 0, TAU); x.fill(); }
    x.strokeStyle = veinCol; x.globalAlpha = .55;
    lobes.forEach(([d, l]) => { x.lineWidth = .008; x.beginPath(); x.moveTo(...J); x.lineTo(...pt(d, l * .96)); x.stroke(); x.lineWidth = .004; for (const s of [-1, 1]) for (const f of [.35, .55]) { x.beginPath(); x.moveTo(...pt(d, l * f)); x.lineTo(...pt(d, l * (f + .2), s * l * .13)); x.stroke(); } });
    x.restore();
  });

  petal(0, .37, .07, [[0, '#f0a9ba'], [.3, '#fad9e0'], [1, '#fff3f4']], 'rgba(226,128,154,.3)', 'rgba(232,120,150,.55)');
  petal(1, .35, .06, [[0, '#ea8fa8'], [.35, '#f6c3cf'], [1, '#fde4e8']], 'rgba(214,105,138,.32)', 'rgba(222,96,134,.6)');
  centre(2, ['#c2456a', '#e58aa2'], '#fbe6ea', '#f1c240', 22, .34);
  bud(3, [[0, '#d9607f'], [.6, '#f09bb0'], [1, '#f8c3cf']], '#6c3b33');
  leaf(4, .19, '#7d5a36', '#9b8a46', '#b7a55a', 'rgba(230,214,150,.55)');
  leaf(5, .24, '#1c3d1b', '#305c25', '#4a7a2e', 'rgba(190,214,130,.5)');
  leaf(6, .22, '#28522a', '#487a30', '#6f983f', 'rgba(214,230,150,.5)');
  maple(7, '#b3311c', '#d9612a', '#7e1e17', '#5a1a12');
  maple(8, '#d76a23', '#efa23a', '#b0431b', '#7a2e14');
  maple(9, '#e2a235', '#f3cf62', '#c97526', '#8a5220');
  petal(10, .44, -.015, [[0, '#a81f3d'], [.4, '#cf3b57'], [1, '#e4677d']], 'rgba(120,10,40,.3)', 'rgba(110,8,36,.5)');
  centre(11, ['#7d1730', '#b93752'], '#fdf0d6', '#f6d24f', 30, .42);
  bud(12, [[0, '#8f1832'], [.6, '#c63552'], [1, '#dc5a72']], '#3b2620');
  leaf(13, .2, '#254d24', '#41722c', '#69923a', 'rgba(205,226,140,.5)');

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = true; t.anisotropy = 8; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/* ───────────────────────── the branch ───────────────────────── */
const tree = { mesh: null, foliage: null, shed: [], alive: null, regrow: [], growing: [] };
const Z = new V3(0, 0, 1);

function growTree(si) {
  const H = habits[si], branches = [], anchors = [];
  let maxFlex = 1e-6, maxDist = 1e-6;
  const SEG = 0.2;
  // Growth rules taken from real wood: a limb only thins where it gives something away (pipe model),
  // it leans away from every shoot it puts out, and shoots leave at a narrow angle before arcing to the light.
  function grow(start, dir, len, r0, level, dist0, flex0, path) {
    const n = path ? path.length - 1 : Math.max(3, Math.round(len / SEG)), seg = len / n;
    const pts = [], rad = [], dst = [], flx = [], kids = [];
    const p = start.clone(), d = dir.clone();
    const amp = H.wander * [.25, .3, .5, .55, .55][level + 1];
    const bend = new V3(R(-1, 1), R(-1, 1), R(-.4, .4)).multiplyScalar(amp * .7);
    const nodes = [];
    if (level >= 0 && level < 3 && r0 > .013) { let s = len * (path ? R(.4, .46) : R(.14, .28)); while (s < len * .94) { nodes.push(s); s += H.gaps[level] * R(.6, 1.4); } }
    let ni = 0, r = r0, flex = flex0, side = rand() < .5 ? 1 : -1;
    const tipR = Math.max(.008 / r0, path ? .22 : level >= 2 ? .3 : .4), knot = R(0, 9);
    for (let i = 0; i <= n; i++) {
      const t = i / n, taper = t < .7 ? 1 : lerp(1, tipR, Math.pow((t - .7) / .3, 1.3));
      const rr = Math.max(.008, r * taper * (path ? 1 + .1 * Math.sin(t * 31 + knot) * Math.sin(t * 13 + knot * 2) : 1));
      pts.push(p.clone()); rad.push(rr); dst.push(dist0 + t * len); flx.push(flex);
      if (i === n) break;
      while (ni < nodes.length && nodes[ni] <= (i + 1) * seg) {
        ni++;
        const strong = level <= 1 && t > .2 && t < .8 && rand() < H.fork * (path ? .6 : 1);
        const rc = r * (strong ? R(.7, .85) : R(.42, .6));
        if (rc < .0085) continue;
        const axis = new V3(R(-.35, .35), R(-.35, .35), 1); axis.addScaledVector(d, -axis.dot(d)).normalize();
        const ang = H.angle * (strong ? R(.45, .7) : R(.8, 1.2));
        let cd = d.clone().applyAxisAngle(axis, side * ang);
        if (path && rand() < .78) { const alt = d.clone().applyAxisAngle(axis, -side * ang); if (alt.y > cd.y) { cd = alt; side = -side; } } // shoots favour the sky side of the limb
        cd.z += R(-.3, .3); cd.normalize();
        const rest = len * (1 - t);
        const clen = path ? (strong ? rest * R(.55, .8) + .6 : rest * H.childRatio * R(.5, 1) + R(.5, 1.1))
          : strong ? rest * R(.8, 1.05) + .4 : Math.max(.3, (rest * H.childRatio + len * .1) * R(.7, 1.25));
        kids.push({ i: i + 1, cd, clen, rc });
        if (!path) d.applyAxisAngle(axis, -side * H.angle * (strong ? .42 : .15) * R(.6, 1.2) + R(-1, 1) * H.kink);
        r = Math.sqrt(Math.max(r * r - .85 * rc * rc, r * r * .3));
        side = rand() < .8 ? -side : side;
      }
      if (path) { d.copy(path[i + 1]).sub(path[i]).normalize(); p.copy(path[i + 1]); r *= 1 - .012 * seg; flex += seg / Math.pow(rr, 1.15); continue; }
      bend.x += R(-1, 1) * amp * .22; bend.y += R(-1, 1) * amp * .22; bend.z += R(-1, 1) * amp * .1; bend.multiplyScalar(.94);
      d.addScaledVector(bend, seg);
      d.y += level > 0 ? H.lift * seg * (.5 + t) - H.droop * seg * t * 2.2 : H.lift * seg * .3 - H.droop * seg * .3;
      d.z -= p.z * .25 * seg; d.z *= .93;
      d.normalize(); p.addScaledVector(d, seg);
      r *= 1 - .012 * seg;
      flex += seg / Math.pow(rr, 1.15);
    }
    maxFlex = Math.max(maxFlex, flex); maxDist = Math.max(maxDist, dist0 + len);
    branches.push({ pts, rad, dst, flx, level, r0 });
    // foliage sites on the slender wood
    let fs = rand() < .5 ? 1 : -1;
    for (let s = seg * 1.2; s <= len; s += R(.12, .2)) {
      const i = Math.min(n - 1, Math.floor(s / seg)), f = s / seg - i, rr = lerp(rad[i], rad[i + 1], f);
      if (rr > .034 || level < 1) continue;
      const pos = pts[i].clone().lerp(pts[i + 1], f), bd = pts[i + 1].clone().sub(pts[i]).normalize();
      const out = new V3(-bd.y * fs, bd.x * fs, R(-.6, .9)).normalize();
      anchors.push({ pos, dir: bd, out, flex: lerp(flx[i], flx[i + 1], f), dist: lerp(dst[i], dst[i + 1], f), r: rr, tip: s > len - .25 });
      fs = -fs;
    }
    for (const k of kids) grow(pts[k.i].clone(), k.cd, k.clen, k.rc, level + 1, dst[k.i], flx[k.i]);
  }
  // The limb is drawn first, as one brushstroke entering from outside the frame; everything else grows from it.
  const J = a => R(-a, a), k = H.kink ? 1.7 : 1, tall = innerWidth / innerHeight < 1;
  const lines = [
    [[14, -4.4], [8.3, -3.1 + J(.3)], [5.3 + J(.4 * k), -1.5 + J(.5 * k)], [3.0 + J(.4 * k), -1.2 + J(.5 * k)], [1.3 + J(.5 * k), .5 + J(.5 * k)], [.3 + J(.6), 2.5 + J(.5)]],
    [[8.4, -10.5], [7.1 + J(.3), -5.3], [5.7 + J(.4 * k), -2.2 + J(.4 * k)], [3.3 + J(.5 * k), -.9 + J(.4 * k)], [2.7 + J(.4 * k), 1.2 + J(.4 * k)], [.9 + J(.5), 2.4 + J(.5)], [-.6 + J(.4), 2.1 + J(.5)]],
    [[14, 7.6], [8.5, 4.5 + J(.3)], [5.7 + J(.4 * k), 3.4 + J(.4 * k)], [3.7 + J(.4 * k), 1.6 + J(.5 * k)], [2.5 + J(.5 * k), -.6 + J(.5 * k)], [.7 + J(.5), -1.7 + J(.4)], [-.7 + J(.4), -1.1 + J(.5)]]
  ];
  const line = lines[(rand() * (tall ? 2 : 3)) | 0];
  const curve = new THREE.CatmullRomCurve3(line.map(([x, y], i) => new V3(x, y, i < 2 ? 0 : J(.3))), false, H.kink ? 'chordal' : 'centripetal');
  const total = curve.getLength(), path = curve.getSpacedPoints(Math.round(total / SEG));
  grow(path[0], new V3(0, 1, 0), total, H.r, 0, 0, 0, path);

  // tubes
  let vc = 0, ic = 0;
  for (const b of branches) { const rs = b.r0 > .07 ? 12 : b.r0 > .028 ? 9 : 6; b.rs = rs; vc += b.pts.length * (rs + 1); ic += (b.pts.length - 1) * rs * 6; }
  const P = new Float32Array(vc * 3), Nn = new Float32Array(vc * 3), UV = new Float32Array(vc * 2), FL = new Float32Array(vc), BI = new Float32Array(vc), RA = new Float32Array(vc), IX = new Uint32Array(ic);
  let v = 0, ii = 0;
  const T = new V3(), Nv = new V3(), B = new V3(), tmp = new V3();
  for (const b of branches) {
    const { pts, rad, dst, flx, rs } = b, m = pts.length, base = v;
    for (let i = 0; i < m; i++) {
      T.copy(pts[Math.min(m - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { Nv.set(0, 0, 1).addScaledVector(T, -T.z).normalize(); if (!isFinite(Nv.x) || Nv.lengthSq() < .5) Nv.set(1, 0, 0); }
      else Nv.addScaledVector(T, -Nv.dot(T)).normalize();
      B.crossVectors(T, Nv);
      const fl = Math.pow(flx[i] / maxFlex, .75), bi = dst[i] / maxDist;
      for (let j = 0; j <= rs; j++) {
        const a = j / rs * TAU; tmp.copy(Nv).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        P[v * 3] = pts[i].x + tmp.x * rad[i]; P[v * 3 + 1] = pts[i].y + tmp.y * rad[i]; P[v * 3 + 2] = pts[i].z + tmp.z * rad[i];
        Nn[v * 3] = tmp.x; Nn[v * 3 + 1] = tmp.y; Nn[v * 3 + 2] = tmp.z;
        UV[v * 2] = j / rs; UV[v * 2 + 1] = dst[i]; FL[v] = fl; BI[v] = bi; RA[v] = rad[i]; v++;
      }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < rs; j++) {
      const a = base + i * (rs + 1) + j, c = a + rs + 1;
      IX[ii++] = a; IX[ii++] = a + 1; IX[ii++] = c; IX[ii++] = a + 1; IX[ii++] = c + 1; IX[ii++] = c;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setAttribute('aFlex', new THREE.BufferAttribute(FL, 1));
  g.setAttribute('aBirth', new THREE.BufferAttribute(BI, 1)); g.setAttribute('aRadius', new THREE.BufferAttribute(RA, 1));
  g.setIndex(new THREE.BufferAttribute(IX, 1));
  for (const a of anchors) { a.flex = Math.pow(a.flex / maxFlex, .75); a.birth = a.dist / maxDist; }
  return { geometry: g, anchors };
}

/* ───────────────────────── dressing the branch ───────────────────────── */
function dress(si, anchors) {
  const cards = [];
  const X = new V3(), Y = new V3(), Zv = new V3(), Uv = new V3(), Vv = new V3(), m = new THREE.Matrix4();
  const card = (pos, y, z, size, cell, a, opts = {}) => {
    Y.copy(y).normalize(); Zv.copy(z).addScaledVector(Y, -z.dot(Y)).normalize(); X.crossVectors(Y, Zv);
    m.makeBasis(X.clone().multiplyScalar(size), Y.clone().multiplyScalar(size), Zv.clone().multiplyScalar(size)).setPosition(pos);
    const tint = opts.tint || [1, 1, 1], k = R(.86, 1.12);
    cards.push({ m: m.clone(), anchor: a, cell, tint: [tint[0] * k, tint[1] * k, tint[2] * k], cx: opts.cx ?? R(.15, .5), cy: opts.cy ?? R(-.15, .25), shed: opts.shed !== false, lb: opts.lb ?? (.26 + .6 * a.birth + R(0, .05)) });
  };
  const facing = (a, cam = .8) => new V3().copy(a.out).multiplyScalar(.9).add(new V3(R(-.5, .5), R(-.2, .6), R(.1, cam + .4))).normalize();
  const blossom = (a, P, A, size, petalCells, centreCell, cup, tint) => {
    Uv.crossVectors(A, Math.abs(A.y) > .9 ? new V3(1, 0, 0) : new V3(0, 1, 0)).normalize(); Vv.crossVectors(A, Uv);
    const r0 = rand() * TAU, lb = .26 + .6 * a.birth + R(0, .06);
    for (let k = 0; k < 5; k++) {
      const ph = r0 + k * TAU / 5 + R(-.1, .1), Rd = Uv.clone().multiplyScalar(Math.cos(ph)).addScaledVector(Vv, Math.sin(ph));
      const c = cup + R(-.1, .1);
      const y = Rd.clone().multiplyScalar(Math.cos(c)).addScaledVector(A, Math.sin(c));
      const z = A.clone().multiplyScalar(Math.cos(c)).addScaledVector(Rd, -Math.sin(c));
      card(P.clone().addScaledVector(Rd, size * .03), y, z, size * R(.92, 1.06), petalCells[(rand() * petalCells.length) | 0], a, { cx: R(.25, .6), cy: R(-.1, .3), lb, tint });
    }
    const s = size * .6;
    card(P.clone().addScaledVector(Vv, -s * .5).addScaledVector(A, size * .06), Vv, A, s, centreCell, a, { cx: 0, cy: 0, shed: false, lb: lb + .02 });
  };

  if (si === 0) { // cherry: umbels of blossom, a few buds, the first bronze leaves
    for (const a of anchors) {
      if (rand() < .44) {
        const n = 1 + (rand() * 3 | 0);
        for (let k = 0; k < n; k++) {
          const A = facing(a), P = a.pos.clone().addScaledVector(A, R(.06, .17)).add(new V3(R(-.07, .07), R(-.07, .07), R(-.05, .08)));
          blossom(a, P, A, R(.17, .235), [0, 0, 1], 2, R(.12, .62), [1, R(.94, 1), R(.95, 1)]);
        }
      } else if (rand() < .3) card(a.pos.clone(), facing(a, .2).add(a.dir), new V3(R(-.5, .5), R(-.5, .5), 1), R(.13, .2), 3, a, { shed: false, cx: .3, cy: 0 });
      else if (rand() < .16) card(a.pos.clone(), facing(a, .1).add(a.dir).add(new V3(0, .3, 0)), new V3(R(-.6, .6), R(0, .8), 1), R(.24, .4), 4, a, { cx: R(.5, 1), cy: R(-.2, .3) });
    }
  } else if (si === 1) { // summer: overlapping green, one late blossom
    for (const a of anchors) {
      const n = rand() < .68 ? (rand() < .3 ? 2 : 1) : 0;
      for (let k = 0; k < n; k++) {
        const y = new V3().copy(a.out).multiplyScalar(R(.6, 1.2)).addScaledVector(a.dir, R(.2, .8)).add(new V3(R(-.3, .3), R(-.55, .1), R(-.3, .4)));
        const z = new V3(R(-.7, .7), R(.1, 1), R(.3, 1.2));
        card(a.pos.clone(), y, z, R(.5, .86), [5, 5, 6, 13][(rand() * 4) | 0], a, { cx: R(.3, .9), cy: R(-.35, .1), tint: [R(.9, 1.1), 1, R(.85, 1.05)] });
      }
    }
    const late = anchors.filter(a => a.tip); const a = late[(rand() * late.length) | 0];
    if (a) { const A = new V3(-.2, .25, 1).normalize(); blossom(a, a.pos.clone().addScaledVector(A, .14), A, .24, [0, 1], 2, .3, [1, 1, 1]); }
  } else if (si === 2) { // maple: fewer, larger, hanging
    for (const a of anchors) {
      if (rand() > .36) continue;
      const y = new V3().copy(a.out).multiplyScalar(R(.3, .9)).add(new V3(R(-.4, .4), R(-1.1, -.35), R(-.2, .4)));
      const z = new V3(R(-.8, .8), R(-.3, .6), R(.35, 1.2));
      const cell = [7, 7, 8, 8, 9][(rand() * 5) | 0];
      card(a.pos.clone(), y, z, R(.55, .95), cell, a, { cx: R(.1, .6), cy: R(-.3, .35), tint: [R(.92, 1.08), R(.88, 1.06), R(.85, 1.05)] });
    }
  } else { // winter plum: bare wood, snow, a little red
    for (const a of anchors) {
      const q = rand();
      if (q < .085) { const A = facing(a, 1); blossom(a, a.pos.clone().addScaledVector(A, R(.03, .07)), A, R(.15, .2), [10], 11, R(.2, .7), [1, 1, 1]); }
      else if (q < .2) card(a.pos.clone(), facing(a, .3).add(a.dir.clone().multiplyScalar(.6)), new V3(R(-.5, .5), R(-.5, .5), 1), R(.08, .13), 12, a, { shed: false, cx: .4, cy: 0 });
    }
  }
  return cards;
}

function buildSeason(si) {
  reseed();
  if (tree.mesh) { scene.remove(tree.mesh); tree.mesh.geometry.dispose(); }
  if (tree.foliage) { scene.remove(tree.foliage); tree.foliage.geometry.dispose(); tree.foliage.dispose(); }
  const s = seasons[si], { geometry, anchors } = growTree(si);
  barkUniforms.uBarkA.value.set(s.barkA); barkUniforms.uBarkB.value.set(s.barkB); barkUniforms.uLenticel.value = s.lenticel; barkUniforms.uSnow.value = s.snow;
  tree.mesh = new THREE.Mesh(geometry, barkMat); tree.mesh.frustumCulled = false; tree.mesh.userData.depth = barkDepthMat; scene.add(tree.mesh);

  const cards = dress(si, anchors), n = Math.max(1, cards.length);
  const geo = cardGeo.clone();
  const anchor = new Float32Array(n * 4), tc = new Float32Array(n * 4), misc = new Float32Array(n * 4), alive = new Float32Array(n).fill(1);
  const mesh = new THREE.InstancedMesh(geo, foliageMat, n);
  tree.shed = [];
  cards.forEach((c, i) => {
    mesh.setMatrixAt(i, c.m);
    anchor.set([c.anchor.pos.x, c.anchor.pos.y, c.anchor.pos.z, Math.max(.02, c.anchor.flex)], i * 4);
    tc.set([c.tint[0], c.tint[1], c.tint[2], c.cell], i * 4);
    misc.set([rand(), c.lb, c.cx, c.cy], i * 4);
    if (c.shed) tree.shed.push(i);
  });
  if (!cards.length) mesh.count = 0;
  geo.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(anchor, 4));
  geo.setAttribute('aTintCell', new THREE.InstancedBufferAttribute(tc, 4));
  geo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(misc, 4));
  const al = new THREE.InstancedBufferAttribute(alive, 1); al.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aAlive', al);
  mesh.frustumCulled = false; mesh.userData.depth = foliageDepthMat; mesh.instanceMatrix.needsUpdate = true;
  foliageMat.uniforms.uTrans.value = s.trans; foliageMat.uniforms.uSpec.value = s.spec;
  tree.foliage = mesh; tree.alive = al; tree.regrow = []; tree.growing = [];
  scene.add(mesh);
}

/* ───────────────────────── falling petals and leaves ───────────────────────── */
const FALL = 360;
const fall = (() => {
  const geo = cardGeo.clone();
  const tc = new Float32Array(FALL * 4), misc = new Float32Array(FALL * 4);
  geo.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(new Float32Array(FALL * 4), 4));
  const aTC = new THREE.InstancedBufferAttribute(tc, 4), aM = new THREE.InstancedBufferAttribute(misc, 4);
  aTC.setUsage(THREE.DynamicDrawUsage); aM.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aTintCell', aTC); geo.setAttribute('aMisc', aM);
  geo.setAttribute('aAlive', new THREE.InstancedBufferAttribute(new Float32Array(FALL).fill(1), 1));
  const mesh = new THREE.InstancedMesh(geo, fallMat, FALL);
  mesh.frustumCulled = false; mesh.userData.depth = foliageDepthMat; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const parts = Array.from({ length: FALL }, () => ({ on: false, p: new V3(), v: new V3(), q: new THREE.Quaternion(), ax: new V3(), spin: 0, s: 1, ph: 0, grav: 1, age: 0 }));
  for (let i = 0; i < FALL; i++) { mesh.setMatrixAt(i, zero); misc[i * 4 + 1] = -1; }
  scene.add(mesh);
  return { mesh, parts, tc, misc, aTC, aM, zero, next: 0 };
})();
const _m = new THREE.Matrix4(), _p = new V3(), _q = new THREE.Quaternion(), _sc = new V3(), _dq = new THREE.Quaternion(), _one = new V3();

function release(idx, vx = 0, vy = 0) {
  const f = tree.foliage; if (!f || tree.alive.array[idx] < 1) return;
  let slot = -1;
  for (let k = 0; k < FALL; k++) { const j = (fall.next + k) % FALL; if (!fall.parts[j].on) { slot = j; break; } }
  if (slot < 0) return; fall.next = slot + 1;
  f.getMatrixAt(idx, _m); _m.decompose(_p, _q, _sc);
  const src = f.geometry.attributes, pt = fall.parts[slot];
  pt.on = true; pt.age = 0; pt.p.copy(_p); pt.q.copy(_q); pt.s = _sc.x; pt.ph = rand() * TAU; pt.grav = seasons[current].grav * R(.8, 1.2);
  pt.v.set(vx + R(-.2, .1), vy + R(-.1, .1), R(0, .35)); pt.ax.set(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(); pt.spin = R(1.2, 3.4) * (rand() < .5 ? -1 : 1);
  for (let k = 0; k < 4; k++) { fall.tc[slot * 4 + k] = src.aTintCell.array[idx * 4 + k]; fall.misc[slot * 4 + k] = src.aMisc.array[idx * 4 + k]; }
  fall.misc[slot * 4 + 1] = -1; fall.aTC.needsUpdate = true; fall.aM.needsUpdate = true;
  fallMat.uniforms.uTrans.value = foliageMat.uniforms.uTrans.value; fallMat.uniforms.uSpec.value = foliageMat.uniforms.uSpec.value;
  tree.alive.array[idx] = 0; tree.alive.needsUpdate = true;
  tree.regrow.push({ idx, at: time + (current === 2 ? R(26, 48) : R(7, 16)) });
}

function updateFall(dt) {
  const wind = U.uWindF.value;
  for (let i = 0; i < FALL; i++) {
    const pt = fall.parts[i]; if (!pt.on) continue;
    if (dt > 0) {
      pt.age += dt; pt.ph += dt * (2.2 + Math.abs(pt.spin) * .5);
      const f = puffAt(pt.p.x, pt.p.y), g = f.e, gx = f.x, gy = f.y;
      const breeze = wind * (-.55 - .35 * Math.sin(time * .6 + pt.p.y * .5) - .2 * Math.sin(time * 1.7 + pt.p.x));
      pt.v.x += (breeze - pt.v.x * .9 + Math.cos(pt.ph) * .9 + gx * 2.2) * dt;
      pt.v.y += (-pt.grav * (1 - .35 * Math.abs(Math.sin(pt.ph))) - pt.v.y * 1.15 + gy * 2) * dt;
      pt.v.z += (Math.sin(time * .7 + pt.ph * .3) * .25 + .06 - pt.v.z * .6 + g * .6) * dt;
      pt.p.addScaledVector(pt.v, dt);
      if (pt.p.z < WALL_Z + .12) { pt.p.z = WALL_Z + .12; pt.v.z = Math.abs(pt.v.z) * .3; }
      pt.ax.x += Math.sin(pt.ph) * dt * .8; pt.ax.z += Math.cos(pt.ph * .7) * dt * .8; pt.ax.normalize();
      _dq.setFromAxisAngle(pt.ax, pt.spin * dt * (1 + g * 2)); pt.q.premultiply(_dq);
      if (pt.p.y < view.cy - view.halfH - 1.5 || Math.abs(pt.p.x - view.cx) > view.halfW + 4 || pt.age > 40) { pt.on = false; fall.mesh.setMatrixAt(i, fall.zero); continue; }
    }
    _one.setScalar(pt.s); _m.compose(pt.p, pt.q, _one); fall.mesh.setMatrixAt(i, _m);
  }
  fall.mesh.instanceMatrix.needsUpdate = true;
}

/* ───────────────────────── air: snow and sunlit dust ───────────────────────── */
function makePoints(count, frag, extra, blending) {
  const g = new THREE.BufferGeometry(), seed = new Float32Array(count * 4);
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...shared('uTime', 'uWindF', 'uSunDir', 'uSunCol', 'uSkyCol', 'uLightVP', 'uShadowExtent', 'uGobo', 'uFocus', 'uAperture', 'uPx'), uAmount: { value: 0 }, uCentre: { value: new THREE.Vector2() } },
    transparent: true, depthWrite: false, blending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime,uWindF,uFocus,uAperture,uPx,uAmount,uShadowExtent; uniform vec2 uCentre; uniform mat4 uLightVP; uniform vec4 uGobo;
      varying float vA; varying float vLit; varying float vSoft;
      ${NOISE}
      float gobo(vec2 g){vec2 q=g*uGobo.z+vec2(uTime*.018*uWindF,0.);float n=fbm(q+.42*vec2(fbm3(q*2.1+vec2(3.,uTime*.05*uWindF)),fbm3(q*2.1-vec2(7.,uTime*.04*uWindF))));return mix(1.,smoothstep(.3,.66,n),uGobo.y);}
      void main(){
        ${extra}
        vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float dist=-mv.z, sharp=size*uPx/dist, coc=abs(1./uFocus-1./dist)*uAperture*1.6;
        float ps=max(sharp+coc,1.6);
        gl_PointSize=ps; vSoft=clamp(coc/ps,0.,1.);
        vA=alpha*uAmount*min(1.,(sharp*sharp+1.)/(ps*ps))*smoothstep(.6,2.5,dist);
        vec4 lp=uLightVP*vec4(p,1.); vLit=gobo(lp.xy*uShadowExtent*.5);
      }`,
    fragmentShader: /* glsl */`
      varying float vA,vLit,vSoft; uniform vec3 uSunCol,uSkyCol;
      void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(mix(.25,.82,vSoft),1.,r))*vA;${frag}}`
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts); return pts;
}
const snow = makePoints(900, `gl_FragColor=vec4(uSkyCol*2.1+uSunCol*.8*vLit,a);`, /* glsl */`
  vec3 rg=vec3(34.,18.,10.5);
  float sp=.55+aSeed.w*.75;
  vec3 p=aSeed.xyz*rg;
  p.y=mod(p.y-uTime*sp*.72,rg.y);
  p.x=mod(p.x-uTime*uWindF*(.35+.25*aSeed.w)+sin(uTime*.7+aSeed.w*40.)*.35+sin(uTime*.23+aSeed.z*20.)*.6,rg.x);
  p+=vec3(uCentre.x-rg.x*.5,uCentre.y-rg.y*.5,-1.25);
  float size=.04+.05*aSeed.w, alpha=.95;`, THREE.NormalBlending);
const dust = makePoints(260, `gl_FragColor=vec4(uSunCol*vLit*a,1.);`, /* glsl */`
  vec3 rg=vec3(30.,16.,8.);
  vec3 p=aSeed.xyz*rg;
  p.y=mod(p.y+uTime*(.03+.05*aSeed.w)+sin(uTime*.31+aSeed.w*30.)*.25,rg.y);
  p.x=mod(p.x-uTime*uWindF*(.05+.08*aSeed.z)+sin(uTime*.2+aSeed.w*50.)*.4,rg.x);
  p+=vec3(uCentre.x-rg.x*.5,uCentre.y-rg.y*.5,-1.2);
  float size=.012+.012*aSeed.w, alpha=.5*(.55+.45*sin(uTime*(1.+aSeed.w*2.)+aSeed.z*40.));`, THREE.AdditiveBlending);
dust.material.uniforms.uAmount.value = 1;

/* ───────────────────────── post: depth of field, bloom, film ───────────────────────── */
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(quad);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const QV = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const post = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: QV, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

const dofMat = post(/* glsl */`
  varying vec2 vUv; uniform sampler2D tColor,tDepth; uniform vec2 uRes; uniform float uNear,uFar,uFocus,uAperture,uMaxCoc;
  float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
  float vz(float d){float z=d*2.-1.;return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
  float coc(float z){return clamp(abs(1./uFocus-1./z)*uAperture,0.,uMaxCoc);}
  void main(){
    float z0=vz(texture2D(tDepth,vUv).r), c0=coc(z0);
    vec3 acc=texture2D(tColor,vUv).rgb; float ws=1.;
    float phi=ign(gl_FragCoord.xy)*6.2831853;
    for(int i=0;i<28;i++){
      float fi=float(i); float r=sqrt((fi+.5)/28.); float th=fi*2.39996323+phi;
      vec2 o=r*vec2(cos(th),sin(th))*uMaxCoc; float dist=length(o);
      vec2 uv=vUv+o/uRes;
      float zs=vz(texture2D(tDepth,uv).r), cs=coc(zs);
      if(zs>z0+.4)cs=min(cs,c0);
      float w=smoothstep(dist-1.,dist+1.,cs);
      acc+=texture2D(tColor,uv).rgb*w; ws+=w;
    }
    gl_FragColor=vec4(acc/ws,1.);
  }`, { tColor: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uNear: { value: camera.near }, uFar: { value: camera.far }, uFocus: U.uFocus, uAperture: U.uAperture, uMaxCoc: { value: 14 } });

const brightMat = post(/* glsl */`
  varying vec2 vUv; uniform sampler2D tColor; uniform vec2 uTexel;
  void main(){
    vec3 c=(texture2D(tColor,vUv+uTexel*vec2(-.5,-.5)).rgb+texture2D(tColor,vUv+uTexel*vec2(.5,-.5)).rgb+texture2D(tColor,vUv+uTexel*vec2(-.5,.5)).rgb+texture2D(tColor,vUv+uTexel*vec2(.5,.5)).rgb)*.25;
    float l=max(c.r,max(c.g,c.b)); float k=clamp((l-1.05)/.6,0.,1.); k=k*k*(3.-2.*k);
    gl_FragColor=vec4(min(c,vec3(8.))*k,1.);
  }`, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } });
const downMat = post(/* glsl */`
  varying vec2 vUv; uniform sampler2D tColor; uniform vec2 uTexel;
  void main(){
    vec3 c=texture2D(tColor,vUv).rgb*4.;
    c+=texture2D(tColor,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tColor,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(tColor,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tColor,vUv+uTexel*vec2(1.,1.)).rgb;
    gl_FragColor=vec4(c/8.,1.);
  }`, { tColor: { value: null }, uTexel: { value: new THREE.Vector2() } });
const upMat = post(/* glsl */`
  varying vec2 vUv; uniform sampler2D tLow,tHigh; uniform vec2 uTexel;
  void main(){
    vec3 c=texture2D(tLow,vUv+uTexel*vec2(-2.,0.)).rgb+texture2D(tLow,vUv+uTexel*vec2(2.,0.)).rgb+texture2D(tLow,vUv+uTexel*vec2(0.,-2.)).rgb+texture2D(tLow,vUv+uTexel*vec2(0.,2.)).rgb;
    c+=(texture2D(tLow,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(tLow,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(tLow,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(tLow,vUv+uTexel*vec2(1.,1.)).rgb)*2.;
    gl_FragColor=vec4(texture2D(tHigh,vUv).rgb+c/12.,1.);
  }`, { tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new THREE.Vector2() } });
const finalMat = post(/* glsl */`
  varying vec2 vUv; uniform sampler2D tColor,tBloom; uniform float uTime,uExposure,uBloom,uAspect; uniform vec3 uShadowTint,uHighTint;
  float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
  vec3 fit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
  vec3 aces(vec3 c){
    c=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777)*c; c=fit(c);
    c=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602)*c; return clamp(c,0.,1.);
  }
  void main(){
    vec2 d=vUv-.5; float r2=dot(d*vec2(uAspect,1.),d*vec2(uAspect,1.));
    vec2 ca=d*r2*.006;
    vec3 c=vec3(texture2D(tColor,vUv+ca).r,texture2D(tColor,vUv).g,texture2D(tColor,vUv-ca).b);
    c+=texture2D(tBloom,vUv).rgb*uBloom;
    c*=uExposure*(1.-.42*smoothstep(.12,1.05,r2));
    c=aces(c);
    float l=dot(c,vec3(.2126,.7152,.0722));
    c*=mix(uShadowTint,uHighTint,smoothstep(0.,.75,l));
    c=mix(vec3(l),c,1.06);
    c=mix(c*12.92,1.055*pow(max(c,vec3(1e-5)),vec3(1./2.4))-.055,step(.0031308,c));
    float g=hash12(gl_FragCoord.xy+fract(uTime*7.31)*191.)+hash12(gl_FragCoord.xy*1.37+fract(uTime*3.17)*83.)-1.;
    c+=g*.02*(1.-.5*l);
    gl_FragColor=vec4(c,1.);
  }`, { tColor: { value: null }, tBloom: { value: null }, uTime: { value: 0 }, uExposure: { value: 1.14 }, uBloom: { value: .32 }, uAspect: { value: 1 }, uShadowTint: { value: new V3(.985, 1., 1.03) }, uHighTint: { value: new V3(1.02, 1., .975) } });

let rt = null;
function buildTargets(w, h) {
  if (rt) { rt.scene.depthTexture.dispose(); rt.scene.dispose(); rt.dof.dispose(); rt.down.forEach(t => t.dispose()); rt.up.forEach(t => t.dispose()); }
  const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: MSAA, depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType) });
  const down = [], up = [];
  let bw = w, bh = h;
  for (let i = 0; i < 6; i++) { bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); down.push(new THREE.WebGLRenderTarget(bw, bh, hf)); if (i < 5) up.push(new THREE.WebGLRenderTarget(bw, bh, hf)); }
  rt = { scene: sceneRT, dof: new THREE.WebGLRenderTarget(w, h, hf), down, up, w, h };
}
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); }

/* ───────────────────────── layout ───────────────────────── */
let dpr = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  const bw = Math.max(2, Math.floor(w * dpr)), bh = Math.max(2, Math.floor(h * dpr));
  buildTargets(bw, bh);
  camera.aspect = aspect;
  // narrow screens step back and look at the branch rather than the empty wall
  view.dist = clamp(15 * Math.pow(1.6 / aspect, .78), 15, 27);
  const k = clamp((1.45 - aspect) / .9, 0, 1), e = k * k * (3 - 2 * k);
  view.cx = lerp(0, 2.6, e); view.cy = lerp(0, 1.5, e);
  view.halfH = Math.tan(camera.fov * Math.PI / 360) * view.dist; view.halfW = view.halfH * aspect;
  camera.updateProjectionMatrix();
  U.uFocus.value = view.dist; U.uPx.value = bh / (2 * Math.tan(camera.fov * Math.PI / 360));
  U.uAperture.value = 190 * bh / 1080 * (view.dist / 15); dofMat.uniforms.uMaxCoc.value = 14 * bh / 1080;
  dofMat.uniforms.uRes.value.set(bw, bh); finalMat.uniforms.uAspect.value = aspect;
  snow.material.uniforms.uCentre.value.set(view.cx, view.cy); dust.material.uniforms.uCentre.value.set(view.cx, view.cy);
}

/* ───────────────────────── light ───────────────────────── */
const sunKeys = [[1.0, .80, .58, 2.55], [1.0, .965, .90, 3.0], [1.0, .50, .22, 2.9]];
const skyKeys = [[.58, .70, .88, .40], [.70, .78, .88, .47], [.50, .43, .74, .33]];
const key = (keys, t) => { const a = t < .5 ? keys[0] : keys[1], b = t < .5 ? keys[1] : keys[2], f = t < .5 ? t * 2 : (t - .5) * 2, e = f * f * (3 - 2 * f); return a.map((v, i) => lerp(v, b[i], e)); };
const light = { t: .65, target: .65 };
const sunDir = new V3();
function applyLight() {
  const t = light.t, s = seasons[current];
  const tt = .1 + .9 * t;
  sunDir.set(lerp(-.82, .92, t), .15 + .8 * Math.sin(Math.PI * tt), .46).normalize();
  U.uSunDir.value.copy(sunDir);
  const sc = key(sunKeys, t), kc = key(skyKeys, t);
  tintS.lerp(_v.set(...s.sunTint), .04); tintK.lerp(_v.set(...s.skyTint), .04);
  U.uSunCol.value.setRGB(sc[0] * sc[3] * tintS.x, sc[1] * sc[3] * tintS.y, sc[2] * sc[3] * tintS.z);
  U.uSkyCol.value.setRGB(kc[0] * kc[3] * tintK.x, kc[1] * kc[3] * tintK.y, kc[2] * kc[3] * tintK.z);
  U.uSunSize.value = lerp(.026, .04, Math.abs(t - .5) * 2);
  lightCam.position.copy(lightCenter).addScaledVector(sunDir, 20); lightCam.up.set(0, 1, 0); lightCam.lookAt(lightCenter);
  lightCam.updateMatrixWorld(); lightCam.updateProjectionMatrix();
  U.uLightVP.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse);
}
const _v2 = new THREE.Vector2();
const tintS = new V3(1, 1, 1), tintK = new V3(1, 1, 1), _v = new V3(), _c = new THREE.Color();

/* ───────────────────────── state and interaction ───────────────────────── */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 0, pending = -1, phase = 'grow', growT = 0, time = 0, last = performance.now(), paused = reduced, windOn = true, shedAcc = 0;
const pointer = { ndc: new THREE.Vector2(), world: new V3(100, 100, 0), prev: new V3(), has: false, energy: 0, vel: new THREE.Vector2(), sway: new THREE.Vector2(), swayV: new THREE.Vector2(), last: 0, active: false };
const puffs = { next: 0, last: 0 }, _pf = { x: 0, y: 0, e: 0 };
function emitPuff(x, y, strength) {
  const i = puffs.next; puffs.next = (i + 1) % 4; puffs.last = performance.now();
  U.uPuffA.value[i].set(x, y, 0, 0); U.uPuffB.value[i].set(time, strength, 0, 0);
}
function puffAt(x, y) { // mirrors stirAt() in the shader
  let e = 0;
  for (let i = 0; i < 4; i++) {
    const A = U.uPuffA.value[i], B = U.uPuffB.value[i], tau = time - B.x;
    if (B.y <= 0 || tau <= 0 || tau > 9) continue;
    const qx = x - (A.x - .8 * tau), qy = y - (A.y + .08 * tau), rr = 1.7 + .45 * tau;
    e += B.y * Math.exp(-(qx * qx + qy * qy) / (rr * rr)) * Math.min(1, tau / .7) * Math.exp(-tau * .62);
  }
  e = Math.min(e, 1.2); _pf.x = -e * .5; _pf.y = e * .04; _pf.e = e; return _pf;
}
const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new V3(0, 0, 1), 0), hit = new V3();

function setText(i) {
  const s = seasons[i];
  $('#char').textContent = s.char; $('#english').textContent = s.name; $('#subtitle').textContent = s.sub; $('#poem').innerHTML = s.poem;
}
function selectSeason(i) {
  document.querySelectorAll('[data-season]').forEach((b, j) => { b.classList.toggle('active', j === i); b.setAttribute('aria-pressed', j === i); });
  pending = i; phase = 'retract';
  const ui = $('#ui'); ui.classList.add('swapping');
  clearTimeout(selectSeason.t); selectSeason.t = setTimeout(() => { setText(i); ui.classList.remove('swapping'); }, 560);
}
function onMove(e) {
  if (e.target.closest && e.target.closest('button,input,#info,a')) return;
  pointer.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
  raycaster.setFromCamera(pointer.ndc, camera);
  if (!raycaster.ray.intersectPlane(plane, hit)) return;
  const now = performance.now(), el = Math.max(.016, (now - pointer.last) / 1000);
  if (pointer.has && el < .25) {
    const vx = (hit.x - pointer.world.x) / el, vy = (hit.y - pointer.world.y) / el;
    pointer.vel.x = lerp(pointer.vel.x, vx, .4); pointer.vel.y = lerp(pointer.vel.y, vy, .4);
    const sp = pointer.vel.length();
    if (!paused && sp > .8 && now - puffs.last > 260) emitPuff(hit.x, hit.y, clamp(.3 + sp / 30, .3, .6));
  }
  pointer.world.copy(hit); pointer.has = true; pointer.last = now; pointer.active = true;
}
addEventListener('pointermove', onMove);
addEventListener('pointerdown', e => { onMove(e); if (!(e.target.closest && e.target.closest('button,input,#info,a'))) { if (pointer.has && !paused) emitPuff(pointer.world.x, pointer.world.y, 1); } });
document.addEventListener('pointerleave', () => { pointer.active = false; });
addEventListener('pointercancel', () => { pointer.active = false; });
addEventListener('resize', resize);

document.querySelectorAll('[data-season]').forEach(b => b.onclick = () => selectSeason(+b.dataset.season));
$('#light').oninput = e => { light.target = e.target.value / 100; const t = light.target; $('#lightname').textContent = t < .33 ? 'Morning' : t < .75 ? 'Afternoon' : 'Dusk'; };
const showPause = () => { $('#pauseicon').setAttribute('d', paused ? 'M2 0l7 5-7 5z' : 'M1 0h3v10H1zM6 0h3v10H6z'); $('#pause').setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation'); };
$('#pause').onclick = () => { paused = !paused; showPause(); };
$('#wind').onclick = () => { windOn = !windOn; $('#wind span').textContent = windOn ? 'On' : 'Off'; $('#wind').setAttribute('aria-pressed', windOn); };
const toggleInfo = v => { $('#info').hidden = !v; $('#about').setAttribute('aria-expanded', v); };
$('#about').onclick = () => toggleInfo($('#info').hidden); $('#close').onclick = () => toggleInfo(false);
addEventListener('keydown', e => { if (e.key === 'Escape') toggleInfo(false); });

/* ───────────────────────── frame ───────────────────────── */
let fpsAcc = 0, fpsN = 0, warm = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min((now - last) / 1000, .1); last = now;
  const rdt = Math.min(raw, .05), dt = paused ? 0 : rdt;
  time += dt; U.uTime.value = time; finalMat.uniforms.uTime.value = now / 1000;

  // adaptive resolution: hold the frame rate rather than the pixel count
  if (document.visibilityState === 'visible' && ++warm > 90) { fpsAcc += raw; if (++fpsN >= 50) { const avg = fpsAcc / fpsN; fpsAcc = fpsN = 0; if (avg > .027 && dpr > 1) { dpr = Math.max(1, dpr - .25); resize(); warm = 30; } } }

  // season hand-over: retract, rebuild, grow
  if (phase === 'retract') {
    growT -= rdt / .7; if (growT <= 0) { growT = 0; current = pending; buildSeason(current); phase = 'grow'; }
  } else if (phase === 'grow') { growT += rdt / (reduced ? 1.2 : 4.2); if (growT >= 1) { growT = 1; phase = 'idle'; } }
  U.uGrow.value = phase === 'retract' ? growT * growT : 1 - Math.pow(1 - growT, 2.4);

  const s = seasons[current], k = 1 - Math.exp(-rdt * 2.2);
  U.uWallCol.value.lerp(_c.set(s.wall), k); U.uBounceCol.value.lerp(_c.set(s.bounce), k);
  U.uGobo.value.y = lerp(U.uGobo.value.y, s.dapple, k);
  snow.material.uniforms.uAmount.value = lerp(snow.material.uniforms.uAmount.value, s.snow, k * .6);
  snow.visible = snow.material.uniforms.uAmount.value > .01;
  U.uWindF.value = lerp(U.uWindF.value, windOn ? 1 : 0, 1 - Math.exp(-rdt * 1.5));
  light.t = lerp(light.t, light.target, 1 - Math.exp(-rdt * 5));
  applyLight();

  pointer.vel.multiplyScalar(Math.exp(-rdt * 3));

  // shedding
  if (dt > 0 && phase === 'idle' && tree.shed.length) {
    shedAcc += dt * s.shed * (.25 + .75 * U.uWindF.value);
    while (shedAcc > 1) { shedAcc -= 1; release(tree.shed[(Math.random() * tree.shed.length) | 0]); }
    if (performance.now() - puffs.last < 5000) {
      const a = tree.foliage.geometry.attributes.aAnchor.array, rate = [1.6, .25, 1.5, .8][current];
      for (let tries = 0; tries < 60; tries++) {
        const idx = tree.shed[(Math.random() * tree.shed.length) | 0], f = puffAt(a[idx * 4], a[idx * 4 + 1]);
        if (f.e > .12 && Math.random() < f.e * dt * rate) release(idx, f.x, f.y);
      }
    }
    for (let i = tree.regrow.length - 1; i >= 0; i--) if (time > tree.regrow[i].at) { tree.growing.push({ idx: tree.regrow[i].idx, t: 0 }); tree.regrow.splice(i, 1); }
    for (let i = tree.growing.length - 1; i >= 0; i--) { const g = tree.growing[i]; g.t = Math.min(1, g.t + dt / 2.5); tree.alive.array[g.idx] = g.t; if (g.t >= 1) tree.growing.splice(i, 1); tree.alive.needsUpdate = true; }
  }
  updateFall(dt);

  // camera: a few centimetres of parallax separates the branch from its shadow
  const tpx = pointer.active ? pointer.ndc.x : 0, tpy = pointer.active ? pointer.ndc.y : 0, ck = 1 - Math.exp(-rdt * .9);
  view.px = lerp(view.px, tpx, ck); view.py = lerp(view.py, tpy, ck);
  const breathe = paused ? 0 : 1;
  camera.position.set(view.cx + view.px * .2 + Math.sin(time * .13) * .06 * breathe, view.cy + view.py * .1 + Math.cos(time * .11) * .04 * breathe, view.dist);
  camera.lookAt(view.cx + view.px * .05, view.cy + view.py * .03, 0);

  // 1. sun's view
  const casters = [tree.mesh, tree.foliage, fall.mesh];
  wall.visible = false; const sv = snow.visible; snow.visible = false; dust.visible = false;
  for (const m of casters) { m.userData.main = m.material; m.material = m.userData.depth; }
  renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(scene, lightCam);
  for (const m of casters) m.material = m.userData.main;
  wall.visible = true; snow.visible = sv; dust.visible = true;
  // 2. the scene, in linear light
  renderer.setRenderTarget(rt.scene); renderer.render(scene, camera);
  // 3. lens
  dofMat.uniforms.tColor.value = rt.scene.texture; dofMat.uniforms.tDepth.value = rt.scene.depthTexture; pass(dofMat, rt.dof);
  brightMat.uniforms.tColor.value = rt.dof.texture; brightMat.uniforms.uTexel.value.set(1 / rt.w, 1 / rt.h); pass(brightMat, rt.down[0]);
  for (let i = 1; i < rt.down.length; i++) { downMat.uniforms.tColor.value = rt.down[i - 1].texture; downMat.uniforms.uTexel.value.set(1 / rt.down[i - 1].width, 1 / rt.down[i - 1].height); pass(downMat, rt.down[i]); }
  let low = rt.down[rt.down.length - 1];
  for (let i = rt.up.length - 1; i >= 0; i--) { upMat.uniforms.tLow.value = low.texture; upMat.uniforms.tHigh.value = rt.down[i].texture; upMat.uniforms.uTexel.value.set(1 / low.width, 1 / low.height); pass(upMat, rt.up[i]); low = rt.up[i]; }
  finalMat.uniforms.tColor.value = rt.dof.texture; finalMat.uniforms.tBloom.value = low.texture; pass(finalMat, null);
}

/* ───────────────────────── start ───────────────────────── */
resize(); applyLight(); setText(0); buildSeason(0); showPause();
$('#light').dispatchEvent(new Event('input')); light.t = light.target;
requestAnimationFrame(t => { last = t; frame(t); $('#loading').classList.add('done'); });
window.__study = { seasons, selectSeason, light, U, finalMat, get phase() { return phase; }, set growT(v) { growT = v; }, tree, release };
