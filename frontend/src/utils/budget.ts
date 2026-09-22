import type { Trip } from '../types';

export interface Spending {
  itinerary: number;
  hotels: number;
  flights: number;
  expenses: number;
  total: number;
}

export function getMyBudget(trip: Trip, userId?: string): number | undefined {
  if (!userId) return undefined;
  return trip.budgets?.find((b) => b.userId === userId)?.amount;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// What one traveler is on the hook for: itinerary costs are per person,
// hotels and flights are split across guests/passengers, and shared expenses
// count only the user's own split.
export function getMySpending(trip: Trip, userId?: string): Spending {
  const itinerary = trip.items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const hotels = trip.hotels.reduce(
    (sum, h) => sum + (h.pricePerNight * nightsBetween(h.checkIn, h.checkOut)) / Math.max(1, h.guests),
    0
  );
  const flights = trip.flights.reduce((sum, f) => sum + f.price / Math.max(1, f.passengers), 0);
  const expenses = userId
    ? trip.expenses.reduce(
        (sum, e) => sum + e.splits.filter((s) => s.userId === userId).reduce((a, s) => a + s.amount, 0),
        0
      )
    : 0;
  return { itinerary, hotels, flights, expenses, total: itinerary + hotels + flights + expenses };
}
