// Interest chips for sidequests. Players filter the board by these, and every quest carries 1-4.
// Keep this list in sync with INTERESTS in frontend/src/components/quests/questMeta.ts.

export const INTEREST_KEYS = [
  'outdoors',
  'food',
  'dating',
  'friends',
  'parties',
  'fitness',
  'music',
  'arts',
  'fashion',
  'travel',
  'learning',
  'nostalgia',
  'wellness',
  'giving',
  'campus',
] as const;

export type Interest = (typeof INTEREST_KEYS)[number];

export const MAX_INTERESTS = 4;

// Keyword rules over a quest's title, description and location. A quest keeps the interests with the
// most keyword hits (ties broken by the order below), up to MAX_INTERESTS.
const RULES: Record<Interest, RegExp> = {
  outdoors: /\b(hike|hiking|trail|trailhead|summit|peak|sunrise|sunset|camp|camping|kayak|paddle\w*|canyon|redwood\w*|reserve|lake|mountain\w*|tide pools?|stargaz\w*|beach|park|outside|outdoors?|waterfall|garden|picnic|canoe|surf\w*|cliffs?|nature)\b/,
  food: /\b(eat|eating|food|taste|tasting|cook|cooking|dinner|lunch|breakfast|brunch|dessert|chocolate|boba|matcha|coffee|tacos?|ramen|pizza|burrito\w*|dumplings?|snacks?|bake|cookies?|restaurants?|menu|stalls?|market|bakery|spicy|potluck|mocktail\w*|hot dog|banana|sandwich|cafe|diner)\b/,
  dating: /\b((a|your|their|my|the|first|double|blind) dates?|dates?'s|date night|date spot|date idea|dating|crush|romantic|love letter|situationship|serenade\w*|ask(ing)? someone out)\b/,
  friends: /\b(friends?|strangers?|group|crew|roommates?|hang|hangout|invite|conversation|compliments?|stranger|matchmaker)\b/,
  parties: /\b(party|parties|darty|rave|disco|nightlife|karaoke|tailgate|bar|bars|clubbing|dance circle|throwback party|game night|friendsgiving)\b/,
  fitness: /\b(running|jog\w*|5k|marathon|run club|sprint\w*|run (the|to|a half|a 5k|a mile|ten|\d+)|gym|workout|pickleball|intramural|sports?|bike|biking|cycl\w*|skate\w*|surf\w*|swim\w*|climb\w*|fitness|yoga|stairs|race|rec sports?|boxing|aerial)\b/,
  music: /\b(music|songs?|playlist|album|karaoke|concert|dance|dancing|mixtape|sing|serenade\w*|band|open mic|dj|choreograph\w*|record|vinyl|rave)\b/,
  arts: /\b(sketch\w*|draw\w*|paint\w*|pottery|ceramics|zine|film|movie|photo|photograph\w*|documentary|comic|craft\w*|diy|art|gallery|galleries|museum|poem|poetry|mural|illustrat\w*|portrait|scene)\b/,
  fashion: /\b(thrift\w*|fit|fits|outfit\w*|fashion|wardrobe|vintage|runway|costume\w*|clothes|clothing|styled|clothing swap)\b/,
  travel: /\b(trip|travel|transit|ferry|border|abroad|flight|train|bus|road trip|day trip|passport|city|cities|island|pier|wharf|boardwalk|capitol)\b/,
  learning: /\b(study|studying|learn\w*|lecture|library|professor|office hours|research|history|read|reading|book|books|teach\w*|quiz|trivia|decode|interview|skill|class|workshop|archive|facts?|inscription|bookstore)\b/,
  nostalgia: /\b(2016|film camera|disposable|polaroid|retro|vintage|mixtape|throwback|flip phone|dumbphone|vinyl|nostalg\w*|y2k|n64|wii|gamecube|time capsule|old|oldest|pen-pal|postcards?)\b/,
  wellness: /\b(sober|sober-curious|mocktail\w*|alcohol-free|no-phone|phone-free|touch grass|meditat\w*|cold plunge|plunge|yoga|sleep|mindful\w*|wellness|detox|journal\w*|walk-and-talk)\b/,
  giving: /\b(volunteer\w*|donat\w*|charity|clean up|cleanup|thank-you|thank you|care packages?|nonprofit|shelter|food bank|kindness|include someone|left out|surprise someone)\b/,
  campus: /\b(campus|dorm|dorms|floor|finals|professor|office hours|lecture|class|library|rush|club|clubs|dining hall|ta|seniors?|semester|graduation|roommates?|student)\b/,
};

type Taggable = { title?: string; description?: string; location?: string; cardSuit?: string };

/** Pick up to MAX_INTERESTS interests for a quest from its text. Always returns at least one. */
export function inferInterests(q: Taggable): Interest[] {
  const text = `${q.title ?? ''} ${q.description ?? ''} ${q.location ?? ''}`.toLowerCase();
  const scored = INTEREST_KEYS.map((key, order) => {
    const hits = text.match(new RegExp(RULES[key].source, 'g'))?.length ?? 0;
    // Weight the title: it is the clearest statement of what a quest is about.
    const titleHits = (q.title ?? '').toLowerCase().match(new RegExp(RULES[key].source, 'g'))?.length ?? 0;
    return { key, order, score: hits + titleHits * 2 };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const picked = scored.slice(0, MAX_INTERESTS).map((x) => x.key);
  if (picked.length > 0) return picked;
  // Nothing matched: fall back on the suit's flavour so every quest is filterable.
  const fallback: Record<string, Interest> = { spades: 'fitness', hearts: 'friends', diamonds: 'learning', clubs: 'friends' };
  return [fallback[q.cardSuit ?? ''] ?? 'friends'];
}
