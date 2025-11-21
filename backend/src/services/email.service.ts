import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin as supabase } from '../config/supabase';

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;
  private imapConfig: imaps.ImapSimpleOptions | null = null;
  private isPolling: boolean = false;

  private constructor() {
    // Setup SMTP transporter
    if (process.env.SMTP_HOST && process.env.CENTRAL_EMAIL_USER && process.env.CENTRAL_EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.CENTRAL_EMAIL_USER,
          pass: process.env.CENTRAL_EMAIL_PASS,
        },
      });
    } else {
      console.warn('EmailService: SMTP credentials missing, using mock transporter');
      // Mock transporter for development/testing without credentials
      this.transporter = {
        sendMail: async (mailOptions: any) => {
          console.log('MOCK SMTP: Sending email:', mailOptions);
          return { messageId: 'mock-id-' + Date.now() };
        },
      } as any;
    }

    // Setup IMAP config
    if (process.env.IMAP_HOST && process.env.CENTRAL_EMAIL_USER && process.env.CENTRAL_EMAIL_PASS) {
      this.imapConfig = {
        imap: {
          user: process.env.CENTRAL_EMAIL_USER,
          password: process.env.CENTRAL_EMAIL_PASS,
          host: process.env.IMAP_HOST,
          port: parseInt(process.env.IMAP_PORT || '993'),
          tls: true,
          authTimeout: 3000,
        },
      };
    } else {
      console.warn('EmailService: IMAP credentials missing, polling will be simulated');
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Generates a unique email alias for a job
   * Format: post-{jobId}-{unique}@domain.com
   */
  public generateAlias(jobId: string): string {
    const unique = Math.random().toString(36).substring(2, 8);
    const domain = process.env.EMAIL_DOMAIN || 'example.com';
    return `post-${jobId}-${unique}@${domain}`;
  }

  /**
   * Starts polling for incoming emails
   */
  public async startPolling(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    console.log('EmailService: Starting polling...');

    // If no IMAP config, we can't really poll, so we just log
    if (!this.imapConfig) {
      console.log('EmailService: No IMAP config, skipping actual polling');
      return;
    }

    try {
      // Run immediately
      await this.checkEmails();

      // Then poll every minute
      setInterval(async () => {
        await this.checkEmails();
      }, 60 * 1000);

    } catch (error) {
      console.error('EmailService: Error starting polling:', error);
      this.isPolling = false;
    }
  }

  private async checkEmails(): Promise<void> {
    if (!this.imapConfig) return;

    try {
      const connection = await imaps.connect(this.imapConfig);
      await connection.openBox('INBOX');

      // Fetch unseen messages
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length > 0) {
        console.log(`EmailService: Found ${messages.length} new messages`);
      }

      for (const message of messages) {
        await this.processMessage(message);
      }

      connection.end();
    } catch (error) {
      console.error('EmailService: Error checking emails:', error);
    }
  }

  /**
   * Processes a single email message
   */
  public async processMessage(message: any): Promise<void> {
    try {
      const allParts = message.parts.find((part: any) => part.which === '');
      const id = message.attributes.uid;
      const idHeader = 'Imap-Id: ' + id + '\r\n';
      
      const simpleMail = await simpleParser(idHeader + allParts.body);
      
      // Extract the "To" address to find the alias
      const toAddress = Array.isArray(simpleMail.to) 
        ? simpleMail.to[0].text 
        : simpleMail.to?.text;

      if (!toAddress) {
        console.warn('EmailService: Could not parse TO address');
        return;
      }

      console.log(`EmailService: Processing message to ${toAddress}`);

      // Parse alias to get jobId
      // Format: post-{jobId}-{unique}@domain.com
      const match = toAddress.match(/post-([a-f0-9-]+)-[a-z0-9]+@/);
      
      if (!match || !match[1]) {
        console.warn('EmailService: Could not extract jobId from alias:', toAddress);
        return;
      }

      const jobId = match[1];
      console.log(`EmailService: Found reply for Job ID: ${jobId}`);

      // Look up job and user
      const { data: job, error: jobError } = await supabase
        .from('posting_jobs')
        .select('user_id, listing_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        console.error('EmailService: Job not found:', jobId);
        return;
      }

      // Get user email
      // Note: In a real app, we might need admin privileges to get user email
      // or have it stored/cached. For this implementation, we'll assume we can fetch it
      // or use a stored contact email on the listing/job if available.
      // Since we can't easily query auth.users directly from here without service key,
      // we'll try to get it from a profile table or similar if it existed.
      // However, since we have supabase client with service key capability in backend usually,
      // let's check how `supabase` is initialized in `../config/supabase`.
      
      // Assuming we need to get the user's real email. 
      // This is tricky with standard Supabase RLS unless we have a service role client.
      // Let's try to fetch the user from auth.users using rpc or assume we have access.
      // For MVP, let's fetch the listing which might have contact info, or fail gracefully.
      
      // Attempt to get user email via auth admin API if we had it, but here we just use Supabase client.
      // If this fails due to permissions, we'll need to adjust permissions or usage.
      // BUT: backend/src/config/supabase.ts usually exports a client. Let's check if it's admin.
      
      // Workaround: We'll mock the lookup if we can't get it, or try to fetch from a 'profiles' table if exists.
      // Let's try to get user email from the job's user_id.
      // Since we can't query auth.users directly with the anon key, 
      // we rely on the backend having a service_role key. 
      
      // Note: Real implementation would use:
      // const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(job.user_id);
      
      // For now, let's just try to forward to a fixed address or log it if we can't get the user.
      // But wait, the instructions say "Forward these replies to the actual user's email address".
      // I will assume `supabase` in `config/supabase.ts` has enough privileges (service role) 
      // or I will add a TODO to ensure it does.
      
      // Let's assume we can get the user email.
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(job.user_id);
      
      if (userError || !userData.user) {
        console.error('EmailService: Could not find user for job:', job.user_id);
        return;
      }

      const userEmail = userData.user.email;
      if (!userEmail) {
        console.error('EmailService: User has no email:', job.user_id);
        return;
      }

      // Forward the email
      await this.sendForwardedEmail(
        userEmail, 
        simpleMail.subject || 'No Subject', 
        simpleMail.text || simpleMail.html || 'No Content'
      );

    } catch (error) {
      console.error('EmailService: Error processing message:', error);
    }
  }

  /**
   * Forwards an email to the user
   */
  public async sendForwardedEmail(to: string, originalSubject: string, content: string): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.CENTRAL_EMAIL_USER || 'noreply@marketplace-lister.com',
        to: to,
        subject: `Fwd: ${originalSubject}`,
        text: `You received a reply to your listing:\n\n${content}`,
        html: `<p>You received a reply to your listing:</p><hr/>${content.replace(/\n/g, '<br/>')}`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('EmailService: Forwarded email sent:', info.messageId);
    } catch (error) {
      console.error('EmailService: Error forwarding email:', error);
      throw error;
    }
  }
}

export const emailService = EmailService.getInstance();