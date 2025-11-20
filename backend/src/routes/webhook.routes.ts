import express from 'express';
import { handleWebhook } from '../services/stripe.service';

const router = express.Router();

// Webhook handler
// Note: This route needs raw body parsing, which should be handled in server.ts or here
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).send('Missing stripe-signature header');
    }

    await handleWebhook(signature as string, req.body);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;