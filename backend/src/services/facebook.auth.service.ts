import axios from 'axios';
import { config } from '../config/config';

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
}

class FacebookAuthService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion = 'v18.0';

  constructor() {
    this.appId = config.FACEBOOK_APP_ID;
    this.appSecret = config.FACEBOOK_APP_SECRET;
    // This should match the route we will create
    this.redirectUri = config.FACEBOOK_CALLBACK_URL || `${config.FRONTEND_URL}/connections/facebook/callback`;
  }

  /**
   * Generates the Facebook Login URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'email,public_profile', // Add other scopes if needed for marketplace
      response_type: 'code',
      state: state || '',
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchanges the authorization code for an access token
   */
  async exchangeCode(code: string): Promise<FacebookTokenResponse> {
    try {
      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      });

      const response = await axios.get<FacebookTokenResponse>(
        `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?${params.toString()}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Facebook exchangeCode error:', error.response?.data || error.message);
      throw new Error('Failed to exchange Facebook code for token');
    }
  }

  /**
   * Fetches the user's profile information
   */
  async getUserProfile(accessToken: string): Promise<FacebookUserProfile> {
    try {
      const response = await axios.get<FacebookUserProfile>(
        `https://graph.facebook.com/${this.apiVersion}/me`,
        {
          params: {
            fields: 'id,name,email',
            access_token: accessToken,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Facebook getUserProfile error:', error.response?.data || error.message);
      throw new Error('Failed to fetch Facebook user profile');
    }
  }
  
  /**
   * Debug helper to inspect a token
   */
  async debugToken(inputToken: string): Promise<any> {
      try {
          const response = await axios.get(
              `https://graph.facebook.com/${this.apiVersion}/debug_token`, 
              {
                  params: {
                      input_token: inputToken,
                      access_token: `${this.appId}|${this.appSecret}`
                  }
              }
          );
          return response.data;
      } catch (error: any) {
          console.error('Facebook debugToken error:', error.response?.data || error.message);
          return null;
      }
  }
}

export const facebookAuthService = new FacebookAuthService();