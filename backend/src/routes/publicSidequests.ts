import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listPublicSidequests, listClaimedSidequests, createPublicSidequest, claimPublicSidequest, unclaimPublicSidequest, completePublicSidequest, enrollInSidequest, leaveEvent, getLeaderboard, assignClaimToTrip, unassignClaimFromTrip, listSidequestsByTrip, addComment, removeComment, createEvent } from '../controllers/publicSidequestsController';

const router = Router();

router.get('/', listPublicSidequests);
router.get('/leaderboard', getLeaderboard);

router.use(requireAuth);

router.get('/claimed', listClaimedSidequests);
router.get('/by-trip/:tripId', listSidequestsByTrip);
router.post('/', createPublicSidequest);
router.patch('/:id/claim', claimPublicSidequest);
router.patch('/:id/unclaim', unclaimPublicSidequest);
router.patch('/:id/complete', completePublicSidequest);
router.post('/:id/event', createEvent);
router.patch('/:id/enroll', enrollInSidequest);
router.patch('/:id/leave', leaveEvent);
router.patch('/:id/assign-trip', assignClaimToTrip);
router.patch('/:id/unassign-trip', unassignClaimFromTrip);
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', removeComment);

export default router;