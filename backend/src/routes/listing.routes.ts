import { Router, Request, Response } from 'express';
import { listingService } from '../services/listing.service';
import { verifyToken } from '../middleware/auth.middleware';
import { validateListingCreation, validateListingUpdate, validateListingFilters } from '../middleware/validation.middleware';
import { CreateListingRequest, UpdateListingRequest, ListingFilters } from '../types/listing.types';
import { LISTING_CONDITIONS, LISTING_STATUSES } from '../types/listing.types';

const router = Router();

/**
 * @route   POST /api/listings
 * @desc    Create a new listing
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @body    { title: string, description: string, price: number, category: string, condition: string, images?: string[], location_lat?: number, location_lng?: number, location_address?: string, status?: 'draft' | 'active' }
 */
router.post('/', verifyToken, validateListingCreation, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const listingData: CreateListingRequest = req.body;
    const response = await listingService.createListing(req.user.id, listingData);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create listing route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during listing creation'
    });
  }
});

/**
 * @route   GET /api/listings
 * @desc    Get all listings for authenticated user with pagination and filters
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @query   { page?: number, limit?: number, category?: string, condition?: string, status?: string, min_price?: number, max_price?: number, location_lat?: number, location_lng?: number, radius_km?: number }
 */
router.get('/', verifyToken, validateListingFilters, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build filters from query params
    const filters: ListingFilters = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.condition && LISTING_CONDITIONS.includes(req.query.condition as any)) {
      filters.condition = req.query.condition as any;
    }
    if (req.query.status && LISTING_STATUSES.includes(req.query.status as any)) {
      filters.status = req.query.status as any;
    }
    if (req.query.min_price) filters.min_price = parseFloat(req.query.min_price as string);
    if (req.query.max_price) filters.max_price = parseFloat(req.query.max_price as string);
    if (req.query.location_lat) filters.location_lat = parseFloat(req.query.location_lat as string);
    if (req.query.location_lng) filters.location_lng = parseFloat(req.query.location_lng as string);
    if (req.query.radius_km) filters.radius_km = parseFloat(req.query.radius_km as string);

    const response = await listingService.getListingsByUser(req.user.id, page, limit, filters);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Get listings route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during listings retrieval'
    });
  }
});

/**
 * @route   GET /api/listings/:id
 * @desc    Get single listing by ID (with ownership verification)
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @params  { id: string }
 */
router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const listingId = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid listing ID format'
      });
      return;
    }

    const response = await listingService.getListingById(listingId, req.user.id);

    if (!response.success) {
      if (response.error === 'Listing not found') {
        res.status(404).json(response);
      } else {
        res.status(400).json(response);
      }
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Get listing by ID route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during listing retrieval'
    });
  }
});

/**
 * @route   PUT /api/listings/:id
 * @desc    Update listing (with ownership verification)
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @params  { id: string }
 * @body    { title?: string, description?: string, price?: number, category?: string, condition?: string, images?: string[], location_lat?: number, location_lng?: number, location_address?: string, status?: string }
 */
router.put('/:id', verifyToken, validateListingUpdate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const listingId = req.params.id;
    const updateData: UpdateListingRequest = req.body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid listing ID format'
      });
      return;
    }

    const response = await listingService.updateListing(listingId, req.user.id, updateData);

    if (!response.success) {
      if (response.error === 'Listing not found') {
        res.status(404).json(response);
      } else {
        res.status(400).json(response);
      }
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Update listing route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during listing update'
    });
  }
});

/**
 * @route   DELETE /api/listings/:id
 * @desc    Delete listing (with ownership verification)
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

    const listingId = req.params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(listingId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid listing ID format'
      });
      return;
    }

    const response = await listingService.deleteListing(listingId, req.user.id);

    if (!response.success) {
      if (response.error === 'Listing not found') {
        res.status(404).json(response);
      } else {
        res.status(400).json(response);
      }
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Delete listing route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during listing deletion'
    });
  }
});

/**
 * @route   GET /api/listings/stats
 * @desc    Get listing statistics for authenticated user
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.get('/stats', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const response = await listingService.getListingStats(req.user.id);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Get listing stats route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during statistics retrieval'
    });
  }
});

/**
 * @route   GET /api/listings/search
 * @desc    Search listings by query and filters
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @query   { q: string, page?: number, limit?: number, category?: string, condition?: string, status?: string, min_price?: number, max_price?: number, location_lat?: number, location_lng?: number, radius_km?: number }
 */
router.get('/search', verifyToken, validateListingFilters, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const query = req.query.q as string;
    if (!query || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Build filters from query params
    const filters: ListingFilters = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.condition && LISTING_CONDITIONS.includes(req.query.condition as any)) {
      filters.condition = req.query.condition as any;
    }
    if (req.query.status && LISTING_STATUSES.includes(req.query.status as any)) {
      filters.status = req.query.status as any;
    }
    if (req.query.min_price) filters.min_price = parseFloat(req.query.min_price as string);
    if (req.query.max_price) filters.max_price = parseFloat(req.query.max_price as string);
    if (req.query.location_lat) filters.location_lat = parseFloat(req.query.location_lat as string);
    if (req.query.location_lng) filters.location_lng = parseFloat(req.query.location_lng as string);
    if (req.query.radius_km) filters.radius_km = parseFloat(req.query.radius_km as string);

    const searchRequest = {
      query: query.trim(),
      filters,
      page,
      limit
    };

    const response = await listingService.searchListings(req.user.id, searchRequest);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Search listings route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during search'
    });
  }
});

// Health check endpoint for listing routes
router.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Listing routes are healthy',
    timestamp: new Date().toISOString()
  });
});

export const listingRoutes = router;
export default listingRoutes;