import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { listPublicSidequests, createPublicSidequest, completePublicSidequest } from '../controllers/publicSidequestsController';

const router = Router();

router.get('/', listPublicSidequests);

router.use(requireAuth);

router.post('/', createPublicSidequest);
router.patch('/:id/complete', completePublicSidequest);

export default router;