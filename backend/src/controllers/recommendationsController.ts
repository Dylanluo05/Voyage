import { Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Types } from 'mongoose';
import { Trip } from '../models/Trip';
import { HttpError } from '../middleware/error';

const anthropic = new Anthropic();

function ownerId(req: Request): Types.ObjectId {
  if (!req.user) throw new HttpError(401, 'Unauthenticated');
  return new Types.ObjectId(req.user.sub);
}

export interface Recommendation {
  title: string;
  description: string;
  suggestedDay: number;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
  location?: { name: string; address?: string };
  category: 'food' | 'activity' | 'attraction';
  estimatedCost?: string;
}

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) throw new HttpError(400, 'Invalid trip id');
    const uid = ownerId(req);
    const trip = await Trip.findOne({ _id: req.params.id, $or: [{ owner: uid }, { collaborators: uid }] });
    if (!trip) throw new HttpError(404, 'Trip not found');

    const totalDays = Math.max(
      1,
      Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: 'You are a travel expert. Generate itinerary recommendations as valid JSON only — no markdown, no commentary, just the raw JSON array.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Generate 6-8 itinerary recommendations for a ${totalDays}-day trip to ${trip.destination}.

Return a JSON array with this exact shape:
[
  {
    "title": "string",
    "description": "string (one sentence)",
    "suggestedDay": <1-${totalDays}>,
    "suggestedStartTime": "HH:mm",
    "suggestedEndTime": "HH:mm",
    "location": { "name": "string", "address": "string" },
    "category": "food" | "activity" | "attraction",
    "estimatedCost": "string (e.g. 'Free', '$15', '$30-50')"
  }
]

Spread recommendations across all ${totalDays} days. Mix food spots, activities, and attractions. Include an estimated cost per person for each recommendation. Return only the JSON array.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const recommendations: Recommendation[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    res.json(recommendations);
  } catch (err) {
    next(err);
  }
}
