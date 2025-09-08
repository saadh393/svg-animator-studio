import { Router } from 'express';
import { exportGifHandler, exportWebpHandler } from '../controllers/exportController.js';

const router = Router();

router.post('/gif', exportGifHandler);
router.post('/webp', exportWebpHandler);

export default router;

