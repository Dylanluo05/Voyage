import { Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Types } from 'mongoose';
import { Trip, ItineraryItemData } from '../models/Trip';
import { HttpError } from '../middleware/error';
import { checkAndIncrementQuota } from '../lib/aiQuota';
import { z } from 'zod';

const anthropic = new Anthropic();

function ensureValidObjectId(id: string, label = 'id'): void {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label}`);
}

function accessFilter(req: Request, id: string) {
  const uid = new Types.ObjectId(req.user!.sub);
  return { _id: id, $or: [{ owner: uid }, { collaborators: uid }] };
}

const tools: Anthropic.Tool[] = [
  {
    name: 'add_itinerary_items',
    description: 'Add one or more items to the trip itinerary. Use when the user asks to add a specific place, restaurant, or activity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const, description: 'Name of the place or activity' },
              day: { type: 'number' as const, description: 'Day number (1-indexed)' },
              startTime: { type: 'string' as const, description: 'Start time in HH:mm 24h format, e.g. "14:00"' },
              endTime: { type: 'string' as const, description: 'End time in HH:mm 24h format' },
              category: { type: 'string' as const, enum: ['food', 'activity', 'attraction'] },
              notes: { type: 'string' as const, description: 'Tips or notes about this place' },
            },
            required: ['title', 'day'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'replace_day',
    description: 'Replace all items for a specific day with a fresh generated plan. Use when the user asks to plan, fill, or regenerate a full day.',
    input_schema: {
      type: 'object' as const,
      properties: {
        day: { type: 'number' as const, description: 'Day number (1-indexed)' },
        items: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              title: { type: 'string' as const },
              startTime: { type: 'string' as const, description: 'HH:mm 24h format' },
              endTime: { type: 'string' as const, description: 'HH:mm 24h format' },
              category: { type: 'string' as const, enum: ['food', 'activity', 'attraction'] },
              notes: { type: 'string' as const },
            },
            required: ['title'],
          },
        },
      },
      required: ['day', 'items'],
    },
  },
];

export async function tripChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) { next(new HttpError(401, 'Unauthenticated')); return; }

  try {
    ensureValidObjectId(req.params.id, 'trip id');
    const trip = await Trip.findOne(accessFilter(req, req.params.id));
    if (!trip) { next(new HttpError(404, 'Trip not found')); return; }

    const { remaining } = await checkAndIncrementQuota(req.user.sub);

    const { messages } = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })).min(1),
    }).parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const totalDays = Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / 86400000) + 1;

    const itemsByDay: Record<number, string[]> = {};
    for (const item of trip.items) {
      if (!itemsByDay[item.day]) itemsByDay[item.day] = [];
      const time = item.startTime ? `${item.startTime} ` : '';
      itemsByDay[item.day].push(`${time}${item.title}`);
    }
    const itinerarySummary = Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1;
      return `Day ${d}: ${itemsByDay[d]?.join(', ') || 'nothing planned yet'}`;
    }).join('\n');

    const systemPrompt = `You are a knowledgeable travel assistant built into Voyage, a trip planning app.

Trip: "${trip.title}" — ${trip.destination}
Dates: ${trip.startDate.toDateString()} to ${trip.endDate.toDateString()} (${totalDays} days)
Current itinerary:
${itinerarySummary}

Answer travel questions and help the user plan their trip. When they ask to add places or plan a day, use the tools. Be concise and practical.`;

    // Stream Claude's initial response
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`event: text\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    const finalMessage = await stream.finalMessage();
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of finalMessage.content) {
      if (block.type !== 'tool_use') continue;
      const input = block.input as Record<string, unknown>;

      if (block.name === 'add_itinerary_items') {
        type ItemInput = { title: string; day: number; startTime?: string; endTime?: string; category?: string; notes?: string };
        const items = input.items as ItemInput[];
        const addedTitles: string[] = [];

        for (const item of items) {
          const clampedDay = Math.max(1, Math.min(totalDays, item.day));
          const maxPos = trip.items.filter(i => i.day === clampedDay).reduce((m, i) => Math.max(m, i.position), -1);
          trip.items.push({
            title: item.title,
            day: clampedDay,
            position: maxPos + 1,
            startTime: item.startTime,
            endTime: item.endTime,
            category: item.category as ItineraryItemData['category'],
            notes: item.notes,
          } as ItineraryItemData);
          addedTitles.push(item.title);
        }

        await trip.save();
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Added ${addedTitles.length} item(s).` });
        res.write(`event: tool_result\ndata: ${JSON.stringify({ action: 'add_items', items: addedTitles, day: (input.items as ItemInput[])[0]?.day })}\n\n`);
      }

      if (block.name === 'replace_day') {
        type DayItem = { title: string; startTime?: string; endTime?: string; category?: string; notes?: string };
        const day = input.day as number;
        const items = input.items as DayItem[];
        const clampedDay = Math.max(1, Math.min(totalDays, day));

        const toRemove = trip.items.filter(i => i.day === clampedDay).map(i => i._id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const id of toRemove) (trip.items as any).pull(id);

        items.forEach((item, idx) => {
          trip.items.push({
            title: item.title,
            day: clampedDay,
            position: idx,
            startTime: item.startTime,
            endTime: item.endTime,
            category: item.category as ItineraryItemData['category'],
            notes: item.notes,
          } as ItineraryItemData);
        });

        await trip.save();
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Replaced Day ${clampedDay} with ${items.length} items.` });
        res.write(`event: tool_result\ndata: ${JSON.stringify({ action: 'replace_day', day: clampedDay, count: items.length })}\n\n`);
      }
    }

    // If tools ran, get Claude's brief follow-up confirmation
    if (toolResults.length > 0) {
      const followUp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: systemPrompt,
        tools,
        messages: [
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'assistant', content: finalMessage.content },
          { role: 'user', content: toolResults },
        ],
      });
      const followUpText = followUp.content.find(b => b.type === 'text')?.text ?? '';
      if (followUpText) {
        res.write(`event: text\ndata: ${JSON.stringify({ text: '\n\n' + followUpText })}\n\n`);
      }
    }

    res.write(`event: done\ndata: ${JSON.stringify({ remaining })}\n\n`);
    res.end();
  } catch (err) {
    if (res.headersSent) {
      const msg = err instanceof Anthropic.APIError ? 'AI service temporarily unavailable.' :
                  err instanceof HttpError ? err.message : 'Something went wrong.';
      res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}
