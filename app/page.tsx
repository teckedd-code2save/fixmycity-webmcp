import { MapPin, Plus, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { OperationsAgentPanel } from '@/components/operations-agent-panel';
import { CivicMap } from '@/components/civic-map';
import { WeatherStatus } from '@/components/weather-status';
import {
  LiveIncidentFeed,
  LiveOperationsMetrics,
} from '@/components/live-operations';
import { ActorNavigation } from '@/components/actor-navigation';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <div className="brand-mark" aria-hidden="true">
            <MapPin />
          </div>
          <div>
            <p className="brand-name">FixMyCity</p>
            <p className="brand-kicker">Operations workspace</p>
          </div>
        </div>
        <ActorNavigation active="operations" />
        <div className="flex items-center gap-2">
          <div className="sync-pill">
            <span /> D1 connected
          </div>
          <Link
            href="/inspector"
            className={buttonVariants({
              variant: 'outline',
              className: 'h-10 rounded-full px-4',
            })}
          >
            <Users data-icon="inline-start" /> Field view
          </Link>
          <Link
            href="/resident"
            className={buttonVariants({ className: 'h-10 rounded-full px-4' })}
          >
            <Plus data-icon="inline-start" /> New report
          </Link>
        </div>
      </header>

      <div className="app-shell">
        <section className="workspace" id="operations">
          <div className="workspace-heading">
            <div>
              <WeatherStatus />
              <h1>City operations</h1>
              <p>
                Review reports, approve agent proposals, and dispatch field
                work.
              </p>
            </div>
          </div>

          <LiveOperationsMetrics />
          <CivicMap />
          <LiveIncidentFeed />
        </section>

        <OperationsAgentPanel />
      </div>
    </main>
  );
}
