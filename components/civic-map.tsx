'use client';
import { useEffect,useRef,useState } from 'react';
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap } from 'leaflet';

type Report={id:string;title:string;address:string;severity:string;confirmations:number;latitude:number;longitude:number};
type RouteStop={id:string;latitude:number;longitude:number};
const colors:Record<string,string>={critical:'#da4d3f',high:'#ed8b36',medium:'#d7b32e',low:'#2c83a5'};

export function CivicMap(){
 const host=useRef<HTMLDivElement>(null);const mapRef=useRef<LeafletMap|null>(null);const routeRef=useRef<LeafletGeoJSON|null>(null);
 const locateRef=useRef<()=>void>(()=>undefined);const resetRef=useRef<()=>void>(()=>undefined);
 const [locationState,setLocationState]=useState<'ready'|'locating'|'located'|'denied'|'unavailable'>('ready');
 const [mapTitle,setMapTitle]=useState('Report map');
 useEffect(()=>{
  if(!host.current||mapRef.current)return;
  let disposed=false;
  let disposeMap=()=>{};
  void import('leaflet').then(L=>{
   if(disposed||!host.current)return;
   const map=L.map(host.current,{center:[5.5688,-0.1933],zoom:14,zoomControl:true,attributionControl:true});mapRef.current=map;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
   const userLayers=L.layerGroup().addTo(map);
   const locate=()=>{
    if(!navigator.geolocation){setLocationState('unavailable');return}
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(position=>{
     const point:[number,number]=[position.coords.latitude,position.coords.longitude];
     userLayers.clearLayers();
     L.circle(point,{radius:Math.max(position.coords.accuracy,25),color:'#2563a7',fillColor:'#60a5fa',fillOpacity:.12,weight:1}).addTo(userLayers);
     const icon=L.divIcon({className:'current-location-icon',html:'<span><i></i></span>',iconSize:[30,30],iconAnchor:[15,15]});
     L.marker(point,{icon,title:'Your current location'}).bindPopup('<strong>You are here</strong><small>Location stays in this browser and is not stored.</small>').addTo(userLayers);
     map.flyTo(point,16,{duration:.7});setMapTitle('Your current area');setLocationState('located');
    },error=>setLocationState(error.code===error.PERMISSION_DENIED?'denied':'unavailable'),{enableHighAccuracy:true,timeout:8000,maximumAge:300000});
   };
   locateRef.current=locate;
   resetRef.current=()=>{map.flyTo([5.5688,-0.1933],14,{duration:.7});setMapTitle('Report map')};
   if('permissions' in navigator)void navigator.permissions.query({name:'geolocation'}).then(permission=>{if(permission.state==='granted')locate()}).catch(()=>undefined);
   void fetch('/api/reports').then(async response=>await response.json() as {reports:Report[]}).then(data=>{data.reports.forEach(report=>{const color=colors[report.severity]??colors.low;const icon=L.divIcon({className:'civic-leaflet-icon',html:`<span style="--marker:${color}"><b>${report.confirmations}</b></span>`,iconSize:[30,36],iconAnchor:[15,34],popupAnchor:[0,-30]});L.marker([report.latitude,report.longitude],{icon,title:`${report.title}, ${report.address}`}).bindPopup(`<strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.address)}</span><small>${escapeHtml(report.id)} · ${escapeHtml(report.severity)}</small>`).addTo(map)})}).catch(()=>undefined);
   async function showRoute(event:Event){const stops=(event as CustomEvent<{payload?:{stops?:RouteStop[]}}>).detail?.payload?.stops;if(!stops?.length)return;const coordinates:[number,number][]=[[-0.1931,5.5652],...stops.map(stop=>[stop.longitude,stop.latitude] as [number,number])];const response=await fetch('/api/directions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coordinates})});if(!response.ok)return;const result=await response.json() as {geometry?:{type:'LineString';coordinates:number[][]}};if(!result.geometry)return;routeRef.current?.remove();routeRef.current=L.geoJSON(result.geometry,{style:{color:'#164e3a',weight:5,dashArray:'7 6',opacity:.9}}).addTo(map);map.fitBounds(routeRef.current.getBounds(),{padding:[45,45],maxZoom:15})}
   window.addEventListener('fixmycity:tool-result',showRoute);
   disposeMap=()=>{window.removeEventListener('fixmycity:tool-result',showRoute);locateRef.current=()=>undefined;resetRef.current=()=>undefined;map.remove();mapRef.current=null};
  }).catch(()=>{if(host.current)host.current.dataset.error='The live map could not load. Reports remain available below.'});
  return()=>{disposed=true;disposeMap()};
 },[]);
 const locationLabel={ready:'Use my location',locating:'Finding you…',located:'Recenter on me',denied:'Location blocked',unavailable:'Location unavailable'}[locationState];
 return <div className="live-map"><div ref={host} className="live-map-canvas"/><div className="map-label"><span>{mapTitle}</span><small>{locationState==='located'?'Your location is private and is not stored':'Only submitted reports are pinned'}</small></div><div className="location-controls"><button type="button" onClick={()=>locateRef.current()} disabled={locationState==='locating'||locationState==='denied'||locationState==='unavailable'} aria-label={locationLabel}><span aria-hidden="true">◎</span>{locationLabel}</button>{mapTitle==='Your current area'&&<button type="button" onClick={()=>resetRef.current()}>Show report area</button>}</div><div className="map-legend"><span><i className="red"/>Critical</span><span><i className="orange"/>High</span><span><i className="yellow"/>Medium</span></div></div>
}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]!))}
