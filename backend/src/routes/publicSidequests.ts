import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { listPublicSidequests, listClaimedSidequests, createPublicSidequest, claimPublicSidequest, unclaimPublicSidequest, completePublicSidequest, enrollInSidequest, leaveEvent, getLeaderboard, assignClaimToTrip, unassignClaimFromTrip, listSidequestsByTrip, addComment, removeComment, createEvent, requestReview, listReviewQueue, reviewCompletion } from '../controllers/publicSidequestsController';

const router = Router();

router.get('/', optionalAuth, listPublicSidequests);
router.get('/leaderboard', getLeaderboard);

router.use(requireAuth);

router.get('/claimed', listClaimedSidequests);
router.get('/review-queue', listReviewQueue);
router.get('/by-trip/:tripId', listSidequestsByTrip);
router.post('/', createPublicSidequest);
router.patch('/:id/claim', claimPublicSidequest);
router.patch('/:id/unclaim', unclaimPublicSidequest);
router.patch('/:id/complete', completePublicSidequest);
router.post('/:id/request-review', requestReview);
router.post('/:id/review/:requestId', reviewCompletion);
router.post('/:id/event', createEvent);
router.patch('/:id/enroll', enrollInSidequest);
router.patch('/:id/leave', leaveEvent);
router.patch('/:id/assign-trip', assignClaimToTrip);
router.patch('/:id/unassign-trip', unassignClaimFromTrip);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', removeComment);

export default router;