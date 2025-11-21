import { Router, Request, Response } from 'express';
import { connectionService } from '../services/connection.service';
import { facebookAuthService } from '../services/facebook.auth.service';
import { verifyToken } from '../middleware/auth.middleware';
import { validateConnectionCreation } from '../middleware/validation.middleware';
import { CreateConnectionRequest } from '../types/connection.types';

const router = Router();

/**
 * @route   GET /api/connections/facebook/auth
 * @desc    Get Facebook OAuth URL
 * @access  Private
 */
router.get('/facebook/auth', verifyToken, (req: Request, res: Response) => {
  try {
     if (!req.user) {
       res.status(401).json({ success: false, error: 'User not authenticated' });
       return;
     }
     // Pass user ID in state if needed, or just for CSRF
     const state = req.user.id;
     const authUrl = facebookAuthService.getAuthUrl(state);
     res.status(200).json({ success: true, url: authUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

/**
 * @route   POST /api/connections/facebook/callback
 * @desc    Handle Facebook OAuth callback
 * @access  Private
 */
router.post('/facebook/callback', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Authorization code is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const response = await connectionService.handleFacebookCallback(code, req.user.id);
    
    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Facebook callback route error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/connections
 * @desc    Get all marketplace connections for authenticated user
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const response = await connectionService.getUserConnections(req.user.id);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Get connections route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during connections retrieval'
    });
  }
});

/**
 * @route   POST /api/connections
 * @desc    Create or update a marketplace connection
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @body    { platform: 'facebook' | 'offerup' | 'craigslist', credentials: { ... } }
 */
router.post('/', verifyToken, validateConnectionCreation, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const connectionData: CreateConnectionRequest = req.body;
    const response = await connectionService.createOrUpdateConnection(req.user.id, connectionData);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    // If created/updated, return 200 or 201. 200 is fine for createOrUpdate.
    res.status(200).json(response);
  } catch (error) {
    console.error('Create/Update connection route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during connection save'
    });
  }
});

/**
 * @route   DELETE /api/connections/:id
 * @desc    Delete a marketplace connection
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @params  { id: string }
 */
router.delete('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const connectionId = req.params.id;
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid connection ID format'
      });
      return;
    }

    const response = await connectionService.deleteConnection(req.user.id, connectionId);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete connection route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during connection deletion'
    });
  }
});

export const connectionRoutes = router;
export default connectionRoutes;