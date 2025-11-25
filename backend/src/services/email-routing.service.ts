import { supabaseAdmin } from '../config/supabase';
import { gmailApiService, ReceivedEmail } from './gmail-api.service';
import { emailProxyService } from './email-proxy.service';
import { spamFilterService } from './spam-filter.service';
import nodemailer from 'nodemailer';
import config from '../config/config';

interface ForwardingResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailRoutingService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure nodemailer for forwarding emails
    // Using Gmail SMTP or any SMTP service
    this.transporter = nodemailer.createTransport({
      host: config.smtp?.host || 'smtp.gmail.com',
      port: config.smtp?.port || 587,
      secure: false,
      auth: {
        user: config.smtp?.user || '',
        pass: config.smtp?.pass || '',
      },
    });
  }

  /**
   * Process all pending emails across all active proxy assignments
   */
  async processIncomingEmails(): Promise<{ processed: number; forwarded: number; spam: number }> {
    let processed = 0;
    let forwarded = 0;
    let spam = 0;

    // Get all active proxy assignments with their pool info
    const { data: assignments, error } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select(`
        id,
        user_id,
        proxy_pool_id,
        full_alias,
        email_proxy_pool!inner(id, email)
      `)
      .eq('is_active', true);

    if (error || !assignments) {
      console.error('[EmailRoutingService] Failed to fetch assignments:', error?.message);
      return { processed, forwarded, spam };
    }

    // Group assignments by proxy pool for batch processing
    const proxyGroups = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const pool = assignment.email_proxy_pool as unknown as { id: string; email: string };
      // Note: The type assertion above is necessary because supabase return type inference can be tricky with joins
      const poolId = pool.id; 
      
      if (!proxyGroups.has(poolId)) {
        proxyGroups.set(poolId, []);
      }
      proxyGroups.get(poolId)!.push(assignment);
    }

    // Process each proxy pool
    for (const [proxyPoolId, poolAssignments] of proxyGroups) {
      try {
        // Fetch new emails from this proxy (last 24 hours to avoid duplicates)
        const since = new Date();
        since.setHours(since.getHours() - 24);
        
        const emails = await gmailApiService.fetchNewEmails(proxyPoolId, since, 100);
        
        for (const email of emails) {
          // Check if we've already processed this email
          const existing = await this.isEmailProcessed(email.id);
          if (existing) continue;

          processed++;

          // Extract the alias from the recipient address
          const alias = emailProxyService.extractAliasFromEmail(email.to);
          if (!alias) {
            console.log(`[EmailRoutingService] Could not extract alias from: ${email.to}`);
            continue;
          }

          // Find the matching assignment
          const assignment = poolAssignments.find(a => a.full_alias === alias);
          if (!assignment) {
            console.log(`[EmailRoutingService] No assignment found for alias: ${alias}`);
            continue;
          }

          // Create email log entry
          const logId = await this.createEmailLog(assignment.id, assignment.user_id, email);

          // Check for spam
          const spamResult = spamFilterService.checkSpam({
            from: email.from,
            subject: email.subject,
            body: email.body,
            labels: email.labels,
          });

          await spamFilterService.logSpamCheck(logId, spamResult);

          if (spamResult.isSpam) {
            spam++;
            console.log(`[EmailRoutingService] Spam detected for ${email.id}: score=${spamResult.score}`);
            await this.updateEmailLogStatus(logId, 'blocked');
            await gmailApiService.archiveEmail(proxyPoolId, email.id);
            continue;
          }

          // Get user's contact email for forwarding
          const userEmail = await this.getUserContactEmail(assignment.user_id);
          if (!userEmail) {
            console.error(`[EmailRoutingService] No contact email for user ${assignment.user_id}`);
            await this.updateEmailLogStatus(logId, 'failed');
            continue;
          }

          // Forward the email
          const forwardResult = await this.forwardEmail(email, userEmail, proxyPoolId);
          
          if (forwardResult.success) {
            forwarded++;
            await this.updateEmailLogStatus(logId, 'sent', forwardResult.messageId);
            await gmailApiService.markAsRead(proxyPoolId, email.id);
          } else {
            await this.updateEmailLogStatus(logId, 'failed');
            console.error(`[EmailRoutingService] Forward failed: ${forwardResult.error}`);
          }
        }
      } catch (error) {
        console.error(`[EmailRoutingService] Error processing proxy ${proxyPoolId}:`, error);
      }
    }

    console.log(`[EmailRoutingService] Processed: ${processed}, Forwarded: ${forwarded}, Spam: ${spam}`);
    return { processed, forwarded, spam };
  }

  /**
   * Check if email has already been processed
   */
  private async isEmailProcessed(messageId: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('email_logs')
      .select('id')
      .eq('message_id', messageId)
      .single();

    return !!data;
  }

  /**
   * Create email log entry
   */
  private async createEmailLog(
    assignmentId: string,
    userId: string,
    email: ReceivedEmail
  ): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('email_logs')
      .insert({
        assignment_id: assignmentId,
        user_id: userId,
        direction: 'inbound',
        from_address: email.from,
        to_address: email.to,
        subject: email.subject,
        message_id: email.id,
        forwarding_status: 'pending',
        metadata: {
          thread_id: email.threadId,
          received_at: email.date.toISOString(),
          labels: email.labels,
        },
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create email log: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update email log status
   */
  private async updateEmailLogStatus(
    logId: string,
    status: 'pending' | 'sent' | 'failed' | 'blocked',
    forwardedMessageId?: string
  ): Promise<void> {
    const update: Record<string, any> = {
      forwarding_status: status,
    };

    if (status === 'sent') {
      update.forwarded_at = new Date().toISOString();
    }

    if (forwardedMessageId) {
      // Use raw SQL for jsonb concatenation as a safe way to update metadata
      // But for simplicity in this service, we'll just fetch, update, and save
      // Or use a simpler approach if supabase-js supports it directly.
      // The provided code used supabaseAdmin.sql which might not be available on the client directly 
      // depending on the library version/setup. 
      // Let's check how supabaseAdmin is initialized. It's createClient.
      // createClient doesn't have .sql property directly usually.
      // We will fetch existing metadata first to be safe.
      
      const { data: existing } = await supabaseAdmin
        .from('email_logs')
        .select('metadata')
        .eq('id', logId)
        .single();
        
      if (existing && existing.metadata) {
        update.metadata = {
          ...existing.metadata,
          forwarded_message_id: forwardedMessageId
        };
      } else {
        update.metadata = { forwarded_message_id: forwardedMessageId };
      }
    }

    await supabaseAdmin
      .from('email_logs')
      .update(update)
      .eq('id', logId);
  }

  /**
   * Get user's contact email from their Craigslist connection
   */
  private async getUserContactEmail(userId: string): Promise<string | null> {
    // First try to get from marketplace_connections
    const { data: connection } = await supabaseAdmin
      .from('marketplace_connections')
      .select('contact_email')
      .eq('user_id', userId)
      .eq('platform', 'craigslist')
      .eq('is_active', true)
      .single();

    if (connection?.contact_email) {
      return connection.contact_email;
    }

    // Fallback to user's profile email
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    return user?.user?.email || null;
  }

  /**
   * Forward email to user
   */
  private async forwardEmail(
    originalEmail: ReceivedEmail,
    toAddress: string,
    proxyPoolId: string
  ): Promise<ForwardingResult> {
    try {
      // Get the proxy email for the "From" field
      const proxyInfo = await gmailApiService.getAccountInfo(proxyPoolId);

      const mailOptions = {
        from: `"Marketplace Lister" <${proxyInfo.email}>`,
        to: toAddress,
        subject: `[Listing Reply] ${originalEmail.subject}`,
        html: this.formatForwardedEmail(originalEmail),
        headers: {
          'X-Original-From': originalEmail.from,
          'X-Original-Date': originalEmail.date.toISOString(),
          'X-Forwarded-By': 'Marketplace Lister',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format the forwarded email HTML
   */
  private formatForwardedEmail(email: ReceivedEmail): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">New Reply to Your Listing</h3>
          <p style="margin: 5px 0; color: #666;"><strong>From:</strong> ${this.escapeHtml(email.from)}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${email.date.toLocaleString()}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Subject:</strong> ${this.escapeHtml(email.subject)}</p>
        </div>
        <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
          ${email.body}
        </div>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; font-size: 12px; color: #856404;">
          <strong>⚠️ Safety Tips:</strong>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Never send money or share personal information before meeting in person</li>
            <li>Meet in a public place for transactions</li>
            <li>Be wary of offers that seem too good to be true</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#039;');
  }
}

export const emailRoutingService = new EmailRoutingService();