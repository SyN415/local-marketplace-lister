import { supabaseAdmin } from '../config/supabase';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  SignupRequest, 
  PasswordResetRequest,
  ApiResponse,
  UserProfile,
  SessionUser
} from '../types/auth.types';
import jwt from 'jsonwebtoken';
import config from '../config/config';

/**
 * Authentication service for handling user authentication operations
 */
class AuthService {
  private readonly JWT_SECRET = config.JWT_SECRET;
  private readonly TOKEN_EXPIRY = '24h';

  /**
   * Generate JWT token for user session
   * @param user - User object
   * @returns JWT token string
   */
  private generateToken(user: any): string {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email || ''
      },
      this.JWT_SECRET,
      { 
        expiresIn: this.TOKEN_EXPIRY 
      }
    );
  }

  /**
   * Verify JWT token
   * @param token - JWT token string
   * @returns Decoded token payload
   */
  private verifyToken(token: string): any {
    return jwt.verify(token, this.JWT_SECRET);
  }

  /**
   * Register a new user with email and password
   * @param request - Signup request containing email, password, and optional fields
   * @returns Authentication response with user and session
   */
  async signup(request: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password, full_name, phone } = request;

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      if (existingUser?.users?.some(user => user.email === email)) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || '',
          phone: phone || ''
        }
      });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create user'
        };
      }

      // Create user profile
      const profileData: Partial<UserProfile> = {
        id: authData.user.id,
        email: email,
        full_name: full_name || '',
        phone: phone || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);

      if (profileError) {
        // Clean up the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: 'Failed to create user profile'
        };
      }

      // Generate JWT token
      const token = this.generateToken(authData.user);

      const response: AuthResponse = {
        user: authData.user as User,
        session: {
          access_token: token,
          refresh_token: '', // Supabase handles refresh tokens internally
          expires_in: 86400, // 24 hours in seconds
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer'
        }
      };

      return {
        success: true,
        data: response,
        message: 'User registered successfully'
      };

    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: 'Internal server error during signup'
      };
    }
  }

  /**
   * Login user with email and password
   * @param request - Login request containing email and password
   * @returns Authentication response with user and session
   */
  async login(request: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password } = request;

      // Since we can't directly check password with admin API, 
      // we need to use the regular auth flow
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      if (!signInData.user) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Generate custom JWT token
      const token = this.generateToken(signInData.user);

      const response: AuthResponse = {
        user: signInData.user as User,
        session: {
          access_token: token,
          refresh_token: signInData.session?.refresh_token || '',
          expires_in: signInData.session?.expires_in || 86400,
          expires_at: signInData.session?.expires_at || Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer'
        }
      };

      return {
        success: true,
        data: response,
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Internal server error during login'
      };
    }
  }

  /**
   * Logout user by invalidating session
   * @param token - User's access token
   * @returns API response
   */
  async logout(token: string): Promise<ApiResponse> {
    try {
      // Decode token to get user ID
      const decoded = this.verifyToken(token);
      
      // Sign out the user from Supabase
      const { error } = await supabaseAdmin.auth.admin.signOut(decoded.userId);
      
      if (error) {
        console.error('Logout error:', error);
        return {
          success: false,
          error: 'Failed to logout'
        };
      }

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: 'Internal server error during logout'
      };
    }
  }

  /**
   * Get current user session information
   * @param token - User's access token
   * @returns Current user information with profile
   */
  async getCurrentUser(token: string): Promise<ApiResponse<SessionUser>> {
    try {
      // Verify and decode the token
      const decoded = this.verifyToken(token);
      
      // Get user from Supabase
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(decoded.userId);
      
      if (userError || !user.user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      const sessionUser: SessionUser = {
        ...user.user as User,
        profile: profile || undefined
      };

      return {
        success: true,
        data: sessionUser,
        message: 'User session retrieved successfully'
      };

    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }
  }

  /**
   * Request password reset for user
   * @param request - Password reset request containing email
   * @returns API response
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<ApiResponse> {
    try {
      const { email } = request;

      // Generate password reset link
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });

      if (error) {
        return {
          success: false,
          error: 'Failed to generate password reset link'
        };
      }

      // In a real application, you would send an email here
      // For now, we'll just return success
      console.log('Password reset link:', data.properties?.action_link);

      return {
        success: true,
        message: 'Password reset link sent to your email'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Internal server error during password reset'
      };
    }
  }

  /**
   * Refresh user token
   * @param refreshToken - User's refresh token
   * @returns New authentication response
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.user || !data.session) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Generate new custom token
      const token = this.generateToken(data.user);

      const response: AuthResponse = {
        user: data.user as User,
        session: {
          access_token: token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in || 86400,
          expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer'
        }
      };

      return {
        success: true,
        data: response,
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Internal server error during token refresh'
      };
    }
  }
}

export const authService = new AuthService();
export default authService;