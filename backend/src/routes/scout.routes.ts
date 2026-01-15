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

    // Optional enhanced search metadata
    const condition = (req.query.condition as string) || undefined;
    const brand = (req.query.brand as string) || undefined;
    const model = (req.query.model as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const currentPriceRaw = (req.query.currentPrice as string) || undefined;
    const currentPrice = currentPriceRaw ? Number(currentPriceRaw) : undefined;
    const specsRaw = (req.query.specs as string) || undefined;
    let specs: Record<string, string> | undefined;
    if (specsRaw) {
      try {
        specs = JSON.parse(specsRaw);
      } catch {
        // ignore malformed specs
      }
    }

    const data = await scoutService.getPriceIntelligence(query, {
      condition,
      brand,
      model,
      categoryId,
      currentPrice,
      specs
    });
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

// eBay Notification Endpoint
router.get('/ebay-notifications', async (req, res) => {
  try {
    const challengeCode = req.query.challenge_code as string;
    // eBay sends the verification token as a query parameter in the GET request?
    // Documentation says: "When you save your settings, eBay sends a GET request to your endpoint with a challenge_code parameter."
    // It doesn't explicitly mention the verification token being sent back, but we need it to verify the hash.
    // Actually, we use our STORED verification token to hash the challenge code.
    
    // We also need the verification token to validate the request is from eBay if possible, but the challenge response proves ownership.
    
    if (!challengeCode) {
        return res.status(400).send('Missing challenge_code');
    }

    // We need to use the token we configured in the eBay developer portal
    const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
    
    if (!verificationToken) {
        console.error('EBAY_VERIFICATION_TOKEN not configured on server');
        return res.status(500).send('Server misconfiguration');
    }

    const challengeResponse = scoutService.verifyEbayNotification(challengeCode, verificationToken);
    
    if (!challengeResponse) {
        return res.status(500).send('Failed to generate challenge response');
    }

    res.json({ challengeResponse });
  } catch (error) {
    console.error('eBay notification verification error:', error);
    res.status(500).send('Error processing verification');
  }
});

// Handle incoming notifications (POST)
router.post('/ebay-notifications', async (req, res) => {
    // eBay sends notifications for various events (e.g., MARKETPLACE_ACCOUNT_DELETION)
    // Currently we just acknowledge receipt without logging to reduce noise
    // TODO: Implement actual handling if needed for specific notification types
    res.sendStatus(200);
});

export default router;
