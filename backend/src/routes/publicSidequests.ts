import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listPublicSidequests, listClaimedSidequests, createPublicSidequest, claimPublicSidequest, completePublicSidequest } from '../controllers/publicSidequestsController';

const router = Router();

router.get('/', listPublicSidequests);

router.use(requireAuth);

router.get('/claimed', listClaimedSidequests);
router.post('/', createPublicSidequest);
router.patch('/:id/claim', claimPublicSidequest);
router.patch('/:id/complete', completePublicSidequest);

export default router;