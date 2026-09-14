import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const toRad=d=>d*Math.PI/180;
const haversine=(a,b)=>{const R=6371000,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
const fmtDist=m=>m<1000?`${m.toFixed(0)} m`:`${(m/1000).toFixed(2)} km`;
const fmtTime=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;

function routeMetrics(points){let d=0;const cumulative=[0];for(let i=1;i<points.length;i++){d+=haversine(points[i-1],points[i]);cumulative.push(d)}return{distance:d,cumulative}}
function interpolateRoute(points,cumulative,d){if(!points.length)return null;if(points.length===1)return points[0];d=clamp(d,0,cumulative.at(-1));let i=1;while(i<cumulative.length&&cumulative[i]<d)i++;const lo=cumulative[i-1],hi=cumulative[i],t=(d-lo)/Math.max(1,hi-lo),a=points[i-1],b=points[i];return{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t,speedLimit:a.speedLimit??b.speedLimit,radius:a.radius??b.radius}}
function resampleRoute(points,spacing=250){const{distance,cumulative}=routeMetrics(points);if(distance<1)return points;const out=[];for(let d=0;d<distance;d+=spacing)out.push(interpolateRoute(points,cumulative,d));out.push(points.at(-1));return out}

const vecLen=v=>Math.hypot(v.x,v.y);
const norm=v=>{const m=vecLen(v)||1;return{x:v.x/m,y:v.y/m}};
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
function localProject(p,origin){const lat0=toRad(origin.lat),mLat=111132.92,mLon=111412.84*Math.cos(lat0);return{x:(p.lng-origin.lng)*mLon,y:(p.lat-origin.lat)*mLat}}
function localUnproject(v,origin){const lat0=toRad(origin.lat),mLat=111132.92,mLon=111412.84*Math.cos(lat0);return{lat:origin.lat+v.y/mLat,lng:origin.lng+v.x/mLon}}

// Standard-gauge passenger railway approximation using combined cant + cant deficiency.
// R = gauge * V^2 / (127 * effective cant), V in km/h, dimensions in mm.
function radiusForSpeed(speed,mode){const gauge=1435;const effectiveCant=mode==='subway'?190:250;const raw=gauge*speed*speed/(127*effectiveCant);return Math.max(mode==='subway'?75:150,raw)}
function generateRailGeometry(guide,speedZones,mode){
  if(guide.length<2)return{track:guide,curves:[]};
  const speeds=Array.from({length:guide.length-1},(_,i)=>clamp(Number(speedZones[i]??(mode==='subway'?80:120)),15,350));
  const cuts=Array(guide.length).fill(null).map(()=>({in:null,out:null,curve:null}));
  const curves=[];
  for(let i=1;i<guide.length-1;i++){
    const o=guide[i],A=localProject(guide[i-1],o),V={x:0,y:0},B=localProject(guide[i+1],o);
    const u1=norm({x:V.x-A.x,y:V.y-A.y}),u2=norm({x:B.x-V.x,y:B.y-V.y});
    const delta=Math.acos(clamp(dot(u1,u2),-1,1));
    if(delta<toRad(1.2)||Math.PI-delta<toRad(1))continue;
    const requested=radiusForSpeed(Math.min(speeds[i-1],speeds[i]),mode);
    const l1=vecLen(A),l2=vecLen(B),tanHalf=Math.tan(delta/2);
    let tangent=requested*tanHalf;
    const maxT=.44*Math.min(l1,l2);
    tangent=Math.min(tangent,maxT);
    if(tangent<2)continue;
    const radius=tangent/Math.max(.0001,tanHalf),turn=Math.sign(cross(u1,u2))||1;
    const p1={x:-u1.x*tangent,y:-u1.y*tangent},p2={x:u2.x*tangent,y:u2.y*tangent};
    const left={x:-u1.y,y:u1.x};
    const c={x:p1.x+left.x*radius*turn,y:p1.y+left.y*radius*turn};
    cuts[i]={in:localUnproject(p1,o),out:localUnproject(p2,o),curve:{center:c,origin:o,p1,p2,radius,requested,turn,speed:Math.min(speeds[i-1],speeds[i]),delta}};
    curves.push({vertex:i,radius,requested,speed:Math.min(speeds[i-1],speeds[i]),constrained:radius<requested*.98,delta:delta*180/Math.PI});
  }
  const track=[];
  const push=(p,meta={})=>{if(!p)return;const q={...p,...meta};if(!track.length||haversine(track.at(-1),q)>.25)track.push(q)};
  push(guide[0],{speedLimit:speeds[0],radius:Infinity});
  for(let seg=0;seg<guide.length-1;seg++){
    const start=seg===0?guide[0]:(cuts[seg]?.out||guide[seg]);
    const end=cuts[seg+1]?.in||guide[seg+1];
    const segLen=haversine(start,end),n=Math.max(1,Math.ceil(segLen/35));
    for(let k=1;k<=n;k++){const t=k/n;push({lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t},{speedLimit:speeds[seg],radius:Infinity})}
    const cv=cuts[seg+1]?.curve;
    if(cv){
      let a1=Math.atan2(cv.p1.y-cv.center.y,cv.p1.x-cv.center.x),a2=Math.atan2(cv.p2.y-cv.center.y,cv.p2.x-cv.center.x);
      if(cv.turn>0){while(a2<=a1)a2+=Math.PI*2}else{while(a2>=a1)a2-=Math.PI*2}
      const arcLen=Math.abs(a2-a1)*cv.radius,nArc=Math.max(3,Math.ceil(arcLen/18));
      for(let k=1;k<=nArc;k++){const t=k/nArc,a=a1+(a2-a1)*t,p={x:cv.center.x+Math.cos(a)*cv.radius,y:cv.center.y+Math.sin(a)*cv.radius};push(localUnproject(p,cv.origin),{speedLimit:cv.speed,radius:cv.radius})}
    }
  }
  return{track,curves};
}
function speedLimitAt(track,cumulative,d){if(track.length<2)return 0;d=clamp(d,0,cumulative.at(-1));let i=1;while(i<cumulative.length&&cumulative[i]<d)i++;return track[Math.max(0,i-1)]?.speedLimit??track[i]?.speedLimit??120}
function nearestTrackPoint(track,latlng){const met=routeMetrics(track);let bestI=0,best=Infinity;for(let i=0;i<track.length;i++){const d=haversine(track[i],latlng);if(d<best){best=d;bestI=i}}return{point:track[bestI],d:met.cumulative[bestI],offset:best}}

function App(){
  const[phase,setPhase]=useState('route'),[mode,setMode]=useState('surface'),[points,setPoints]=useState([]),[stations,setStations]=useState([]),[tool,setTool]=useState('track'),[terrain,setTerrain]=useState([]),[terrainStatus,setTerrainStatus]=useState(''),[speedZones,setSpeedZones]=useState([]);
  const[train,setTrain]=useState({name:'WRX-8',kind:'electric',powerKW:5200,maxTEKN:320,maxSpeed:160,locoMassT:88,carCount:6,carMassT:42,seatsPerCar:76,standingPerCar:34,paxLoad:.78,serviceBrakeKN:430,emergencyBrakeKN:650,regenPct:55,davisA:1.6,davisB:.025,davisC:.00055,adhesion:.29});
  useEffect(()=>setSpeedZones(z=>Array.from({length:Math.max(0,points.length-1)},(_,i)=>z[i]??(mode==='subway'?80:120))),[points.length,mode]);
  const geometry=useMemo(()=>generateRailGeometry(points,speedZones,mode),[points,speedZones,mode]);
  const track=geometry.track,metrics=useMemo(()=>routeMetrics(track),[track]);
  useEffect(()=>{if(track.length<2)return;setStations(ss=>ss.map(s=>{const n=nearestTrackPoint(track,s);return{...s,...n.point,d:n.d}}))},[track]);
  const paxCapacity=train.carCount*(train.seatsPerCar+train.standingPerCar),pax=Math.round(paxCapacity*train.paxLoad),paxMassT=pax*.075,tareMassT=train.locoMassT+train.carCount*train.carMassT,grossMassT=tareMassT+paxMassT,trainLengthM=21+train.carCount*24.5;
  async function fetchTerrain(){if(track.length<2)return;setTerrainStatus('Sampling real-world terrain…');try{const samples=resampleRoute(track,220);let all=[];for(let i=0;i<samples.length;i+=100){const batch=samples.slice(i,i+100),lats=batch.map(p=>p.lat.toFixed(5)).join(','),lons=batch.map(p=>p.lng.toFixed(5)).join(',');const r=await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`),j=await r.json();if(!j.elevation)throw new Error('Elevation unavailable');all=all.concat(batch.map((p,k)=>({...p,elev:j.elevation[k]})))}let d=0;const prof=all.map((p,i)=>{if(i)d+=haversine(all[i-1],p);return{...p,d}});setTerrain(prof);setTerrainStatus(`Terrain loaded • ${prof.length} samples`)}catch(e){setTerrainStatus('Terrain lookup failed — simulation will use level track.');setTerrain([])}}
  return <div className="app"><header><div><b>WORLDRAIL</b><span>SIMULATOR</span></div><div className="steps"><i className={phase==='route'?'on':''}>1 Route</i><i className={phase==='train'?'on':''}>2 Train</i><i className={phase==='drive'?'on':''}>3 Drive</i></div></header>
    {phase==='route'&&<RouteDesigner {...{points,setPoints,stations,setStations,tool,setTool,mode,setMode,metrics,fetchTerrain,terrainStatus,speedZones,setSpeedZones,track,curves:geometry.curves,onNext:()=>setPhase('train')}}/>}
    {phase==='train'&&<TrainDesigner {...{train,setTrain,paxCapacity,pax,paxMassT,tareMassT,grossMassT,trainLengthM,mode,metrics,onBack:()=>setPhase('route'),onDrive:()=>setPhase('drive')}}/>}
    {phase==='drive'&&<DriveSim {...{points:track,stations,terrain,train,grossMassT,pax,mode,onExit:()=>setPhase('train')}}/>}
  </div>
}

function RouteDesigner({points,setPoints,stations,setStations,tool,setTool,mode,setMode,metrics,fetchTerrain,terrainStatus,speedZones,setSpeedZones,track,curves,onNext}){
  const mapEl=useRef(null),mapRef=useRef(null),layers=useRef({items:[]}),toolRef=useRef(tool),trackRef=useRef(track);
  useEffect(()=>{toolRef.current=tool},[tool]);useEffect(()=>{trackRef.current=track},[track]);
  useEffect(()=>{const map=L.map(mapEl.current,{zoomControl:false,attributionControl:true}).setView([39.7684,-86.1581],12);mapRef.current=map;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);L.control.zoom({position:'bottomright'}).addTo(map);map.on('click',e=>{if(toolRef.current==='track')setPoints(p=>[...p,{lat:e.latlng.lat,lng:e.latlng.lng}]);else if(toolRef.current==='station'&&trackRef.current.length>=2){const n=nearestTrackPoint(trackRef.current,{lat:e.latlng.lat,lng:e.latlng.lng});setStations(s=>[...s,{id:crypto.randomUUID(),name:`Station ${s.length+1}`,d:n.d,...n.point}])}});return()=>map.remove()},[]);
  useEffect(()=>{const map=mapRef.current;if(!map)return;layers.current.items.forEach(x=>x.remove());layers.current.items=[];const add=x=>{layers.current.items.push(x);return x};if(points.length>1)add(L.polyline(points,{color:'#ffffff',weight:3,opacity:.35,dashArray:'8 10'}).addTo(map));if(track.length>1)add(L.polyline(track,{color:'#4cf0b7',weight:7,opacity:.97,lineCap:'round'}).addTo(map));points.forEach((p,i)=>add(L.circleMarker(p,{radius:i===0?7:5,color:'#fff',fillColor:'#18272b',fillOpacity:1,weight:2}).addTo(map)));stations.forEach(s=>{const icon=L.divIcon({className:'station-icon',html:'<div></div>',iconSize:[24,24],iconAnchor:[12,12]});add(L.marker([s.lat,s.lng],{icon}).bindTooltip(s.name,{permanent:false}).addTo(map))})},[points,stations,track]);
  const undo=()=>tool==='track'?setPoints(p=>p.slice(0,-1)):setStations(s=>s.slice(0,-1));
  const minR=curves.length?Math.min(...curves.map(c=>c.radius)):null,constrained=curves.filter(c=>c.constrained).length;
  return <main className="route-layout"><section className="map-card"><div ref={mapEl} className="map"/><div className="map-tools"><button className={tool==='track'?'selected':''} onClick={()=>setTool('track')}>✎ Guide</button><button className={tool==='station'?'selected':''} onClick={()=>setTool('station')}>◉ Station</button><button onClick={undo}>↶ Undo</button><button onClick={()=>{setPoints([]);setStations([])}}>⌫ Clear</button></div><div className="map-legend"><span><i className="guide-line"></i>guide</span><span><i className="rail-line"></i>engineered track</span></div></section>
    <aside className="panel route-panel"><h1>Engineer your railway</h1><p>Draw the <b>guide</b>. WorldRail converts it into tangent railway geometry. Set each segment's speed and the required curve radius is recalculated automatically.</p>
      <label>Infrastructure</label><div className="seg"><button className={mode==='surface'?'on':''} onClick={()=>setMode('surface')}>Above ground</button><button className={mode==='subway'?'on':''} onClick={()=>setMode('subway')}>Subway</button></div>
      <div className="statgrid"><div><small>Rail length</small><strong>{fmtDist(metrics.distance)}</strong></div><div><small>Curves</small><strong>{curves.length}</strong></div><div><small>Min radius</small><strong>{minR?`${minR.toFixed(0)} m`:'—'}</strong></div><div><small>Constrained</small><strong>{constrained}</strong></div></div>
      <h3>Segment speed limits</h3><div className="speed-zones">{speedZones.length?speedZones.map((v,i)=><div key={i}><span>{i+1}</span><b>{points[i]&&points[i+1]?fmtDist(haversine(points[i],points[i+1])):'Segment'}</b><input type="number" inputMode="numeric" min="15" max="350" step="5" value={v} onChange={e=>setSpeedZones(z=>z.map((x,k)=>k===i?clamp(+e.target.value,15,350):x))}/><em>km/h</em></div>):<small>Tap the map twice to create your first guide segment.</small>}</div>
      {constrained>0&&<small className="warning">⚠ {constrained} curve{constrained===1?' is':'s are'} tighter than the requested speed geometry because the surrounding guide segments are too short. Add/space guide points farther apart or lower the speed.</small>}
      <h3>Stations</h3><div className="station-list">{stations.length?[...stations].sort((a,b)=>a.d-b.d).map((s,i)=><div key={s.id}><span>{i+1}</span><input value={s.name} onChange={e=>setStations(x=>x.map(z=>z.id===s.id?{...z,name:e.target.value}:z))}/><button onClick={()=>setStations(x=>x.filter(z=>z.id!==s.id))}>×</button></div>):<em>Add at least one station.</em>}</div>
      <button className="secondary" disabled={track.length<2} onClick={fetchTerrain}>⌁ Load real elevation</button><small className="status">{terrainStatus}</small><button className="primary" disabled={track.length<2||stations.length<1} onClick={onNext}>Design train →</button>
    </aside></main>
}

const Num=({label,value,onChange,min,max,step=1,unit})=><label className="field"><span>{label}</span><div><input type="number" inputMode="decimal" value={value} min={min} max={max} step={step} onChange={e=>onChange(+e.target.value)}/><b>{unit}</b></div></label>;
function TrainDesigner({train,setTrain,paxCapacity,pax,paxMassT,tareMassT,grossMassT,trainLengthM,metrics,onBack,onDrive}){const set=(k,v)=>setTrain(t=>({...t,[k]:v}));return <main className="train-layout"><section className="train-stage"><TrainGraphic train={train}/><div className="identity"><input value={train.name} onChange={e=>set('name',e.target.value)}/><span>{train.kind.toUpperCase()} • {train.carCount+1}-UNIT CONSIST</span></div><div className="bigmetrics"><div><small>Gross mass</small><strong>{grossMassT.toFixed(1)} t</strong></div><div><small>Passengers</small><strong>{pax}</strong><span>/ {paxCapacity}</span></div><div><small>Length</small><strong>{trainLengthM.toFixed(0)} m</strong></div><div><small>Route</small><strong>{fmtDist(metrics.distance)}</strong></div></div></section>
  <aside className="panel train-panel"><div className="paneltitle"><button onClick={onBack}>←</button><div><h1>Train engineering</h1><p>Define a real physical consist, not a cosmetic skin.</p></div></div><div className="seg"><button className={train.kind==='electric'?'on':''} onClick={()=>set('kind','electric')}>⚡ Electric</button><button className={train.kind==='diesel'?'on':''} onClick={()=>set('kind','diesel')}>◈ Diesel</button></div>
    <h3>Power & traction</h3><div className="fields"><Num label="Rated power" value={train.powerKW} onChange={v=>set('powerKW',v)} unit="kW"/><Num label="Max tractive effort" value={train.maxTEKN} onChange={v=>set('maxTEKN',v)} unit="kN"/><Num label="Maximum speed" value={train.maxSpeed} onChange={v=>set('maxSpeed',v)} unit="km/h"/><Num label="Adhesion μ" value={train.adhesion} onChange={v=>set('adhesion',v)} step={0.01} unit="μ"/></div>
    <h3>Consist</h3><div className="fields"><Num label="Power unit mass" value={train.locoMassT} onChange={v=>set('locoMassT',v)} unit="t"/><Num label="Passenger cars" value={train.carCount} onChange={v=>set('carCount',clamp(Math.round(v),1,16))} unit="cars"/><Num label="Car tare mass" value={train.carMassT} onChange={v=>set('carMassT',v)} unit="t"/><Num label="Passenger load" value={Math.round(train.paxLoad*100)} onChange={v=>set('paxLoad',clamp(v/100,0,1))} unit="%"/></div>
    <h3>Braking</h3><div className="fields"><Num label="Service brake" value={train.serviceBrakeKN} onChange={v=>set('serviceBrakeKN',v)} unit="kN"/><Num label="Emergency brake" value={train.emergencyBrakeKN} onChange={v=>set('emergencyBrakeKN',v)} unit="kN"/><Num label={train.kind==='electric'?'Regen blend':'Dynamic brake'} value={train.regenPct} onChange={v=>set('regenPct',clamp(v,0,100))} unit="%"/></div>
    <div className="massbox"><span>Tare <b>{tareMassT.toFixed(1)} t</b></span><span>Passenger mass <b>{paxMassT.toFixed(1)} t</b></span><span>Gross <b>{grossMassT.toFixed(1)} t</b></span></div><button className="primary" onClick={onDrive}>Enter cab →</button>
  </aside></main>}
function TrainGraphic({train}){return <div className={`train-art ${train.kind}`}><div className="loco"><div className="glass"></div><div className="stripe"></div><div className="lights">••</div><div className="bogies">●　●</div></div>{Array.from({length:Math.min(train.carCount,8)}).map((_,i)=><div className="car" key={i}><div className="windows">▰ ▰ ▰ ▰</div><div className="stripe"></div><div className="bogies">●　●</div></div>)}</div>}

function DriveSim({points,stations,terrain,train,grossMassT,pax,mode,onExit}){
  const{distance,cumulative}=useMemo(()=>routeMetrics(points),[points]),sortedStations=useMemo(()=>[...stations].sort((a,b)=>a.d-b.d),[stations]);
  const[state,setState]=useState({x:0,v:0,t:0,throttle:0,brake:0,energy:0,score:1000,stopped:[],emergency:false,overspeedTime:0}),[paused,setPaused]=useState(false),pauseRef=useRef(false);useEffect(()=>{pauseRef.current=paused},[paused]);
  const nextStation=sortedStations.find(s=>!state.stopped.includes(s.id)&&s.d>state.x-30);
  function elevAt(x){if(terrain.length<2)return 0;let i=1;while(i<terrain.length&&terrain[i].d<x)i++;i=clamp(i,1,terrain.length-1);const a=terrain[i-1],b=terrain[i],t=(x-a.d)/Math.max(1,b.d-a.d);return a.elev+(b.elev-a.elev)*t}
  function gradeAt(x){if(terrain.length<2)return 0;const e1=elevAt(clamp(x-120,0,distance)),e2=elevAt(clamp(x+120,0,distance));return(e2-e1)/240}
  useEffect(()=>{let last=performance.now(),raf;const loop=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(!pauseRef.current)setState(s=>{const mass=grossMassT*1000,v=Math.max(0,s.v),g=9.80665,grade=gradeAt(s.x),limit=speedLimitAt(points,cumulative,s.x),adhesionLimit=train.adhesion*train.locoMassT*1000*g,powerLimit=train.powerKW*1000/Math.max(v,1.4),te=Math.min(train.maxTEKN*1000,adhesionLimit,powerLimit)*s.throttle,vk=v*3.6,davisN=(train.davisA*1000+train.davisB*1000*vk+train.davisC*1000*vk*vk)*(1+train.carCount*.62),aero=.5*1.225*7.8*.9*v*v,gradeF=mass*g*grade,brakeMax=(s.emergency?train.emergencyBrakeKN:train.serviceBrakeKN)*1000,brakeF=brakeMax*s.brake;let acc=(te-davisN-aero-gradeF-brakeF)/mass;if(v<=.01&&acc<0)acc=0;let nv=clamp(v+acc*dt,0,train.maxSpeed/3.6*1.08),nx=clamp(s.x+nv*dt,0,distance),energy=s.energy+Math.max(0,te*nv*dt/3.6e6)-Math.max(0,brakeF*nv*dt/3.6e6)*(train.regenPct/100),stopped=s.stopped,score=s.score,over=s.overspeedTime;if(nv*3.6>limit+2){over+=dt;score-=dt*2.2}for(const st of sortedStations){if(stopped.includes(st.id))continue;const delta=Math.abs(nx-st.d);if(delta<22&&nv<.45){stopped=[...stopped,st.id];score+=Math.max(0,220-Math.round(delta*5));break}if(nx>st.d+60){stopped=[...stopped,st.id];score-=220;break}}if(nx>=distance&&nv<.1)pauseRef.current=true;return{...s,x:nx,v:nv,t:s.t+dt,energy:Math.max(0,energy),stopped,score:Math.round(score*10)/10,overspeedTime:over}});raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[grossMassT,train,terrain,distance,sortedStations,points,cumulative]);
  const setCtl=(k,v)=>setState(s=>({...s,[k]:v})),grade=gradeAt(state.x),remaining=nextStation?nextStation.d-state.x:distance-state.x,limit=speedLimitAt(points,cumulative,state.x),radius=interpolateRoute(points,cumulative,state.x)?.radius;
  return <main className={`cab ${mode}`}><Scene state={state} route={points} cumulative={cumulative} distance={distance} mode={mode}/><div className="top-hud"><button onClick={onExit}>‹ ENGINEERING</button><div><span>{train.name}</span><b>{fmtTime(state.t)}</b></div><button onClick={()=>setPaused(p=>!p)}>{paused?'▶ RESUME':'Ⅱ PAUSE'}</button></div>
    <div className={`speed-hud ${state.v*3.6>limit+2?'over':''}`}><small>SPEED</small><strong>{Math.round(state.v*3.6)}</strong><span>km/h</span><i>LIMIT {Math.round(limit)}</i></div><div className="nextstop"><small>NEXT STOP</small><strong>{nextStation?.name||'End of line'}</strong><span>{remaining>=0?fmtDist(remaining):'Passed'}</span></div>
    <div className="physics-strip"><span>GRADE <b>{(grade*100).toFixed(2)}%</b></span><span>CURVE <b>{Number.isFinite(radius)?`${radius.toFixed(0)}m`:'TANGENT'}</b></span><span>MASS <b>{grossMassT.toFixed(0)}t</b></span><span>PAX <b>{pax}</b></span><span>ENERGY <b>{state.energy.toFixed(1)} kWh</b></span><span>SCORE <b>{Math.round(state.score)}</b></span></div><TouchControls state={state} setCtl={setCtl}/>
  </main>
}
function Scene({state,route,cumulative,distance,mode}){const pos=interpolateRoute(route,cumulative,state.x),look=interpolateRoute(route,cumulative,Math.min(distance,state.x+80)),bearing=pos&&look?Math.atan2(look.lng-pos.lng,look.lat-pos.lat):0,sleepers=Array.from({length:20});return <div className="scene"><div className="sky"><div className="sun"></div><div className="cloud c1"></div><div className="cloud c2"></div></div><div className="world"><div className="mountains"></div><div className="ground"></div><div className="rails" style={{transform:`perspective(500px) rotateX(64deg) rotateZ(${clamp(bearing*2,-4,4)}deg)`}}><i className="rail l"></i><i className="rail r"></i>{sleepers.map((_,i)=><i key={i} className="sleeper" style={{top:`${i*5}%`,transform:`scaleX(${.16+i*.055})`}}></i>)}</div></div>{mode==='subway'&&<div className="tunnel"><div className="tunnel-lights">{Array.from({length:9}).map((_,i)=><i key={i} style={{left:`${8+i*11}%`}}></i>)}</div>}<div className="windscreen"><div></div><div></div></div><div className="cabdash"></div></div>}
function TouchControls({state,setCtl}){const drag=key=>(e)=>{e.preventDefault();const el=e.currentTarget,rect=el.getBoundingClientRect(),update=ev=>{const p=clamp(1-(ev.clientY-rect.top)/rect.height,0,1);setCtl(key,p)};update(e);const move=ev=>update(ev),up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)};return <div className="controls"><div className="lever"><label>POWER</label><div className="slot" onPointerDown={drag('throttle')}><div className="fill power" style={{height:`${state.throttle*100}%`}}></div><button style={{bottom:`calc(${state.throttle*100}% - 26px)`}}></button></div><b>{Math.round(state.throttle*100)}%</b></div><button className={`emergency ${state.emergency?'active':''}`} onClick={()=>setStateSafe(setCtl,state)}>EMERGENCY<br/>BRAKE</button><div className="lever"><label>BRAKE</label><div className="slot" onPointerDown={drag('brake')}><div className="fill brake" style={{height:`${state.brake*100}%`}}></div><button style={{bottom:`calc(${state.brake*100}% - 26px)`}}></button></div><b>{Math.round(state.brake*100)}%</b></div></div>}
function setStateSafe(setCtl,state){setCtl('emergency',!state.emergency);setCtl('brake',state.emergency?0:1);if(!state.emergency)setCtl('throttle',0)}

createRoot(document.getElementById('root')).render(<App/>);
