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
  reorderItems,
  createGroup,
  renameGroup,
  dissolveGroup,
  toggleReaction,
  inviteCollaborator,
  removeCollaborator,
  createDebate,
  deleteDebate,
  addDebateOption,
  updateDebateOption,
  deleteDebateOption,
  voteDebateOption,
  addDebateComment,
  deleteDebateComment,
} from '../controllers/tripsController';
import { getRecommendations } from '../controllers/recommendationsController';

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
router.post('/:id/reorder', reorderItems);
router.put('/:id/items/:itemId/react', toggleReaction);
router.get('/:id/recommendations', getRecommendations);

router.post('/:id/groups', createGroup);
router.put('/:id/groups/:groupId', renameGroup);
router.delete('/:id/groups/:groupId', dissolveGroup);

router.post('/:id/debates', createDebate);
router.delete('/:id/debates/:debateId', deleteDebate);
router.post('/:id/debates/:debateId/options', addDebateOption);
router.put('/:id/debates/:debateId/options/:optionId', updateDebateOption);
router.delete('/:id/debates/:debateId/options/:optionId', deleteDebateOption);
router.put('/:id/debates/:debateId/options/:optionId/vote', voteDebateOption);
router.post('/:id/debates/:debateId/comments', addDebateComment);
router.delete('/:id/debates/:debateId/comments/:commentId', deleteDebateComment);

router.post('/:id/collaborators', inviteCollaborator);
router.delete('/:id/collaborators/:userId', removeCollaborator);

export default router;
