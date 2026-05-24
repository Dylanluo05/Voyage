import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { searchPhotos } from '../controllers/photosController';

const router = Router();
router.get('/search', requireAuth, searchPhotos);
export default router;
