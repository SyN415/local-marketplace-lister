import { supabaseAdmin } from '../config/supabase';
import { PlatformAdapter } from './adapters/types';
import { CraigslistAdapter } from './adapters/craigslist.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { OfferUpAdapter } from './adapters/offerup.adapter';
import { PublishResult } from './adapters/types';

interface PostingJob {
  id: string;
  listing_id: string;
  user_id: string;
  platform: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data: any;
  error_log: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

class JobQueueService {
  private isProcessing = false;
  private adapters: Record<string, PlatformAdapter> = {
    'craigslist': new CraigslistAdapter(),
    'facebook': new FacebookAdapter(),
    'offerup': new OfferUpAdapter(),
  };

  async addJob(listingId: string, platform: string, userId: string): Promise<PostingJob | null> {
    const { data, error } = await supabaseAdmin
      .from('posting_jobs')
      .insert({
        listing_id: listingId,
        user_id: userId,
        platform: platform,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding job:', error);
      throw error;
    }

    // Trigger processing immediately if not already running (for low latency in MVP)
    // In production, this might be handled by a separate worker process polling DB
    this.processJobs().catch(err => console.error('Background processing trigger failed', err));

    return data;
  }

  async getJobStatus(listingId: string): Promise<PostingJob[]> {
    const { data, error } = await supabaseAdmin
      .from('posting_jobs')
      .select('*')
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error fetching job status:', error);
      throw error;
    }

    return data || [];
  }

  async getUserJobs(userId: string): Promise<PostingJob[]> {
    const { data, error } = await supabaseAdmin
      .from('posting_jobs')
      .select('*, listings(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }

    return data || [];
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Fetch pending jobs
      // We can also retry failed jobs that haven't exceeded max attempts?
      const { data: jobs, error } = await supabaseAdmin
        .from('posting_jobs')
        .select('*, listings(*)')
        .eq('status', 'pending')
        .limit(5); // Process 5 at a time

      if (error) {
        console.error('Error fetching pending jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      console.log(`Processing ${jobs.length} jobs...`);

      for (const job of jobs) {
        await this.processSingleJob(job);
      }

    } catch (err) {
      console.error('Error in processJobs loop:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSingleJob(job: any) {
    try {
      // Mark as processing
      await supabaseAdmin
        .from('posting_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      const adapter = this.adapters[job.platform];
      if (!adapter) {
        throw new Error(`No adapter found for platform: ${job.platform}`);
      }

      // Fetch credentials
      const { data: connection, error: connError } = await supabaseAdmin
        .from('marketplace_connections')
        .select('*')
        .eq('user_id', job.user_id)
        .eq('platform', job.platform)
        .single();

      if (connError || !connection) {
        throw new Error(`No connection found for ${job.platform}`);
      }

      // Merge metadata into connection object for the adapter
      const connectionData = {
        ...connection,
        ...connection.metadata,
        jobId: job.id
      };
      
      // Connect
      const isConnected = await adapter.connect(connectionData);
      if (!isConnected) {
        throw new Error('Adapter connection failed');
      }

      // Publish
      const result: PublishResult = await adapter.publish(job.listings, connectionData);

      // Disconnect
      if (adapter.disconnect) {
          await adapter.disconnect();
      }

      if (result.success) {
        // Mark as completed
        await supabaseAdmin
            .from('posting_jobs')
            .update({
            status: 'completed',
            result_data: result,
            updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

        console.log(`Job ${job.id} completed successfully.`);
      } else {
        // Handle logic failure from adapter (e.g. max retries exhausted)
        throw new Error(result.error || 'Unknown adapter failure');
      }

    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);

      await supabaseAdmin
        .from('posting_jobs')
        .update({
          status: 'failed',
          error_log: errorMessage,
          updated_at: new Date().toISOString(),
          attempts: (job.attempts || 0) + 1
        })
        .eq('id', job.id);
    }
  }
}

export const jobQueueService = new JobQueueService();