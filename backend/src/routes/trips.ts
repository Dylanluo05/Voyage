import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listTrips,
  createTrip,
  getTrip,
  updateTrip,
  deleteTrip,
  addItem,
  updateItem,
  deleteItem,
} from '../controllers/tripsController';

const router = Router();

router.use(requireAuth);

router.get('/', listTrips);
router.post('/', createTrip);
router.get('/:id', getTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

router.post('/:id/items', addItem);
router.put('/:id/items/:itemId', updateItem);
router.delete('/:id/items/:itemId', deleteItem);

export default router;
