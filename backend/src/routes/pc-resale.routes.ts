/**
 * PC Resale Scanner Routes
 * Endpoints for analyzing PC build listings for profitable part resale
 */

import { Router } from 'express';
import { verifyToken as authMiddleware } from '../middleware/auth.middleware';
import { PcResaleService, MarketplaceListing } from '../services/pc-resale.service';

const router = Router();
const pcResaleService = new PcResaleService();

/**
 * POST /api/pc-resale/analyze
 * Analyze a single listing for resale potential
 */
router.post('/analyze', authMiddleware, async (req, res, next) => {
  try {
    const listing: MarketplaceListing = {
      platform: req.body.platform,
      platformListingUrl: req.body.platformListingUrl || req.body.listingUrl,
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      imageUrls: req.body.imageUrls || req.body.images,
      sellerLocation: req.body.sellerLocation || req.body.location,
    };

    // Validate required fields
    if (!listing.title || !listing.price || isNaN(listing.price)) {
      return res.status(400).json({
        success: false,
        error: 'Title and valid price are required',
      });
    }

    if (!listing.platform) {
      listing.platform = 'facebook'; // Default platform
    }

    const analysis = await pcResaleService.analyzeListing(listing);
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pc-resale/analyze-and-save
 * Analyze and save a listing as an opportunity
 */
router.post('/analyze-and-save', authMiddleware, async (req, res, next) => {
  try {
    const listing: MarketplaceListing = {
      platform: req.body.platform || 'facebook',
      platformListingUrl: req.body.platformListingUrl || req.body.listingUrl || '',
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      imageUrls: req.body.imageUrls || req.body.images,
      sellerLocation: req.body.sellerLocation || req.body.location,
    };

    if (!listing.title || !listing.price || isNaN(listing.price)) {
      return res.status(400).json({
        success: false,
        error: 'Title and valid price are required',
      });
    }

    const analysis = await pcResaleService.analyzeListing(listing);
    const saved = await pcResaleService.saveOpportunity(req.user!.id, analysis);
    
    res.json({
      success: true,
      data: {
        ...analysis,
        saved,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pc-resale/opportunities
 * Get user's saved PC resale opportunities
 */
router.get('/opportunities', authMiddleware, async (req, res, next) => {
  try {
    const filters = {
      recommendation: req.query.recommendation as 'BUY' | 'SKIP' | undefined,
      status: req.query.status as string | undefined,
      minRoi: req.query.minRoi ? parseFloat(req.query.minRoi as string) : undefined,
    };

    const opportunities = await pcResaleService.getUserOpportunities(req.user!.id, filters);
    
    res.json({
      success: true,
      data: opportunities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pc-resale/opportunities/:id
 * Get detailed opportunity info
 */
router.get('/opportunities/:id', authMiddleware, async (req, res, next) => {
  try {
    const details = await pcResaleService.getOpportunityDetails(req.params.id, req.user!.id);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found',
      });
    }
    
    res.json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/pc-resale/opportunities/:id
 * Update opportunity status or notes
 */
router.patch('/opportunities/:id', authMiddleware, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }
    
    await pcResaleService.updateOpportunityStatus(
      req.params.id,
      req.user!.id,
      status,
      notes
    );
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/pc-resale/opportunities/:id
 * Delete an opportunity
 */
router.delete('/opportunities/:id', authMiddleware, async (req, res, next) => {
  try {
    await pcResaleService.deleteOpportunity(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pc-resale/report
 * Generate daily report summary
 */
router.get('/report', authMiddleware, async (req, res, next) => {
  try {
    const report = await pcResaleService.generateDailyReport(req.user!.id);
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/pc-resale/check-pc-build
 * Check if text represents a PC build listing
 */
router.post('/check-pc-build', authMiddleware, async (req, res, next) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }
    
    const isPcBuild = pcResaleService.isPcBuildListing(title, description);
    
    res.json({
      success: true,
      data: { isPcBuild },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

