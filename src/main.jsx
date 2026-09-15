
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import Simulator from './Simulator';
import {ASSET_CATALOG} from './assets';
import './style.css';

function Planner({onDrive}){
 const mapEl=useRef(),mapRef=useRef(),[points,setPoints]=useState([]),[stations,setStations]=useState([]),[cars,setCars]=useState(4),[track,setTrack]=useState('double');
 useEffect(()=>{const map=L.map(mapEl.current,{zoomControl:false}).setView([39.7684,-86.1581],12);mapRef.current=map;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);L.control.zoom({position:'bottomright'}).addTo(map);
  let line=L.polyline([],{color:'#f4c430',weight:5}).addTo(map);map.on('click',e=>setPoints(p=>{const n=[...p,[e.latlng.lat,e.latlng.lng]];line.setLatLngs(n);return n}));return()=>map.remove()},[]);
 const station=()=>{if(!points.length)return;setStations(s=>[...s,{name:`Station ${s.length+1}`,p:points[points.length-1]}])};
 return <div className="planner"><div ref={mapEl} className="map"/><aside><h1>WORLDRAIL</h1><h2>Asset Edition</h2><p className="muted">Draw a guide route. The driving world uses a reusable PBR/model asset library instead of flat-shaded scene primitives.</p>
 <div className="card"><h3>Route</h3><button onClick={()=>setPoints([])}>Clear guide</button><button onClick={station}>Add station at last point</button><label>Track arrangement<select value={track} onChange={e=>setTrack(e.target.value)}><option value="double">Double track</option><option value="single">Single track</option></select></label></div>
 <div className="card"><h3>Train</h3><label>Cars <input type="number" min="1" max="12" value={cars} onChange={e=>setCars(+e.target.value)}/></label><div className="metric"><b>{cars*70}</b><span>US tons approx.</span></div><div className="metric"><b>{cars*110}</b><span>passengers</span></div></div>
 <div className="card assets"><h3>Scene asset library</h3>{Object.entries(ASSET_CATALOG).map(([k,v])=><div key={k}><b>{k}</b><span>{v.source} • {v.license}</span></div>)}</div>
 <button className="drive" onClick={()=>onDrive({points,stations,cars,track,mass:cars*63500,tractive:300000})}>DRIVE DEMO</button></aside></div>
}
function App(){const [route,setRoute]=useState(null);return route?<Simulator route={route} onExit={()=>setRoute(null)}/>:<Planner onDrive={setRoute}/>}
createRoot(document.getElementById('root')).render(<App/>);
