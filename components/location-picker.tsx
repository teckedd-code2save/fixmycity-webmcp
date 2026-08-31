'use client';
import { useEffect,useRef,useState } from 'react';
import type { LeafletMouseEvent,Map as LeafletMap,Marker as LeafletMarker } from 'leaflet';

type Point={latitude:number;longitude:number};

export function LocationPicker({value,onChange}:{value:Point;onChange:(point:Point)=>void}){
 const host=useRef<HTMLDivElement>(null);const mapRef=useRef<LeafletMap|null>(null);const markerRef=useRef<LeafletMarker|null>(null);const changeRef=useRef(onChange);const initialPoint=useRef(value);
 const locateRef=useRef<()=>void>(()=>undefined);const [state,setState]=useState<'ready'|'locating'|'located'|'denied'|'unavailable'>('ready');
 useEffect(()=>{changeRef.current=onChange},[onChange]);
 useEffect(()=>{if(!host.current||mapRef.current)return;let disposed=false;let dispose=()=>{};void import('leaflet').then(L=>{if(disposed||!host.current)return;const startingPoint=initialPoint.current;const map=L.map(host.current,{center:[startingPoint.latitude,startingPoint.longitude],zoom:15});mapRef.current=map;L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const setPoint=(point:Point,fly=true)=>{markerRef.current?.remove();markerRef.current=L.marker([point.latitude,point.longitude],{title:'Report location'}).addTo(map);if(fly)map.flyTo([point.latitude,point.longitude],16,{duration:.6});changeRef.current(point)};setPoint(startingPoint,false);
  const locate=()=>{if(!navigator.geolocation){setState('unavailable');return}setState('locating');navigator.geolocation.getCurrentPosition(position=>{setPoint({latitude:position.coords.latitude,longitude:position.coords.longitude});setState('located')},error=>setState(error.code===error.PERMISSION_DENIED?'denied':'unavailable'),{enableHighAccuracy:true,timeout:8000,maximumAge:300000})};locateRef.current=locate;
  const handleClick=(event:LeafletMouseEvent)=>setPoint({latitude:event.latlng.lat,longitude:event.latlng.lng},false);map.on('click',handleClick);
  if('permissions' in navigator)void navigator.permissions.query({name:'geolocation'}).then(permission=>{if(permission.state==='granted')locate()}).catch(()=>undefined);
  dispose=()=>{map.off('click',handleClick);locateRef.current=()=>undefined;map.remove();mapRef.current=null};
 }).catch(()=>{if(host.current)host.current.dataset.error='Map unavailable. Enter the street or area below.'});return()=>{disposed=true;dispose()}},[]);
 const label={ready:'Use my current location',locating:'Finding your location…',located:'Location pinned',denied:'Location permission blocked',unavailable:'Location unavailable'}[state];
 return <div className="location-picker"><div ref={host}/><button type="button" onClick={()=>locateRef.current()} disabled={state==='locating'||state==='denied'||state==='unavailable'}>◎ {label}</button><small>Click anywhere to adjust the report pin. Your device location is not stored until you submit.</small></div>
}
