'use client';
import { useEffect,useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Report={id:string;title:string;address:string;severity:string;confirmations:number;latitude:number;longitude:number};
type RouteStop={id:string;latitude:number;longitude:number};
const colors:Record<string,string>={critical:'#da4d3f',high:'#ed8b36',medium:'#d7b32e',low:'#2c83a5'};

export function CivicMap(){
 const host=useRef<HTMLDivElement>(null);const mapRef=useRef<L.Map|null>(null);const routeRef=useRef<L.GeoJSON|null>(null);
 useEffect(()=>{
  if(!host.current||mapRef.current)return;
  const map=L.map(host.current,{center:[5.5688,-0.1933],zoom:14,zoomControl:true,attributionControl:true});mapRef.current=map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  void fetch('/api/reports').then(async response=>await response.json() as {reports:Report[]}).then(data=>{data.reports.forEach(report=>{const color=colors[report.severity]??colors.low;const icon=L.divIcon({className:'civic-leaflet-icon',html:`<span style="--marker:${color}"><b>${report.confirmations}</b></span>`,iconSize:[30,36],iconAnchor:[15,34],popupAnchor:[0,-30]});L.marker([report.latitude,report.longitude],{icon,title:`${report.title}, ${report.address}`}).bindPopup(`<strong>${escapeHtml(report.title)}</strong><span>${escapeHtml(report.address)}</span><small>${escapeHtml(report.id)} · ${escapeHtml(report.severity)}</small>`).addTo(map)})}).catch(()=>undefined);
  async function showRoute(event:Event){const stops=(event as CustomEvent<{payload?:{stops?:RouteStop[]}}>).detail?.payload?.stops;if(!stops?.length)return;const coordinates:[number,number][]=[[-0.1931,5.5652],...stops.map(stop=>[stop.longitude,stop.latitude] as [number,number])];const response=await fetch('/api/directions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({coordinates})});if(!response.ok)return;const result=await response.json() as {geometry?:{type:'LineString';coordinates:number[][]}};if(!result.geometry)return;routeRef.current?.remove();routeRef.current=L.geoJSON(result.geometry,{style:{color:'#164e3a',weight:5,dashArray:'7 6',opacity:.9}}).addTo(map);map.fitBounds(routeRef.current.getBounds(),{padding:[45,45],maxZoom:15})}
  window.addEventListener('fixmycity:tool-result',showRoute);return()=>{window.removeEventListener('fixmycity:tool-result',showRoute);map.remove();mapRef.current=null};
 },[]);
 return <div className="live-map"><div ref={host} className="live-map-canvas"/><div className="map-label"><span>Accra Central</span><small>Reports from the live D1 workspace</small></div><div className="map-legend"><span><i className="red"/>Critical</span><span><i className="orange"/>High</span><span><i className="yellow"/>Medium</span></div></div>
}
function escapeHtml(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]!))}
