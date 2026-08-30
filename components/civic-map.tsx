'use client';
import { useEffect,useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type Report={id:string;title:string;address:string;severity:string;confirmations:number;latitude:number;longitude:number};
type RouteStop={id:string;latitude:number;longitude:number};
const colors:Record<string,string>={critical:'#da4d3f',high:'#ed8b36',medium:'#d7b32e',low:'#2c83a5'};

export function CivicMap(){
 const host=useRef<HTMLDivElement>(null);const mapRef=useRef<mapboxgl.Map|null>(null);
 useEffect(()=>{
  if(!host.current||mapRef.current)return;const token=process.env.NEXT_PUBLIC_MAPBOX_TOKEN;if(!token){host.current.dataset.error='Map service is not configured.';return}mapboxgl.accessToken=token;
  const map=new mapboxgl.Map({container:host.current,style:'mapbox://styles/mapbox/streets-v12',center:[-0.1933,5.5688],zoom:13.6,attributionControl:true});mapRef.current=map;map.addControl(new mapboxgl.NavigationControl({showCompass:false}),'top-right');
  map.on('load',async()=>{const data=await fetch('/api/reports').then(async r=>await r.json() as {reports:Report[]});data.reports.forEach(report=>{const marker=document.createElement('button');const count=document.createElement('span');marker.className='live-map-marker';marker.style.setProperty('--marker',colors[report.severity]??colors.low);count.textContent=String(report.confirmations);marker.appendChild(count);marker.setAttribute('aria-label',`${report.title}, ${report.address}`);new mapboxgl.Marker({element:marker,anchor:'bottom'}).setLngLat([report.longitude,report.latitude]).setPopup(new mapboxgl.Popup({offset:18}).setHTML(`<strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.address)}</span><small>${escapeHtml(report.id)} · ${escapeHtml(report.severity)}</small>`)).addTo(map)});});
  async function showRoute(event:Event){const payload=(event as CustomEvent<{payload?:{stops?:RouteStop[]}}>).detail?.payload;const stops=payload?.stops;if(!stops?.length)return;const coords=[[-0.1931,5.5652],...stops.map(stop=>[stop.longitude,stop.latitude])];const response=await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords.map(c=>c.join(',')).join(';')}?geometries=geojson&overview=full&access_token=${token}`);if(!response.ok)return;const result=await response.json() as {routes?:Array<{geometry?:{type:'LineString';coordinates:number[][]}}>};const geometry=result.routes?.[0]?.geometry;if(!geometry)return;const source=map.getSource('inspection-route') as mapboxgl.GeoJSONSource|undefined;if(source)source.setData({type:'Feature',properties:{},geometry});else{map.addSource('inspection-route',{type:'geojson',data:{type:'Feature',properties:{},geometry}});map.addLayer({id:'inspection-route-glow',type:'line',source:'inspection-route',paint:{'line-color':'#f5ffb0','line-width':10,'line-opacity':.8}});map.addLayer({id:'inspection-route-line',type:'line',source:'inspection-route',paint:{'line-color':'#164e3a','line-width':4,'line-dasharray':[1,1]}})}const bounds=new mapboxgl.LngLatBounds();coords.forEach(c=>bounds.extend(c as [number,number]));map.fitBounds(bounds,{padding:70,maxZoom:15});}
  window.addEventListener('fixmycity:tool-result',showRoute);return()=>{window.removeEventListener('fixmycity:tool-result',showRoute);map.remove();mapRef.current=null};
 },[]);
 return <div className="live-map"><div ref={host} className="live-map-canvas"/><div className="map-label"><span>Accra Central</span><small>Live civic reports · Mapbox</small></div><div className="map-legend"><span><i className="red"/>Critical</span><span><i className="orange"/>High</span><span><i className="yellow"/>Medium</span></div></div>
}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]!))}
