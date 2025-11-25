import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '../config/supabase';
import config from '../config/config';
import { encryptionService } from './encryption.service';

interface GmailCredentials {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expiry_date: number;
}

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export interface ReceivedEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: Date;
  labels: string[];
}

export class GmailApiService {
  private oAuth2Client: OAuth2Client;

  constructor() {
    this.oAuth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  /**
   * Create an authenticated Gmail client for a specific proxy account
   */
  private async getGmailClient(proxyPoolId: string): Promise<gmail_v1.Gmail> {
    // Fetch proxy credentials from database
    const { data: proxy, error } = await supabaseAdmin
      .from('email_proxy_pool')
      .select('encrypted_credentials')
      .eq('id', proxyPoolId)
      .single();

    if (error || !proxy) {
      throw new Error(`Failed to fetch proxy credentials: ${error?.message}`);
    }

    // Decrypt credentials
    let credentials: GmailCredentials;
    if (typeof proxy.encrypted_credentials === 'string' && encryptionService.isEncrypted(proxy.encrypted_credentials)) {
      credentials = encryptionService.decrypt<GmailCredentials>(proxy.encrypted_credentials);
    } else {
      // Legacy: plaintext JSON (should migrate)
      credentials = proxy.encrypted_credentials as GmailCredentials;
    }

    this.oAuth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      token_type: credentials.token_type,
      expiry_date: credentials.expiry_date,
    });

    // Handle token refresh
    this.oAuth2Client.on('tokens', async (tokens) => {
      await this.updateProxyTokens(proxyPoolId, tokens);
    });

    return google.gmail({ version: 'v1', auth: this.oAuth2Client });
  }

  /**
   * Update proxy account tokens after refresh
   */
  private async updateProxyTokens(proxyPoolId: string, tokens: any): Promise<void> {
    const encryptedTokens = encryptionService.encrypt(tokens);
    
    const { error } = await supabaseAdmin
      .from('email_proxy_pool')
      .update({
        encrypted_credentials: encryptedTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proxyPoolId);

    if (error) {
      console.error(`Failed to update proxy tokens: ${error.message}`);
    }
  }

  /**
   * Send an email through a proxy account
   */
  async sendEmail(proxyPoolId: string, message: EmailMessage): Promise<string> {
    const gmail = await this.getGmailClient(proxyPoolId);

    // Construct the email
    const emailLines = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
    ];

    if (message.from) {
      emailLines.unshift(`From: ${message.from}`);
    }
    if (message.replyTo) {
      emailLines.push(`Reply-To: ${message.replyTo}`);
    }

    emailLines.push('', message.body);

    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    // Update daily send count
    await supabaseAdmin.rpc('increment_proxy_send_count', { proxy_id: proxyPoolId });

    return response.data.id || '';
  }

  /**
   * Fetch new emails from a proxy account
   */
  async fetchNewEmails(
    proxyPoolId: string,
    sinceDate?: Date,
    maxResults: number = 50
  ): Promise<ReceivedEmail[]> {
    const gmail = await this.getGmailClient(proxyPoolId);

    // Build query
    let query = 'in:inbox';
    if (sinceDate) {
      const timestamp = Math.floor(sinceDate.getTime() / 1000);
      query += ` after:${timestamp}`;
    }

    // List messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = listResponse.data.messages || [];
    const emails: ReceivedEmail[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const headers = fullMessage.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      // Extract body
      let body = '';
      const payload = fullMessage.data.payload;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        const textPart = payload.parts.find(
          (p) => p.mimeType === 'text/plain' || p.mimeType === 'text/html'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      emails.push({
        id: msg.id,
        threadId: msg.threadId || '',
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        body,
        date: new Date(parseInt(fullMessage.data.internalDate || '0')),
        labels: fullMessage.data.labelIds || [],
      });
    }

    // Update daily receive count
    if (emails.length > 0) {
      await supabaseAdmin.rpc('increment_proxy_receive_count', {
        proxy_id: proxyPoolId,
        count: emails.length,
      });
    }

    return emails;
  }

  /**
   * Check if an email is spam using Gmail's labels
   */
  isSpam(email: ReceivedEmail): boolean {
    return email.labels.includes('SPAM');
  }

  /**
   * Archive an email (remove from inbox)
   */
  async archiveEmail(proxyPoolId: string, messageId: string): Promise<void> {
    const gmail = await this.getGmailClient(proxyPoolId);

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });
  }

  /**
   * Mark email as read
   */
  async markAsRead(proxyPoolId: string, messageId: string): Promise<void> {
    const gmail = await this.getGmailClient(proxyPoolId);

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  /**
   * Get proxy email account info
   */
  async getAccountInfo(proxyPoolId: string): Promise<{ email: string }> {
    const gmail = await this.getGmailClient(proxyPoolId);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return { email: profile.data.emailAddress || '' };
  }

  /**
   * Generate OAuth URL for adding a new proxy account
   */
  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GmailCredentials> {
    const { tokens } = await this.oAuth2Client.getToken(code);
    return {
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || 0,
    };
  }
}

export const gmailApiService = new GmailApiService();