import express from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { createCheckoutSession } from '../services/stripe.service';
import { config } from '../config/config';

const router = express.Router();

// Create checkout session
router.post('/create-checkout-session', verifyToken, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { priceId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const session = await createCheckoutSession(userId, priceId);
    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});


export default router;