import { writeFileSync } from 'fs';
import { join } from 'path';

// One-off generator for backend/src/data/mtaStations.json.
// Source: MTA's public station reference dataset (mirrored on Socrata/data.ny.gov).
// Re-run only if MTA adds/closes/renames a station: `npx ts-node src/scripts/generateMtaStations.ts`
const SOURCE_URL = 'https://data.ny.gov/resource/39hk-dx4f.json?$limit=600';

interface RawStationRow {
  gtfs_stop_id: string;
  complex_id: string;
  stop_name: string;
  daytime_routes: string;
  gtfs_latitude: string;
  gtfs_longitude: string;
  north_direction_label?: string;
  south_direction_label?: string;
}

export interface MtaStationRow {
  gtfsStopId: string;
  complexId: string;
  name: string;
  lines: string[];
  lat: number;
  lng: number;
  northLabel?: string;
  southLabel?: string;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to fetch station data: ${res.status}`);
  const rows = (await res.json()) as RawStationRow[];

  const stations: MtaStationRow[] = rows
    .filter((r) => r.gtfs_stop_id && r.gtfs_latitude && r.gtfs_longitude)
    .map((r) => ({
      gtfsStopId: r.gtfs_stop_id,
      complexId: r.complex_id || r.gtfs_stop_id,
      name: r.stop_name,
      lines: (r.daytime_routes || '').split(' ').filter(Boolean),
      lat: Number(r.gtfs_latitude),
      lng: Number(r.gtfs_longitude),
      northLabel: r.north_direction_label || undefined,
      southLabel: r.south_direction_label || undefined,
    }));

  const outPath = join(__dirname, '..', 'data', 'mtaStations.json');
  writeFileSync(outPath, JSON.stringify(stations, null, 2));
  console.log(`Wrote ${stations.length} stations to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
