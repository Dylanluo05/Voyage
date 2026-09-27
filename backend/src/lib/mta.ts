import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import Long from 'long';
import mtaStations from '../data/mtaStations.json';
import type { MtaStationRow } from '../scripts/generateMtaStations';

type FeedGroup = 'ace' | 'bdfm' | 'g' | 'jz' | 'nqrw' | 'l' | 'gtfs' | 'si';

const FEED_URLS: Record<FeedGroup, string> = {
  ace: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
  bdfm: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  g: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
  jz: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
  nqrw: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
  l: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
  gtfs: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  si: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
};

// Best-effort: shuttles (H, FS, GS) ride within another line group's feed per MTA's own grouping.
const ROUTE_TO_FEED: Record<string, FeedGroup> = {
  A: 'ace', C: 'ace', E: 'ace', H: 'ace', FS: 'ace',
  B: 'bdfm', D: 'bdfm', F: 'bdfm', M: 'bdfm',
  G: 'g',
  J: 'jz', Z: 'jz',
  N: 'nqrw', Q: 'nqrw', R: 'nqrw', W: 'nqrw',
  L: 'l',
  '1': 'gtfs', '2': 'gtfs', '3': 'gtfs', '4': 'gtfs', '5': 'gtfs', '6': 'gtfs', '7': 'gtfs', S: 'gtfs',
  SI: 'si',
};

const FEED_TTL_MS = 25_000;
const feedCache: Partial<Record<FeedGroup, { data: FeedMessage; expiresAt: number }>> = {};
const feedInFlight: Partial<Record<FeedGroup, Promise<FeedMessage>>> = {};

type FeedMessage = InstanceType<typeof GtfsRealtimeBindings.transit_realtime.FeedMessage>;

async function fetchFeed(group: FeedGroup): Promise<FeedMessage> {
  const res = await fetch(FEED_URLS[group]);
  if (!res.ok) throw new Error(`MTA feed ${group} failed: ${res.status}`);
  const buffer = new Uint8Array(await res.arrayBuffer());
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
}

async function getFeed(group: FeedGroup): Promise<FeedMessage> {
  const cached = feedCache[group];
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const inFlight = feedInFlight[group];
  if (inFlight) return inFlight;

  const promise = fetchFeed(group)
    .then((data) => {
      feedCache[group] = { data, expiresAt: Date.now() + FEED_TTL_MS };
      return data;
    })
    .finally(() => {
      delete feedInFlight[group];
    });
  feedInFlight[group] = promise;
  return promise;
}

function toMillis(time: number | Long | null | undefined): number | undefined {
  if (time == null) return undefined;
  const seconds = typeof time === 'number' ? time : Long.fromValue(time).toNumber();
  return seconds * 1000;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

interface NearbyComplex {
  complexId: string;
  name: string;
  lines: string[];
  distanceMeters: number;
  stopIds: string[];
  labelsByStopId: Map<string, { northLabel?: string; southLabel?: string }>;
}

function findNearbyComplexes(lat: number, lng: number, radiusMeters = 500, limit = 2): NearbyComplex[] {
  const byComplex = new Map<string, NearbyComplex>();

  for (const row of mtaStations as MtaStationRow[]) {
    const distance = haversineMeters(lat, lng, row.lat, row.lng);
    if (distance > radiusMeters) continue;

    const existing = byComplex.get(row.complexId);
    if (existing) {
      existing.lines = [...new Set([...existing.lines, ...row.lines])];
      existing.stopIds.push(row.gtfsStopId);
      existing.distanceMeters = Math.min(existing.distanceMeters, distance);
    } else {
      byComplex.set(row.complexId, {
        complexId: row.complexId,
        name: row.name,
        lines: [...row.lines],
        distanceMeters: distance,
        stopIds: [row.gtfsStopId],
        labelsByStopId: new Map(),
      });
    }
    byComplex.get(row.complexId)!.labelsByStopId.set(row.gtfsStopId, {
      northLabel: row.northLabel,
      southLabel: row.southLabel,
    });
  }

  return [...byComplex.values()].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit);
}

export interface TransitArrival {
  route: string;
  direction: 'N' | 'S';
  directionLabel?: string;
  minutes: number;
}

export interface NearbyTransitStation {
  complexId: string;
  name: string;
  lines: string[];
  distanceMeters: number;
  arrivals: TransitArrival[];
}

async function getArrivalsForComplex(complex: NearbyComplex): Promise<TransitArrival[]> {
  const groups = [...new Set(complex.lines.map((line) => ROUTE_TO_FEED[line]).filter(Boolean))];
  const results = await Promise.allSettled(groups.map((group) => getFeed(group)));

  const byRouteDirection = new Map<string, TransitArrival[]>();
  const now = Date.now();

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      console.error('[mta] feed fetch failed', result.reason);
      continue;
    }
    for (const entity of result.value.entity ?? []) {
      const trip = entity.tripUpdate;
      if (!trip?.trip?.routeId) continue;
      for (const stu of trip.stopTimeUpdate ?? []) {
        const stopId = stu.stopId;
        if (!stopId) continue;
        const matchedStopId = complex.stopIds.find((id) => stopId.startsWith(id));
        if (!matchedStopId) continue;

        const direction = stopId.slice(-1);
        if (direction !== 'N' && direction !== 'S') continue;

        const millis = toMillis(stu.arrival?.time ?? stu.departure?.time);
        if (millis == null) continue;
        const minutes = Math.round((millis - now) / 60000);
        if (minutes < 0) continue;

        const labels = complex.labelsByStopId.get(matchedStopId);
        const directionLabel = direction === 'N' ? labels?.northLabel : labels?.southLabel;

        const key = `${trip.trip.routeId}|${direction}`;
        const arrival: TransitArrival = { route: trip.trip.routeId, direction, directionLabel, minutes };
        const existing = byRouteDirection.get(key) ?? [];
        existing.push(arrival);
        byRouteDirection.set(key, existing);
      }
    }
  }

  const arrivals: TransitArrival[] = [];
  for (const group of byRouteDirection.values()) {
    arrivals.push(...group.sort((a, b) => a.minutes - b.minutes).slice(0, 3));
  }
  return arrivals.sort((a, b) => a.minutes - b.minutes);
}

export async function getNearbyTransit(lat: number, lng: number): Promise<NearbyTransitStation[]> {
  const complexes = findNearbyComplexes(lat, lng);
  const stations = await Promise.all(
    complexes.map(async (complex) => ({
      complexId: complex.complexId,
      name: complex.name,
      lines: complex.lines,
      distanceMeters: Math.round(complex.distanceMeters),
      arrivals: await getArrivalsForComplex(complex),
    }))
  );
  return stations;
}
