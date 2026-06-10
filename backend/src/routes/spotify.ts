import { Router } from 'express';
import { spotifyCallback } from '../controllers/spotifyController';

const router = Router();

router.get('/callback', spotifyCallback);

export default router;
