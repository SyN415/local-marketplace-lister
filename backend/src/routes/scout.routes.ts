import { Router } from 'express';
import { verifyToken as authMiddleware } from '../middleware/auth.middleware';
import { ScoutService } from '../services/scout.service';

const router = Router();
const scoutService = new ScoutService();

// Watchlist Management
router.get('/watchlist', authMiddleware, async (req, res, next) => {
  try {
    const watchlists = await scoutService.getUserWatchlists(req.user!.id);
    res.json({ success: true, data: watchlists });
  } catch (error) {
    next(error);
  }
});

router.post('/watchlist', authMiddleware, async (req, res, next) => {
  try {
    const watchlist = await scoutService.createWatchlist(req.user!.id, req.body);
    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
});

router.put('/watchlist/:id', authMiddleware, async (req, res, next) => {
  try {
    const watchlist = await scoutService.updateWatchlist(req.params.id, req.user!.id, req.body);
    res.json({ success: true, data: watchlist });
  } catch (error) {
    next(error);
  }
});

router.delete('/watchlist/:id', authMiddleware, async (req, res, next) => {
  try {
    await scoutService.deleteWatchlist(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Price Intelligence (Proxy for extension)
router.get('/price-intelligence', authMiddleware, async (req, res, next) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }
    
    const data = await scoutService.getPriceIntelligence(query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Market Comparisons (saved deals)
router.get('/comparisons', authMiddleware, async (req, res, next) => {
  try {
    const comparisons = await scoutService.getUserComparisons(req.user!.id);
    res.json({ success: true, data: comparisons });
  } catch (error) {
    next(error);
  }
});

router.post('/comparisons', authMiddleware, async (req, res, next) => {
  try {
    const comparison = await scoutService.saveComparison(req.user!.id, req.body);
    res.json({ success: true, data: comparison });
  } catch (error) {
    next(error);
  }
});

export default router;