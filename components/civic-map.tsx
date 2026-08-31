'use client';
import { useEffect,useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Report={id:string;title:string;address:string;severity:string;confirmations:number;latitude:number;longitude:number};
type RouteStop={id:string;latitude:number;longitude:number};
const colors:Record<string,string>={critical:'#da4d3f',high:'#ed8b36',medium:'#d7b32e',low:'#2c83a5'};

export function CivicMap(){
 const host=useRef<HTMLDivElement>(null);const mapRef=useRef<maplibregl.Map|null>(null);
 useEffect(()=>{
  if(!host.current||mapRef.current)return;
  const map=new maplibregl.Map({container:host.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[-0.1933,5.5688],zoom:13.6});mapRef.current=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  map.on('load',async()=>{const data=await fetch('/api/reports').then(async r=>await r.json() as {reports:Report[]});data.reports.forEach(report=>{const marker=document.createElement('button');const count=document.createElement('span');marker.className='live-map-marker';marker.style.setProperty('--marker',colors[report.severity]??colors.low);count.textContent=String(report.confirmations);marker.appendChild(count);marker.setAttribute('aria-label',`${report.title}, ${report.address}`);new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat([report.longitude,report.latitude]).setPopup(new maplibregl.Popup({offset:18}).setHTML(`<strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.address)}</span><small>${escapeHtml(report.id)} · ${escapeHtml(report.severity)}</small>`)).addTo(map)});});
  async function showRoute(event:Event){const payload=(event as CustomEvent<{payload?:{stops?:RouteStop[]}}>).detail?.payload;const stops=payload?.stops;if(!stops?.length)return;const coords:[number,number][]=[[-0.1931,5.5652],...stops.map(stop=>[stop.longitude,stop.latitude] as [number,number])];const response=await fetch('/api/directions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coordinates:coords})});if(!response.ok)return;const result=await response.json() as {geometry?:{type:'LineString';coordinates:number[][]}};const geometry=result.geometry;if(!geometry)return;const source=map.getSource('inspection-route') as maplibregl.GeoJSONSource|undefined;if(source)void source.setData({type:'Feature',properties:{},geometry});else{map.addSource('inspection-route',{type:'geojson',data:{type:'Feature',properties:{},geometry}});map.addLayer({id:'inspection-route-glow',type:'line',source:'inspection-route',paint:{'line-color':'#f5ffb0','line-width':10,'line-opacity':.8}});map.addLayer({id:'inspection-route-line',type:'line',source:'inspection-route',paint:{'line-color':'#164e3a','line-width':4,'line-dasharray':[1,1]}})}const bounds=new maplibregl.LngLatBounds();coords.forEach(c=>bounds.extend(c));map.fitBounds(bounds,{padding:70,maxZoom:15});}
  window.addEventListener('fixmycity:tool-result',showRoute);return()=>{window.removeEventListener('fixmycity:tool-result',showRoute);map.remove();mapRef.current=null};
 },[]);
 return <div className="live-map"><div ref={host} className="live-map-canvas"/><div className="map-label"><span>Accra Central</span><small>Live civic reports · OpenStreetMap</small></div><div className="map-legend"><span><i className="red"/>Critical</span><span><i className="orange"/>High</span><span><i className="yellow"/>Medium</span></div></div>
}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]!))}
