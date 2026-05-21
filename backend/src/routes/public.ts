import { Router } from 'express';
import { getPublicTrip, addGuestPhoto } from '../controllers/tripsController';

const router = Router();

router.get('/trips/:token', getPublicTrip);
router.post('/:shareToken/photos', addGuestPhoto);

export default router;
