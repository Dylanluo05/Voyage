import type { PublicSidequest } from '../../types';

/* Cover photo for a quest, if there is a real one. Priority: the viewer's own proof photo, the
   creator's chosen cover, then any public completion photo. Returns null otherwise and the caller
   draws an illustration (Voyage-made quests) or suit art. There is deliberately no stock-photo
   guessing: a generic photo that doesn't match the quest is worse than none. */

export function useQuestCover(quest: PublicSidequest, userId?: string): string | null {
  const own = userId ? quest.completions.find((c) => c.userId === userId)?.photoUrl : undefined;
  const publicPhoto = quest.completions.find((c) => c.isPublic)?.photoUrl;
  return own || quest.coverImageUrl || publicPhoto || null;
}
