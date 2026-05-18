import { Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { HttpError } from '../middleware/error';

const anthropic = new Anthropic();

const BodySchema = z.object({ text: z.string().min(1).max(12000) });

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new HttpError(422, 'Could not extract booking details from that text');
  return JSON.parse(match[0]);
}

export async function parseHotelConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { text } = BodySchema.parse(req.body);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract hotel/accommodation booking details from the confirmation text below.
Return a single JSON object with exactly these fields:
{
  "name": "hotel or property name",
  "type": "hotel" | "airbnb" | "hostel" | "other",
  "location": "full address or city/country",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "pricePerNight": <number>,
  "guests": <number>,
  "confirmationNumber": "booking code or empty string",
  "notes": "any other relevant detail or empty string"
}

Rules:
- type: "airbnb" for Airbnb, "hostel" for hostels, "hotel" for hotels/motels/resorts, "other" for anything else
- pricePerNight: derive from total ÷ nights if not explicit; use 0 if unknown
- guests: use 1 if not mentioned
- Return only the JSON object — no markdown fences, no explanation

Confirmation text:
${text}`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    res.json(extractJson(raw));
  } catch (err) {
    next(err);
  }
}

export async function parseFlightConfirmation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { text } = BodySchema.parse(req.body);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract flight booking details from the confirmation text below.
Return a single JSON object with exactly these fields:
{
  "tripType": "one-way" | "round-trip",
  "airline": "airline name",
  "flightNumber": "e.g. UA123",
  "departureAirport": "IATA code or airport name",
  "arrivalAirport": "IATA code or airport name",
  "departureTime": "YYYY-MM-DDTHH:mm",
  "arrivalTime": "YYYY-MM-DDTHH:mm",
  "returnDepartureTime": "YYYY-MM-DDTHH:mm or empty string",
  "returnArrivalTime": "YYYY-MM-DDTHH:mm or empty string",
  "passengers": <number>,
  "cabinClass": "economy" | "premium-economy" | "business" | "first-class",
  "price": <total price as number>,
  "confirmationNumber": "booking reference",
  "notes": "any other relevant detail or empty string"
}

Rules:
- tripType: "round-trip" if a return flight exists, otherwise "one-way"
- returnDepartureTime / returnArrivalTime: empty string if one-way
- passengers: use 1 if not specified
- cabinClass: map "coach" → "economy", "business class" → "business", "first" → "first-class"; default "economy"
- price: total for all passengers; use 0 if unknown
- Return only the JSON object — no markdown fences, no explanation

Confirmation text:
${text}`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    res.json(extractJson(raw));
  } catch (err) {
    next(err);
  }
}
