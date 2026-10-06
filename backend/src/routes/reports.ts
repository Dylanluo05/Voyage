import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { createReport, listReports, updateReportStatus, removeReportedContent } from '../controllers/reportsController';

const router = Router();

router.use(requireAuth);

router.post('/', createReport);
router.get('/', requireAdmin, listReports);
router.patch('/:id', requireAdmin, updateReportStatus);
router.post('/:id/remove-content', requireAdmin, removeReportedContent);

export default router;
