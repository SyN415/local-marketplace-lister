import { supabaseAdmin } from '../config/supabase';
import { UserProfile, SessionUser, ApiResponse } from '../types/auth.types';

/**
 * User service for handling user profile operations
 */
class UserService {
  /**
   * Get user profile by user ID
   * @param userId - User ID
   * @returns User profile data
   */
  async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Get user profile error:', error);
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      return {
        success: true,
        data: profile,
        message: 'User profile retrieved successfully'
      };

    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        error: 'Internal server error while retrieving user profile'
      };
    }
  }

  /**
   * Create a new user profile
   * @param profileData - User profile data
   * @returns Created user profile
   */
  async createUserProfile(profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Create user profile error:', error);
        return {
          success: false,
          error: 'Failed to create user profile'
        };
      }

      return {
        success: true,
        data: profile,
        message: 'User profile created successfully'
      };

    } catch (error) {
      console.error('Create user profile error:', error);
      return {
        success: false,
        error: 'Internal server error while creating user profile'
      };
    }
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param profileData - Updated profile data
   * @returns Updated user profile
   */
  async updateUserProfile(
    userId: string, 
    profileData: Partial<UserProfile>
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update user profile error:', error);
        return {
          success: false,
          error: 'Failed to update user profile'
        };
      }

      return {
        success: true,
        data: profile,
        message: 'User profile updated successfully'
      };

    } catch (error) {
      console.error('Update user profile error:', error);
      return {
        success: false,
        error: 'Internal server error while updating user profile'
      };
    }
  }

  /**
   * Delete user profile
   * @param userId - User ID
   * @returns API response
   */
  async deleteUserProfile(userId: string): Promise<ApiResponse> {
    try {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Delete user profile error:', error);
        return {
          success: false,
          error: 'Failed to delete user profile'
        };
      }

      return {
        success: true,
        message: 'User profile deleted successfully'
      };

    } catch (error) {
      console.error('Delete user profile error:', error);
      return {
        success: false,
        error: 'Internal server error while deleting user profile'
      };
    }
  }

  /**
   * Get all users with pagination
   * @param page - Page number (1-based)
   * @param limit - Number of users per page
   * @returns Paginated list of users with profiles
   */
  async getAllUsers(
    page: number = 1, 
    limit: number = 10
  ): Promise<ApiResponse<{ users: UserProfile[], total: number, page: number, totalPages: number }>> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await supabaseAdmin
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Get users count error:', countError);
        return {
          success: false,
          error: 'Failed to get users count'
        };
      }

      // Get users with pagination
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (usersError) {
        console.error('Get users error:', usersError);
        return {
          success: false,
          error: 'Failed to get users'
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          users: users || [],
          total: count || 0,
          page,
          totalPages
        },
        message: 'Users retrieved successfully'
      };

    } catch (error) {
      console.error('Get all users error:', error);
      return {
        success: false,
        error: 'Internal server error while retrieving users'
      };
    }
  }

  /**
   * Search users by name or email
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns List of matching users
   */
  async searchUsers(
    query: string, 
    limit: number = 10
  ): Promise<ApiResponse<UserProfile[]>> {
    try {
      const { data: users, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        console.error('Search users error:', error);
        return {
          success: false,
          error: 'Failed to search users'
        };
      }

      return {
        success: true,
        data: users || [],
        message: 'Users found successfully'
      };

    } catch (error) {
      console.error('Search users error:', error);
      return {
        success: false,
        error: 'Internal server error while searching users'
      };
    }
  }

  /**
   * Get user by ID with full profile information
   * @param userId - User ID
   * @returns Complete user information including profile
   */
  async getUserWithProfile(userId: string): Promise<ApiResponse<SessionUser>> {
    try {
      // Get user from auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authError || !authUser.user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const sessionUser: SessionUser = {
        ...authUser.user as any,
        profile: profile || undefined
      };

      return {
        success: true,
        data: sessionUser,
        message: 'User retrieved successfully'
      };

    } catch (error) {
      console.error('Get user with profile error:', error);
      return {
        success: false,
        error: 'Internal server error while retrieving user'
      };
    }
  }

  /**
   * Update user avatar
   * @param userId - User ID
   * @param avatarUrl - New avatar URL
   * @returns Updated user profile
   */
  async updateUserAvatar(
    userId: string, 
    avatarUrl: string
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update user avatar error:', error);
        return {
          success: false,
          error: 'Failed to update user avatar'
        };
      }

      return {
        success: true,
        data: profile,
        message: 'User avatar updated successfully'
      };

    } catch (error) {
      console.error('Update user avatar error:', error);
      return {
        success: false,
        error: 'Internal server error while updating user avatar'
      };
    }
  }

  /**
   * Validate user profile data
   * @param profileData - Profile data to validate
   * @returns Validation result
   */
  validateProfileData(profileData: Partial<UserProfile>): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];

    // Validate required fields if provided
    if (profileData.full_name && typeof profileData.full_name === 'string') {
      if (profileData.full_name.trim().length === 0) {
        errors.push('Full name cannot be empty');
      }
      if (profileData.full_name.length > 100) {
        errors.push('Full name cannot exceed 100 characters');
      }
    }

    if (profileData.phone && typeof profileData.phone === 'string') {
      if (profileData.phone.trim().length === 0) {
        errors.push('Phone cannot be empty');
      }
      if (profileData.phone.length > 20) {
        errors.push('Phone cannot exceed 20 characters');
      }
    }

    if (profileData.location && typeof profileData.location === 'string') {
      if (profileData.location.trim().length === 0) {
        errors.push('Location cannot be empty');
      }
      if (profileData.location.length > 100) {
        errors.push('Location cannot exceed 100 characters');
      }
    }

    if (profileData.bio && typeof profileData.bio === 'string') {
      if (profileData.bio.length > 500) {
        errors.push('Bio cannot exceed 500 characters');
      }
    }

    if (profileData.avatar_url && typeof profileData.avatar_url === 'string') {
      // Basic URL validation
      try {
        new URL(profileData.avatar_url);
      } catch {
        errors.push('Avatar URL must be a valid URL');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const userService = new UserService();
export default userService;