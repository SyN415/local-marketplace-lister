import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { aiService } from '../services/ai.service';
import { requireAuth, verifyToken } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', verifyToken, requireAuth, upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    // Convert buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const result = await aiService.analyzeImage(imageBase64);
    
    res.json(result);
  } catch (error) {
    console.error('AI Analysis Route Error:', error);
    next(error);
  }
});

export const aiRoutes = router;