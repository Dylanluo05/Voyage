import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listPublicSidequests, listClaimedSidequests, createPublicSidequest, claimPublicSidequest, unclaimPublicSidequest, completePublicSidequest, enrollInSidequest, leaveEvent, getLeaderboard } from '../controllers/publicSidequestsController';

const router = Router();

router.get('/', listPublicSidequests);
router.get('/leaderboard', getLeaderboard);

router.use(requireAuth);

router.get('/claimed', listClaimedSidequests);
router.post('/', createPublicSidequest);
router.patch('/:id/claim', claimPublicSidequest);
router.patch('/:id/unclaim', unclaimPublicSidequest);
router.patch('/:id/complete', completePublicSidequest);
router.patch('/:id/enroll', enrollInSidequest);
router.patch('/:id/leave', leaveEvent);

export default router;