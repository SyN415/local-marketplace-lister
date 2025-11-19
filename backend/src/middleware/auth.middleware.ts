import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { authService } from '../services/auth.service';
import { SessionUser } from '../types/auth.types';

/**
 * Extended Request interface to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      token?: string;
    }
  }
}

/**
 * Middleware to verify JWT token and extract user information
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next function
 */
export const verifyToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header or cookie
    let token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.token ||
                (typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : undefined);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Get current user from auth service
    const response = await authService.getCurrentUser(token);
    
    if (!response.success || !response.data) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Add user and token to request object
    req.user = response.data;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Server error during token verification'
      });
    }
  }
};

/**
 * Middleware to check if user is authenticated
 * Must be used after verifyToken middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requireAuth = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }
  
  next();
};

/**
 * Middleware to check if user has admin role
 * Must be used after verifyToken middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requireAdmin = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }
  
  next();
};

/**
 * Middleware to check if user owns the resource
 * @param userIdField - The field name in the request object that contains the user ID to check against
 * @returns Express middleware function
 */
export const requireOwnership = (userIdField: string = 'userId') => {
  return (
    req: Request, 
    res: Response, 
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (!resourceUserId) {
      res.status(400).json({
        success: false,
        error: 'User ID not provided'
      });
      return;
    }

    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: can only access own resources'
      });
      return;
    }
    
    next();
  };
};

/**
 * Middleware to optionally add user information if token is provided
 * Unlike verifyToken, this won't fail if no token is provided
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header or cookie
    let token = req.headers.authorization?.replace('Bearer ', '') || 
                req.cookies?.token ||
                (typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : undefined);

    if (token) {
      try {
        // Verify the token
        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        
        // Get current user from auth service
        const response = await authService.getCurrentUser(token);
        
        if (response.success && response.data) {
          req.user = response.data;
          req.token = token;
        }
      } catch (error) {
        // Silently ignore token errors for optional auth
        console.log('Optional auth token error:', error);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue without setting user for optional auth
    next();
  }
};

/**
 * Middleware to extract token from request headers
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const extractToken = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // Get token from header
  let token = req.headers.authorization?.replace('Bearer ', '') || 
              (typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : undefined);
  
  // Also check cookies
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    req.token = token;
  }
  
  next();
};

/**
 * Helper function to generate a standardized error response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Error message
 */
export const sendAuthError = (
  res: Response, 
  statusCode: number, 
  message: string
): void => {
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

/**
 * Helper function to validate required fields in request body
 * @param requiredFields - Array of required field names
 */
export const validateRequiredFields = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
      return;
    }
    
    next();
  };
};

export default {
  verifyToken,
  requireAuth,
  requireAdmin,
  requireOwnership,
  optionalAuth,
  extractToken,
  sendAuthError,
  validateRequiredFields
};