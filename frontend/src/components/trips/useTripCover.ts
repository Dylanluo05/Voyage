import { useEffect, useState } from 'react';
import type { Trip } from '../../types';
import { fetchStock, readStock } from '../../utils/stockPhoto';

/* Cover image for a trip: the first itinerary item that has its own photo, otherwise a stock
   photo of the destination (cached per destination), otherwise null (generated art). */

export function useTripCover(trip: Trip): string | null {
  const own = trip.items.find((i) => i.imageUrl)?.imageUrl ?? null;
  const key = `dest:${trip.destination.trim().toLowerCase()}`;
  const [stock, setStock] = useState<string | null>(() => (own ? null : readStock(key) ?? null));

  useEffect(() => {
    if (own) return;
    let live = true;
    const city = trip.destination.split(',')[0];
    fetchStock(key, [`${trip.destination} travel`, city]).then((url) => {
      if (live && url !== undefined) setStock(url);
    });
    return () => {
      live = false;
    };
  }, [own, key, trip.destination]);

  return own ?? stock;
}
