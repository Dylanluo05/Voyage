import type { PublicSidequest } from '../../types';

export type Suit = PublicSidequest['cardSuit'];
export type Rank = PublicSidequest['cardRank'];

export const SUIT_ORDER: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const SUITS: Record<Suit, { name: string; pip: string; category: string }> = {
  spades: { name: 'Spades', pip: '♠', category: 'Physical' },
  hearts: { name: 'Hearts', pip: '♥', category: 'Social' },
  diamonds: { name: 'Diamonds', pip: '♦', category: 'Intellectual' },
  clubs: { name: 'Clubs', pip: '♣', category: 'Teamwork' },
};

export const RANK_ORDER: Rank[] = ['J', 'Q', 'K', 'A'];

export const RANK_LABEL: Record<Rank, string> = {
  J: 'Beginner',
  Q: 'Novice',
  K: 'Intermediate',
  A: 'Advanced',
};

const BASE_XP: Record<Rank, number> = { J: 250, Q: 500, K: 750, A: 1000 };
const SUIT_MULT: Record<Suit, number> = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };

/** Mirrors backend computeXp(). */
export function xpFor(suit: Suit, rank: Rank): number {
  return Math.round((BASE_XP[rank] * SUIT_MULT[suit]) / 5) * 5;
}
