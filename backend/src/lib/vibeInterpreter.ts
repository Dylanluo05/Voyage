import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface SongSuggestion {
  title: string;
  artist: string;
}

export async function interpretVibe(
  vibes: string,
  destination: string
): Promise<SongSuggestion[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a music curator. Suggest 8 real songs that match the vibe keywords below.

Vibe keywords: ${vibes}
Trip destination (light context only): ${destination}

Rules:
- The vibe keywords are the ONLY thing that determines the mood and genre — follow them closely
- The destination is just background context; do NOT let it dominate the song choices
- Suggest real, well-known songs that actually exist on Spotify
- Vary the artists — don't repeat the same artist twice

Respond with ONLY valid JSON, no explanation:
[
  { "title": "Song Name", "artist": "Artist Name" },
  ...
]`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not parse vibe response');
  return JSON.parse(jsonMatch[0]) as SongSuggestion[];
}
