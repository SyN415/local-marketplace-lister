import { Router, Request, Response } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { emailProxyService } from '../services/email-proxy.service';
import { gmailApiService } from '../services/gmail-api.service';

const router = Router();

// All admin routes require authentication
router.use(verifyToken);
router.use(requireAdmin);

// TODO: Add admin role check middleware

// Get proxy pool statistics
router.get('/proxy-pool/stats', async (req: Request, res: Response) => {
  try {
    const stats = await emailProxyService.getPoolStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting pool stats:', error);
    res.status(500).json({ error: 'Failed to get pool statistics' });
  }
});

// Get OAuth URL for adding a new proxy account
router.get('/proxy-pool/auth-url', async (req: Request, res: Response) => {
  try {
    const state = Buffer.from(JSON.stringify({ 
      action: 'add-proxy',
      timestamp: Date.now()
    })).toString('base64');
    
    const authUrl = gmailApiService.getAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle OAuth callback for adding proxy
router.post('/proxy-pool/add', async (req: Request, res: Response) => {
  try {
    const { code, email } = req.body;
    
    if (!code || !email) {
      return res.status(400).json({ error: 'Code and email are required' });
    }

    // Exchange code for tokens
    const credentials = await gmailApiService.getTokensFromCode(code);
    
    // Add to pool
    const proxyId = await emailProxyService.addProxyToPool(email, credentials);
    
    res.json({ success: true, proxyId });
  } catch (error) {
    console.error('Error adding proxy to pool:', error);
    res.status(500).json({ error: 'Failed to add proxy to pool' });
  }
});

// Trigger cooldown processing manually
router.post('/proxy-pool/process-cooldowns', async (req: Request, res: Response) => {
  try {
    const count = await emailProxyService.processCooldownExpiration();
    res.json({ processed: count });
  } catch (error) {
    console.error('Error processing cooldowns:', error);
    res.status(500).json({ error: 'Failed to process cooldowns' });
  }
});

export default router;