import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ActorNavigation } from '@/components/actor-navigation';

type Workspace = 'resident' | 'operations' | 'inspector';

const context = {
  resident: { title: 'Resident', detail: 'Public reporting' },
  operations: { title: 'City response', detail: 'Live civic records' },
  inspector: { title: 'Field Team 01', detail: 'Motorbike unit' },
} satisfies Record<Workspace, { title: string; detail: string }>;

export function WorkspaceHeader({ active }: { active: Workspace }) {
  const current = context[active];
  return (
    <header className="workspace-header">
      <Link href="/" className="workspace-brand" aria-label="FixMyCity home">
        <span aria-hidden="true">
          <MapPin />
        </span>
        <div>
          <strong>FixMyCity</strong>
          <small>Civic response network</small>
        </div>
      </Link>
      <ActorNavigation active={active} />
      <div className="workspace-context">
        <i aria-hidden="true" />
        <span>
          <strong>{current.title}</strong>
          <small>{current.detail}</small>
        </span>
      </div>
    </header>
  );
}
