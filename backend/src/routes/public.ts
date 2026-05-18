import { Router } from 'express';
import { getPublicTrip } from '../controllers/tripsController';

const router = Router();

router.get('/trips/:token', getPublicTrip);

export default router;
