import Link from 'next/link';

type Workspace = 'resident' | 'operations' | 'inspector';

const destinations: Array<{ id: Workspace; href: string; label: string }> = [
  { id: 'resident', href: '/resident', label: 'Report an issue' },
  { id: 'operations', href: '/', label: 'Coordinate response' },
  { id: 'inspector', href: '/inspector', label: 'Field work' },
];

export function ActorNavigation({ active }: { active: Workspace }) {
  return (
    <nav className="role-nav" aria-label="Choose a FixMyCity workspace">
      {destinations.map((destination) => (
        <Link
          key={destination.id}
          href={destination.href}
          aria-current={destination.id === active ? 'page' : undefined}
        >
          {destination.label}
        </Link>
      ))}
    </nav>
  );
}
