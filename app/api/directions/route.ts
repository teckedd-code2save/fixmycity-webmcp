import { json } from '@/lib/civic-db';

type Coordinate = [number, number];

function isAccraCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length === 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    value[0] >= -0.45 && value[0] <= 0.15 && value[1] >= 5.35 && value[1] <= 5.9;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { coordinates?: unknown[] };
  const coordinates = body.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 9 || !coordinates.every(isAccraCoordinate)) {
    return json({ error: 'Provide 2–9 valid coordinates within the Accra service area.' }, 400);
  }

  const encoded = coordinates.map(([longitude, latitude]) => `${longitude},${latitude}`).join(';');
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${encoded}?overview=full&geometries=geojson&steps=false`, {
      headers: { Accept: 'application/json', 'User-Agent': 'FixMyCity-WebMCP-Challenge/1.0' },
    });
    if (!response.ok) throw new Error(`Routing provider returned ${response.status}`);
    const result = await response.json() as {
      code?: string;
      routes?: Array<{ distance: number; duration: number; geometry: { type: 'LineString'; coordinates: number[][] } }>;
    };
    const route = result.routes?.[0];
    if (result.code !== 'Ok' || !route) throw new Error('No road route was found');
    return json({
      source: 'Project OSRM / OpenStreetMap',
      distanceMetres: Math.round(route.distance),
      drivingMinutes: Math.max(1, Math.round(route.duration / 60)),
      geometry: route.geometry,
    });
  } catch (error) {
    return json({ error: 'Live road routing is temporarily unavailable.', detail: error instanceof Error ? error.message : 'Unknown routing error' }, 502);
  }
}
