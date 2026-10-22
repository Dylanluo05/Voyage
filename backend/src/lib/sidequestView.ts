import { Types } from 'mongoose';

type Plain = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Strips what a given viewer isn't allowed to see from a sidequest: photos
 * (and the names behind them) from completions that were not marked public,
 * and other users' trip links on claims. The viewer's own entries are untouched.
 */
export interface Viewer {
  id?: string;
  isAdmin?: boolean;
}

export function sidequestView<T extends { toObject?: () => Plain }>(sq: T, viewer?: Viewer | string): Plain {
  const v: Viewer = typeof viewer === 'string' ? { id: viewer } : viewer ?? {};
  const viewerId = v.id;
  const obj: Plain = typeof sq.toObject === 'function' ? sq.toObject() : { ...(sq as Plain) };
  const mine = (id: Types.ObjectId | string | undefined) => !!viewerId && !!id && String(id) === viewerId;

  obj.completions = (obj.completions ?? []).map((c: Plain) =>
    c.isPublic || mine(c.userId) ? c : { ...c, photoUrl: '', userName: 'Someone' }
  );
  // Review requests carry private photos: only the submitter, the quest creator and admins see them.
  const isReviewer = v.isAdmin || mine(obj.createdBy?.userId);
  obj.reviewRequests = (obj.reviewRequests ?? []).filter(
    (r: Plain) => mine(r.userId) || (isReviewer && r.status === 'pending')
  );
  obj.claims = (obj.claims ?? []).map((c: Plain) => {
    if (mine(c.userId)) return c;
    const { tripId: _tripId, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
  });
  return obj;
}

export function sidequestViews(list: Array<{ toObject?: () => Plain }>, viewer?: Viewer | string): Plain[] {
  return list.map((sq) => sidequestView(sq, viewer));
}
