import {
  ArrowUpRight, ChevronDown, CircleDot, Clock3,
  Layers3, Map, MapPin, Menu, Plus, Search, SlidersHorizontal, Sparkles, Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OperationsAgentPanel } from '@/components/operations-agent-panel';
import { CivicMap } from '@/components/civic-map';
import { WeatherStatus } from '@/components/weather-status';
import Link from 'next/link';

const incidents = [
  { id: 'FC-0241', title: 'Blocked storm drain', place: 'Nii Nortei Nyanchi St', age: '18 min', reports: 4, level: 'Critical', color: 'var(--signal-red)', pos: ['31%', '38%'] },
  { id: 'FC-0237', title: 'Road flooding', place: 'Near Unity Primary', age: '42 min', reports: 7, level: 'High', color: 'var(--signal-orange)', pos: ['58%', '49%'] },
  { id: 'FC-0229', title: 'Broken streetlight', place: 'Ringway Link', age: '2 hr', reports: 2, level: 'Medium', color: 'var(--signal-yellow)', pos: ['69%', '29%'] },
];
export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu"><Menu /></Button>
          <div className="brand-mark" aria-hidden="true"><MapPin /></div>
          <div><p className="brand-name">FixMyCity</p><p className="brand-kicker">Accra Central · Live operations</p></div>
        </div>
        <label className="search-shell"><Search aria-hidden="true" /><span className="sr-only">Search reports</span><input placeholder="Search reports, streets or landmarks" /><kbd>⌘ K</kbd></label>
        <div className="flex items-center gap-2">
          <div className="sync-pill"><span /> All systems live</div>
          <Link href="/resident" className={buttonVariants({className:'h-10 rounded-full px-4'})}><Plus data-icon="inline-start" /> New report</Link>
          <div className="avatar">ET</div>
        </div>
      </header>

      <div className="app-shell">
        <aside className="side-rail" aria-label="Primary navigation">
          <nav className="space-y-1">
            <a className="nav-item active" href="#operations"><Map /> Operations</a>
            <a className="nav-item" href="#reports"><CircleDot /> Reports <span>24</span></a>
            <Link className="nav-item" href="/inspector"><Users /> Field teams</Link>
            <a className="nav-item" href="#insights"><Layers3 /> Insights</a>
          </nav>
          <div className="rail-divider" /><p className="rail-label">Today</p>
          <div className="metric-stack">
            <div><strong>24</strong><span>Open reports</span></div>
            <div><strong className="text-[var(--signal-red)]">5</strong><span>Need attention</span></div>
            <div><strong>8</strong><span>Resolved</span></div>
          </div>
          <Card className="agent-rail-card"><CardContent className="space-y-3 p-0">
            <div className="flex items-center gap-2 font-semibold"><Sparkles /> Agent ready</div>
            <p>WebMCP tools are live on this operations surface.</p>
            <button>View capabilities <ArrowUpRight /></button>
          </CardContent></Card>
        </aside>

        <section className="workspace" id="operations">
          <div className="workspace-heading">
            <div><WeatherStatus /><h1>City operations</h1><p>Turn resident signals into coordinated action.</p></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-10 rounded-full px-4"><SlidersHorizontal /> Filters</Button>
              <Button variant="outline" className="h-10 rounded-full px-4"><Clock3 /> Last 24 hours <ChevronDown /></Button>
            </div>
          </div>

          <CivicMap />

          <div className="incident-strip" id="reports">
            <div className="section-title-row"><div><h2>Needs attention</h2><p>Ranked by urgency, impact and location context</p></div><button>View all 24 <ArrowUpRight /></button></div>
            <div className="incident-grid">{incidents.map((incident) => (
              <article className="incident-card" key={incident.id}>
                <div className="flex items-center justify-between"><Badge className="severity" style={{ '--badge': incident.color } as React.CSSProperties}>{incident.level}</Badge><span className="incident-id">{incident.id}</span></div>
                <h3>{incident.title}</h3><p><MapPin /> {incident.place}</p><div className="incident-meta"><span>{incident.age} ago</span><span>{incident.reports} resident signals</span></div>
              </article>
            ))}</div>
          </div>
        </section>

        <OperationsAgentPanel />
      </div>
    </main>
  );
}
