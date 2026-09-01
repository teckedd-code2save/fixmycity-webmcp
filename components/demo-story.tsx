'use client';

import { useEffect, useState } from 'react';
import { Check, Mic, Network, ShieldCheck, Truck } from 'lucide-react';

type Activity = {
  impact: {
    agentProposals: number;
    approvedAgentPlans: number;
    fieldAssignments: number;
    activeInspections: number;
  };
  events: Array<{ actor: string }>;
};

export function DemoStory() {
  const [activity, setActivity] = useState<Activity | null>(null);
  useEffect(() => {
    void fetch('/api/activity')
      .then(async (response) => (await response.json()) as Activity)
      .then(setActivity)
      .catch(() => undefined);
  }, []);
  const resident = Boolean(
    activity?.events.some((event) => event.actor === 'Resident'),
  );
  const steps = [
    {
      icon: Mic,
      label: 'Resident speaks',
      detail: '“Report the waste near me.”',
      done: resident,
    },
    {
      icon: Network,
      label: 'Agent coordinates',
      detail: 'Structures evidence and matches repeats',
      done: Boolean(activity?.impact.agentProposals),
    },
    {
      icon: ShieldCheck,
      label: 'Human approves',
      detail: 'Merge and route stay reviewable',
      done: Boolean(activity?.impact.approvedAgentPlans),
    },
    {
      icon: Truck,
      label: 'Field team acts',
      detail: 'One assignment, one audit trail',
      done: Boolean(activity?.impact.fieldAssignments),
    },
  ];
  return (
    <section className="demo-story" aria-labelledby="demo-story-title">
      <div className="demo-story-copy">
        <span>What we are demonstrating</span>
        <h2 id="demo-story-title">
          A complaint becomes field work through the website’s own WebMCP tools.
        </h2>
        <p>
          No copied dashboard data and no private agent integration. The browser
          agent reads and acts on the same live civic records as every human
          workspace.
        </p>
      </div>
      <ol>
        {steps.map(({ icon: Icon, label, detail, done }, index) => (
          <li key={label} className={done ? 'complete' : ''}>
            <div>
              <Icon />
            </div>
            <span>
              <small>0{index + 1}</small>
              <strong>{label}</strong>
              <em>{detail}</em>
            </span>
            {done && <Check />}
          </li>
        ))}
      </ol>
    </section>
  );
}
