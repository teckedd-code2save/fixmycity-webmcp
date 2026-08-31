'use client';
import { useEffect,useState } from 'react';
import { ArrowUpRight,MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Health={status:string;database:string;reports:{total:number;open:number;resolved:number;critical:number};activeAssignments:number};
type Report={id:string;title:string;address:string;severity:string;status:string;confirmations:number;priorityScore:number;createdAt:number};
const colors:Record<string,string>={critical:'var(--signal-red)',high:'var(--signal-orange)',medium:'var(--signal-yellow)',low:'var(--signal-blue)'};

export function LiveOperationsMetrics(){
 const [health,setHealth]=useState<Health|null>(null);
 useEffect(()=>{void fetch('/api/health').then(async response=>await response.json() as Health).then(setHealth).catch(()=>undefined)},[]);
 if(!health)return <div className="operations-kpis"><div><strong>—</strong><span>Connecting to D1</span></div></div>;
 return <><div className="operations-kpis"><div><strong>{health.reports.open}</strong><span>Open reports</span></div><div><strong className="text-[var(--signal-red)]">{health.reports.critical}</strong><span>Critical now</span></div><div><strong>{health.reports.resolved}</strong><span>Resolved</span></div><div><strong>{health.activeAssignments}</strong><span>Field assignments</span></div></div><p className="workspace-source"><strong>Live workspace:</strong> only reports submitted through FixMyCity appear here. Every workflow change persists in D1.</p></>;
}

export function LiveIncidentFeed(){
 const [reports,setReports]=useState<Report[]>([]);const [expanded,setExpanded]=useState(false);
 useEffect(()=>{void fetch('/api/reports').then(async response=>await response.json() as {reports:Report[]}).then(data=>setReports(data.reports??[])).catch(()=>undefined)},[]);
 const visible=expanded?reports:reports.slice(0,3);
 return <div className="incident-strip" id="reports"><div className="section-title-row"><div><h2>Needs attention</h2><p>Resident-submitted D1 records ranked by the stored priority score</p></div>{reports.length>3&&<button onClick={()=>setExpanded(value=>!value)}>{expanded?'Show priority three':`View all ${reports.length}`} <ArrowUpRight/></button>}</div><div className="incident-grid">{visible.map(report=><article className="incident-card" key={report.id}><div className="flex items-center justify-between"><Badge className="severity" style={{'--badge':colors[report.severity]??colors.low} as React.CSSProperties}>{report.severity}</Badge><span className="incident-id">{report.id}</span></div><h3>{report.title}</h3><p><MapPin/> {report.address}</p><div className="incident-meta"><span>Priority {report.priorityScore}/100</span><span>{report.confirmations} confirmations · {report.status}</span></div></article>)}</div>{reports.length===0&&<div className="empty-workspace"><div><h3>No civic reports yet</h3><p>The workspace is intentionally empty until a resident submits real evidence.</p></div><Link href="/resident">Submit the first report <ArrowUpRight/></Link></div>}</div>;
}
