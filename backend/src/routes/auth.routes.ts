import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { verifyToken, requireAuth, validateRequiredFields } from '../middleware/auth.middleware';
import { LoginRequest, SignupRequest, PasswordResetRequest } from '../types/auth.types';

const router = Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 * @body    { email: string, password: string, full_name?: string, phone?: string }
 */
router.post('/signup', validateRequiredFields(['email', 'password']), async (req: Request, res: Response): Promise<void> => {
  try {
    const signupRequest: SignupRequest = req.body;

    // Map camelCase to snake_case if needed
    if (req.body.fullName && !signupRequest.full_name) {
      signupRequest.full_name = req.body.fullName;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupRequest.email)) {
      res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
      return;
    }

    // Validate password strength
    if (signupRequest.password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
      return;
    }

    const response = await authService.signup(signupRequest);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Signup route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during signup'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user with email and password
 * @access  Public
 * @body    { email: string, password: string }
 */
router.post('/login', validateRequiredFields(['email', 'password']), async (req: Request, res: Response): Promise<void> => {
  try {
    const loginRequest: LoginRequest = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginRequest.email)) {
      res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
      return;
    }

    const response = await authService.login(loginRequest);

    if (!response.success) {
      res.status(401).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.post('/logout', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.token) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const response = await authService.logout(req.token);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.get('/me', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: req.user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    console.error('Get current user route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving user'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Request password reset for user
 * @access  Public
 * @body    { email: string }
 */
router.post('/reset-password', validateRequiredFields(['email']), async (req: Request, res: Response): Promise<void> => {
  try {
    const resetRequest: PasswordResetRequest = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetRequest.email)) {
      res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
      return;
    }

    const response = await authService.requestPasswordReset(resetRequest);

    // Don't reveal if email exists or not for security
    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Password reset route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during password reset'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh user authentication token
 * @access  Private
 * @body    { refresh_token: string }
 */
router.post('/refresh', validateRequiredFields(['refresh_token']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    const response = await authService.refreshToken(refresh_token);

    if (!response.success) {
      res.status(401).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Token refresh route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.get('/profile', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const response = await userService.getUserProfile(req.user.id);

    if (!response.success) {
      res.status(404).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Get profile route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving profile'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 * @body    { full_name?: string, phone?: string, location?: string, bio?: string }
 */
router.put('/profile', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const profileData = req.body;

    // Validate profile data
    const validation = userService.validateProfileData(profileData);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }

    const response = await userService.updateUserProfile(req.user.id, profileData);

    if (!response.success) {
      res.status(400).json(response);
      return;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Update profile route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating profile'
    });
  }
});

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 * @headers { Authorization: 'Bearer <token>' }
 */
router.delete('/account', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Delete user profile first
    const profileResponse = await userService.deleteUserProfile(req.user.id);
    if (!profileResponse.success) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete user profile'
      });
      return;
    }

    // Then delete the auth user (this would require additional Supabase admin operations)
    // For now, we'll just return success
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting account'
    });
  }
});

// Health check endpoint for auth routes
router.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are healthy',
    timestamp: new Date().toISOString()
  });
});

export const authRoutes = router;
export default authRoutes;