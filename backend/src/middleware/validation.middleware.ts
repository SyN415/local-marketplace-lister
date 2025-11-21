import { Request, Response, NextFunction } from 'express';
import {
  CreateListingRequest,
  UpdateListingRequest,
  ListingFilters,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_STATUSES
} from '../types/listing.types';
import {
  CreateConnectionRequest,
  MARKETPLACE_PLATFORMS
} from '../types/connection.types';

/**
 * Middleware for validating listing creation data
 */
export const validateListingCreation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const data: CreateListingRequest = req.body;
  const errors: string[] = [];

  // Validate title
  if (!data.title || typeof data.title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  } else if (data.title.length > 200) {
    errors.push('Title must not exceed 200 characters');
  }

  // Validate description
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length > 0 && data.description.length < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (data.description.length > 5000) {
      errors.push('Description must not exceed 5000 characters');
    }
  }

  // Validate price
  if (data.price === undefined || data.price === null || isNaN(Number(data.price))) {
    errors.push('Price is required and must be a number');
  } else if (Number(data.price) < 0) {
    errors.push('Price must be greater than or equal to 0');
  } else if (Number(data.price) > 999999.99) {
    errors.push('Price must not exceed 999999.99');
  }

  // Validate category
  if (!data.category || typeof data.category !== 'string') {
    errors.push('Category is required and must be a string');
  } else if (!LISTING_CATEGORIES.includes(data.category as any)) {
    errors.push(`Category must be one of: ${LISTING_CATEGORIES.join(', ')}`);
  }

  // Validate condition
  if (!data.condition || typeof data.condition !== 'string') {
    errors.push('Condition is required and must be a string');
  } else if (!LISTING_CONDITIONS.includes(data.condition as any)) {
    errors.push(`Condition must be one of: ${LISTING_CONDITIONS.join(', ')}`);
  }

  // Validate status (optional)
  if (data.status && !LISTING_STATUSES.includes(data.status as any)) {
    errors.push(`Status must be one of: ${LISTING_STATUSES.join(', ')}`);
  }

  // Validate images (optional array)
  if (data.images) {
    if (!Array.isArray(data.images)) {
      errors.push('Images must be an array');
    } else if (data.images.length > 10) {
      errors.push('Maximum 10 images allowed');
    } else {
      // Validate each image URL
      const urlPattern = /^https?:\/\/.+/;
      for (const image of data.images) {
        if (typeof image !== 'string' || !urlPattern.test(image)) {
          errors.push('All images must be valid HTTP/HTTPS URLs');
          break;
        }
      }
    }
  }

  // Validate location coordinates
  if (data.location_lat !== undefined) {
    if (isNaN(Number(data.location_lat)) || Number(data.location_lat) < -90 || Number(data.location_lat) > 90) {
      errors.push('Location latitude must be a number between -90 and 90');
    }
  }

  if (data.location_lng !== undefined) {
    if (isNaN(Number(data.location_lng)) || Number(data.location_lng) < -180 || Number(data.location_lng) > 180) {
      errors.push('Location longitude must be a number between -180 and 180');
    }
  }

  // Validate location address
  if (data.location_address) {
    if (typeof data.location_address !== 'string') {
      errors.push('Location address must be a string');
    } else if (data.location_address.length > 500) {
      errors.push('Location address must not exceed 500 characters');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
};

/**
 * Middleware for validating listing update data
 */
export const validateListingUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const data: UpdateListingRequest = req.body;
  const errors: string[] = [];

  // Check if at least one field is provided
  const fields = ['title', 'description', 'price', 'category', 'condition', 'images', 'location_lat', 'location_lng', 'location_address', 'status'];
  const hasFields = fields.some(field => data[field as keyof UpdateListingRequest] !== undefined);
  
  if (!hasFields) {
    errors.push('At least one field must be provided for update');
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  // Validate title (optional)
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push('Title must be a string');
    } else if (data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    } else if (data.title.length > 200) {
      errors.push('Title must not exceed 200 characters');
    }
  }

  // Validate description (optional)
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (data.description.length > 5000) {
      errors.push('Description must not exceed 5000 characters');
    }
  }

  // Validate price (optional)
  if (data.price !== undefined) {
    if (isNaN(Number(data.price))) {
      errors.push('Price must be a number');
    } else if (Number(data.price) < 0) {
      errors.push('Price must be greater than or equal to 0');
    } else if (Number(data.price) > 999999.99) {
      errors.push('Price must not exceed 999999.99');
    }
  }

  // Validate category (optional)
  if (data.category !== undefined) {
    if (!LISTING_CATEGORIES.includes(data.category as any)) {
      errors.push(`Category must be one of: ${LISTING_CATEGORIES.join(', ')}`);
    }
  }

  // Validate condition (optional)
  if (data.condition !== undefined) {
    if (!LISTING_CONDITIONS.includes(data.condition as any)) {
      errors.push(`Condition must be one of: ${LISTING_CONDITIONS.join(', ')}`);
    }
  }

  // Validate status (optional)
  if (data.status !== undefined) {
    if (!LISTING_STATUSES.includes(data.status as any)) {
      errors.push(`Status must be one of: ${LISTING_STATUSES.join(', ')}`);
    }
  }

  // Validate images (optional array)
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) {
      errors.push('Images must be an array');
    } else if (data.images.length > 10) {
      errors.push('Maximum 10 images allowed');
    } else {
      // Validate each image URL
      const urlPattern = /^https?:\/\/.+/;
      for (const image of data.images) {
        if (typeof image !== 'string' || !urlPattern.test(image)) {
          errors.push('All images must be valid HTTP/HTTPS URLs');
          break;
        }
      }
    }
  }

  // Validate location coordinates (optional)
  if (data.location_lat !== undefined) {
    if (isNaN(Number(data.location_lat)) || Number(data.location_lat) < -90 || Number(data.location_lat) > 90) {
      errors.push('Location latitude must be a number between -90 and 90');
    }
  }

  if (data.location_lng !== undefined) {
    if (isNaN(Number(data.location_lng)) || Number(data.location_lng) < -180 || Number(data.location_lng) > 180) {
      errors.push('Location longitude must be a number between -180 and 180');
    }
  }

  // Validate location address (optional)
  if (data.location_address !== undefined) {
    if (typeof data.location_address !== 'string') {
      errors.push('Location address must be a string');
    } else if (data.location_address.length > 500) {
      errors.push('Location address must not exceed 500 characters');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
};

/**
 * Middleware for validating listing filters
 */
export const validateListingFilters = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const query = req.query;
  const errors: string[] = [];

  // Validate page (optional)
  if (query.page) {
    const page = parseInt(query.page as string);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  // Validate limit (optional)
  if (query.limit) {
    const limit = parseInt(query.limit as string);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be a number between 1 and 100');
    }
  }

  // Validate category (optional)
  if (query.category) {
    if (!LISTING_CATEGORIES.includes(query.category as any)) {
      errors.push(`Category must be one of: ${LISTING_CATEGORIES.join(', ')}`);
    }
  }

  // Validate condition (optional)
  if (query.condition) {
    if (!LISTING_CONDITIONS.includes(query.condition as any)) {
      errors.push(`Condition must be one of: ${LISTING_CONDITIONS.join(', ')}`);
    }
  }

  // Validate status (optional)
  if (query.status) {
    if (!LISTING_STATUSES.includes(query.status as any)) {
      errors.push(`Status must be one of: ${LISTING_STATUSES.join(', ')}`);
    }
  }

  // Validate price range (optional)
  if (query.min_price) {
    const minPrice = parseFloat(query.min_price as string);
    if (isNaN(minPrice) || minPrice < 0) {
      errors.push('Min price must be a non-negative number');
    }
  }

  if (query.max_price) {
    const maxPrice = parseFloat(query.max_price as string);
    if (isNaN(maxPrice) || maxPrice < 0) {
      errors.push('Max price must be a non-negative number');
    }
  }

  // Validate location coordinates (optional)
  if (query.location_lat) {
    const lat = parseFloat(query.location_lat as string);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Location latitude must be a number between -90 and 90');
    }
  }

  if (query.location_lng) {
    const lng = parseFloat(query.location_lng as string);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Location longitude must be a number between -180 and 180');
    }
  }

  if (query.radius_km) {
    const radius = parseFloat(query.radius_km as string);
    if (isNaN(radius) || radius < 0 || radius > 1000) {
      errors.push('Radius must be a number between 0 and 1000');
    }
  }

  // Validate search query (optional)
  if (query.q) {
    if (typeof query.q !== 'string' || query.q.trim().length < 2) {
      errors.push('Search query must be at least 2 characters long');
    } else if (query.q.length > 100) {
      errors.push('Search query must not exceed 100 characters');
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid query parameters',
      details: errors
    });
    return;
  }

  next();
};

/**
 * Middleware for handling validation errors
 */
export const handleValidationError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors || [error.message]
    });
    return;
  }
  next(error);
};

/**
 * Validate required fields middleware
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    for (const field of fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: missingFields.map(field => `${field} is required`)
      });
      return;
    }
    
    next();
  };
};
/**
 * Middleware for validating connection creation/update data
 */
export const validateConnectionCreation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const data: CreateConnectionRequest = req.body;
  const errors: string[] = [];

  // Validate platform
  if (!data.platform || typeof data.platform !== 'string') {
    errors.push('Platform is required and must be a string');
  } else if (!MARKETPLACE_PLATFORMS.includes(data.platform as any)) {
    errors.push(`Platform must be one of: ${MARKETPLACE_PLATFORMS.join(', ')}`);
  }

  // Validate credentials
  if (!data.credentials || typeof data.credentials !== 'object' || Array.isArray(data.credentials)) {
    errors.push('Credentials are required and must be an object');
  } else if (Object.keys(data.credentials).length === 0) {
    errors.push('Credentials cannot be empty');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
    return;
  }

  next();
};