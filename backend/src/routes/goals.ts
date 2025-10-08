import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// TODO: Implement goal routes
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Goal routes coming soon' });
});

export default router;