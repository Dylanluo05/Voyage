import { Response } from 'express';

const tripClients = new Map<string, Set<Response>>();

export function addTripClient(tripId: string, res: Response): void {
  if (!tripClients.has(tripId)) tripClients.set(tripId, new Set());
  tripClients.get(tripId)!.add(res);
}

export function removeTripClient(tripId: string, res: Response): void {
  const clients = tripClients.get(tripId);
  if (!clients) return;
  clients.delete(res);
  if (clients.size === 0) tripClients.delete(tripId);
}

export function notifyTripUpdate(tripId: string): void {
  const clients = tripClients.get(tripId);
  if (!clients?.size) return;
  const payload = `event: updated\ndata: {}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}
