import { UserDoc } from '../models/User';
import { Trip } from '../models/Trip';
import { PublicSidequest } from '../models/PublicSidequest';
import { EmailOtp } from '../models/EmailOtp';
import { PasswordReset } from '../models/PasswordReset';
import { getStripe } from './stripe';

export async function deleteAccount(user: UserDoc): Promise<void> {
  if (user.aiUsage?.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(user.aiUsage.stripeSubscriptionId);
    } catch (err) {
      console.error('[account deletion] failed to cancel Stripe subscription', err);
    }
  }

  // Trips this user owns are deleted outright; trips they only collaborate
  // on keep going for the owner and other collaborators.
  await Trip.deleteMany({ owner: user._id });
  await Trip.updateMany({ collaborators: user._id }, { $pull: { collaborators: user._id } });

  await PublicSidequest.updateMany(
    {
      $or: [
        { 'claims.userId': user._id },
        { 'completions.userId': user._id },
        { 'comments.userId': user._id },
        { 'event.enrollments.userId': user._id },
      ],
    },
    {
      $pull: {
        claims: { userId: user._id },
        completions: { userId: user._id },
        comments: { userId: user._id },
        'event.enrollments': { userId: user._id },
      },
    }
  );

  await EmailOtp.deleteMany({ email: user.email });
  await PasswordReset.deleteMany({ userId: user._id });

  await user.deleteOne();
}
