import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// TODO: Implement category routes
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Category routes coming soon' });
});

export default router;