import { Types } from 'mongoose';
import { Trip } from '../models/Trip';

export async function linkPendingInvites(userId: Types.ObjectId, email: string): Promise<void> {
  const lower = email.toLowerCase();
  await Trip.updateMany(
    { 'pendingCollaborators.email': lower },
    {
      $pull: { pendingCollaborators: { email: lower } },
      $addToSet: { collaborators: userId },
    }
  );
}
