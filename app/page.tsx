import { OperationsAgentPanel } from '@/components/operations-agent-panel';
import { CivicMap } from '@/components/civic-map';
import { WeatherStatus } from '@/components/weather-status';
import {
  LiveIncidentFeed,
  LiveOperationsMetrics,
} from '@/components/live-operations';
import { WorkspaceHeader } from '@/components/workspace-header';
import { DemoStory } from '@/components/demo-story';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader active="operations" />

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

          <DemoStory />
          <LiveOperationsMetrics />
          <CivicMap />
          <LiveIncidentFeed />
        </section>

        <OperationsAgentPanel />
      </div>
    </main>
  );
}
