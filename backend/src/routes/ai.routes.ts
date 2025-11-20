import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { requireAuth, verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/analyze', verifyToken, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    const result = await aiService.analyzeImage(image);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const aiRoutes = router;