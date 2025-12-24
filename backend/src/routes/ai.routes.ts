import { Router } from 'express';
import { verifyToken as authMiddleware } from '../middleware/auth.middleware';
import { aiService } from '../services/ai.service';

const router = Router();

export { router as aiRoutes };

/**
 * POST /api/ai/analyze-listing
 * Analyze a listing with multiple images for eBay search optimization
 * Used by the multi-modal item identification pipeline in the extension
 */
router.post('/analyze-listing', authMiddleware, async (req, res, next) => {
  try {
    const { images, context } = req.body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'images array is required'
      });
    }

    // Limit to 5 images to prevent abuse
    const imagesToAnalyze = images.slice(0, 5);

    // Validate image URLs
    for (const img of imagesToAnalyze) {
      if (typeof img !== 'string' || img.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image URL format'
        });
      }
    }

    // Call AI service
    const analysis = await aiService.analyzeListingForSearch(
      imagesToAnalyze,
      {
        title: context?.title,
        description: context?.description
      }
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-listing:', error);
    
    // Handle specific error cases
    if (error.message?.includes('not configured')) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'OPENROUTER_API_KEY is not set'
      });
    }
    
    if (error.message?.includes('No images provided')) {
      return res.status(400).json({
        success: false,
        error: 'No images provided'
      });
    }

    next(error);
  }
});

/**
 * POST /api/ai/analyze-text
 * Analyze text (title + description) to extract structured product information
 * Fallback when image analysis is not available
 */
router.post('/analyze-text', authMiddleware, async (req, res, next) => {
  try {
    const { title, description } = req.body;

    // Validate input
    if (!title || typeof title !== 'string' || title.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'title is required and must be at least 3 characters'
      });
    }

    // Call AI service
    const analysis = await aiService.analyzeTextForSearch(
      title,
      description || ''
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-text:', error);
    
    if (error.message?.includes('not configured')) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'OPENROUTER_API_KEY is not set'
      });
    }

    next(error);
  }
});

/**
 * POST /api/ai/analyze-image
 * Analyze a single image for listing creation
 * Original endpoint for creating listings from images
 */
router.post('/analyze-image', authMiddleware, async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'image is required'
      });
    }

    const result = await aiService.analyzeImage(image);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-image:', error);
    
    if (error.message?.includes('not configured')) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'OPENROUTER_API_KEY is not set'
      });
    }

    next(error);
  }
});

export default router;
