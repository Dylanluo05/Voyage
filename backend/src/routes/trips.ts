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
  updateBudget,
  searchSpotify,
  addTrack,
  removeTrack,
  recommendByVibe,
  markCompleted,
  addLogPhoto,
  removeLogPhoto,
  rateItem,
  addHotel,
  removeHotel,
  addFlight,
  removeFlight,
  addExpense,
  removeExpense,
  settleSplit,
  addSidequest,
  removeSidequest,
  assignSidequest,
  completeSidequest,
  addComment,
  removeComment,
  updateDayAnchor,
  getTripEvents,
  issueSseToken,
  publishTrip,
  listPublicTrips,
  addPublicSidequestToTrip,
  publishSidequest,
  exportPlaylist,
} from '../controllers/tripsController';
import { parseHotelConfirmation, parseFlightConfirmation } from '../controllers/importController';
import { tripChat } from '../controllers/chatController';

const router = Router();

router.get('/:id/events', getTripEvents);
router.get('/public', listPublicTrips);

router.use(requireAuth);

router.post('/:id/sse-token', issueSseToken);

router.patch('/:id/public', publishTrip);

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
router.post('/:id/chat', tripChat);

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

router.put('/:id/budget', updateBudget);

router.get('/:id/playlist/search', searchSpotify);
router.get('/:id/playlist/recommend', recommendByVibe);
router.get('/:id/playlist/export', exportPlaylist);
router.post('/:id/playlist', addTrack);
router.delete('/:id/playlist/:trackId', removeTrack);

router.post('/:id/collaborators', inviteCollaborator);
router.delete('/:id/collaborators/:userId', removeCollaborator);

router.put('/:id/complete', markCompleted);
router.post('/:id/log/photos', addLogPhoto);
router.delete('/:id/log/photos/:photoId', removeLogPhoto);
router.put('/:id/log/items/:itemId/rating', rateItem);

router.post('/:id/hotels', addHotel);
router.delete('/:id/hotels/:hotelId', removeHotel);
router.post('/:id/hotels/parse', parseHotelConfirmation);
router.post('/:id/flights', addFlight);
router.delete('/:id/flights/:flightId', removeFlight);
router.post('/:id/flights/parse', parseFlightConfirmation);

router.post('/:id/expenses', addExpense);
router.delete('/:id/expenses/:expenseId', removeExpense);
router.patch('/:id/expenses/:expenseId/splits/:userId', settleSplit);

router.patch('/:id/day-anchor', updateDayAnchor);

router.post('/:id/sidequests', addSidequest);
router.delete('/:id/sidequests/:sidequestId', removeSidequest);
router.patch('/:id/sidequests/:sidequestId/assign', assignSidequest);
router.patch('/:id/sidequests/:sidequestId/complete', completeSidequest);
router.post('/:id/sidequests/:sidequestId/comments', addComment);
router.delete('/:id/sidequests/:sidequestId/comments/:commentId', removeComment);
router.post('/:id/sidequests/from-public/:publicSidequestId', addPublicSidequestToTrip);
router.post('/:id/sidequests/:sidequestId/publish', publishSidequest);

export default router;
