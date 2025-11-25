import { supabaseAdmin } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
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
   * Format user response to match frontend expectation (camelCase, flattened)
   */
  private formatUserResponse(user: any, profile: any): any {
    return {
      id: user.id,
      email: user.email,
      fullName: profile?.full_name || user.user_metadata?.full_name,
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
      phone: profile?.phone || user.phone || user.user_metadata?.phone,
      credits: profile?.credits ?? 0,
      stripeCustomerId: profile?.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      // Include original snake_case fields just in case specific backend logic needs them
      ...profile
    };
  }

  /**
   * Register a new user with email and password
   * @param request - Signup request containing email, password, and optional fields
   * @returns Authentication response with user and session
   */
  async signup(request: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Create a temporary client for user authentication operations to avoid polluting the admin client
      const authClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

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
        credits: 5, // Give 5 free credits on signup
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Attempting to create profile with Admin Client for user:', authData.user.id);
      console.log('Profile Data:', JSON.stringify(profileData, null, 2));

      const { data: profileInsertData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select();

      if (profileError) {
        console.error('Create user profile error details:', JSON.stringify(profileError, null, 2));
        console.error('Attempted profile data:', JSON.stringify(profileData, null, 2));
        console.error('Is Supabase Service Key configured?', !!config.SUPABASE_SERVICE_KEY);
        
        // Clean up the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return {
          success: false,
          error: `Failed to create user profile: ${profileError.message}`
        };
      }

      // Sign in to get Supabase session (needed for storage access)
      // Use authClient instead of supabaseAdmin to avoid persisting session on admin client
      const { data: signInData } = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      // Generate JWT token
      const token = this.generateToken(authData.user);

      // Format user for frontend
      const formattedUser = this.formatUserResponse(authData.user, profileData);

      const response: AuthResponse = {
        user: formattedUser,
        session: {
          access_token: token,
          refresh_token: signInData?.session?.refresh_token || '',
          expires_in: signInData?.session?.expires_in || 86400,
          expires_at: signInData?.session?.expires_at || Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer',
          supabase_access_token: signInData?.session?.access_token
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

      // Create a temporary client for user authentication operations to avoid polluting the admin client
      const authClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

      // Since we can't directly check password with admin API,
      // we need to use the regular auth flow
      const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
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

      // Fetch user profile to include credits
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', signInData.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile during login:', profileError);
      } else {
        console.log('Profile fetched successfully:', profile);
      }

      // Generate custom JWT token
      const token = this.generateToken(signInData.user);

      // Format user for frontend
      const formattedUser = this.formatUserResponse(signInData.user, profile);

      const response: AuthResponse = {
        user: formattedUser,
        session: {
          access_token: token,
          refresh_token: signInData.session?.refresh_token || '',
          expires_in: signInData.session?.expires_in || 86400,
          expires_at: signInData.session?.expires_at || Math.floor(Date.now() / 1000) + 86400,
          token_type: 'bearer',
          supabase_access_token: signInData.session?.access_token
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
   * Initiate Google OAuth flow
   */
  async getGoogleAuthUrl(): Promise<string> {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: config.google.redirectUri,
        scopes: 'email profile',
      },
    });

    if (error) throw error;
    return data.url;
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<{ user: any; token: string }> {
    // Exchange the code for session
    const { data: authData, error: authError } = await supabaseAdmin.auth.exchangeCodeForSession(code);
    
    if (authError) throw authError;

    const supabaseUser = authData.user;
    if (!supabaseUser) throw new Error('No user returned from Google auth');

    // Check if profile exists, create if not
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create one
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          email: supabaseUser.email,
          full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0],
          avatar_url: supabaseUser.user_metadata?.avatar_url,
          credits: 5,  // Initial credits
        })
        .select()
        .single();

      if (insertError) throw insertError;
      profile = newProfile;
    } else if (profileError) {
      throw profileError;
    }

    // Generate our custom JWT
    const token = this.generateToken(supabaseUser.id);

    // Format user for frontend
    const formattedUser = this.formatUserResponse(supabaseUser, profile);

    return {
      user: formattedUser,
      token,
    };
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

      // Format user for frontend
      const formattedUser = this.formatUserResponse(user.user, profile);

      // We still return it as SessionUser type to satisfy TS, but at runtime it has the extra fields
      const sessionUser: SessionUser = {
        ...formattedUser,
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
          token_type: 'bearer',
          supabase_access_token: data.session.access_token
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