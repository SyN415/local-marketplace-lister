import { supabaseAdmin } from '../config/supabase';
import { jobQueueService } from '../services/job-queue.service';
import { v4 as uuidv4 } from 'uuid';

async function testCraigslistAdapter() {
  console.log('Starting Craigslist Adapter Test...');

  try {
    // 1. Create a test user (if not exists, but we'll just generate a random ID for simplicity if FK constraints allow, 
    // OR better, use an existing one. Let's try to find one first.)
    
    // Actually, we need a real user ID because of foreign key constraints in `listings` and `marketplace_connections`.
    // Let's create a temp user.
    const testEmail = `test-cl-user-${Date.now()}@example.com`;
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'password123',
      email_confirm: true
    });

    if (userError || !user.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }
    const userId = user.user.id;
    console.log(`Created test user: ${userId}`);

    // Ensure profile exists (triggers might handle this, but let's be safe)
    await supabaseAdmin.from('profiles').upsert({ id: userId, email: testEmail, full_name: 'Test User' });

    // 2. Create a test listing
    const listingId = uuidv4();
    const { error: listingError } = await supabaseAdmin.from('listings').insert({
      id: listingId,
      user_id: userId,
      title: 'Test Item for Craigslist',
      description: 'This is a test item description for the Craigslist adapter integration.',
      price: 50,
      category: 'Electronics',
      condition: 'good',
      status: 'active',
      images: ['https://placehold.co/600x400']
    });

    if (listingError) {
      throw new Error(`Failed to create listing: ${listingError.message}`);
    }
    console.log(`Created test listing: ${listingId}`);

    // 3. Create marketplace connection
    const { error: connError } = await supabaseAdmin.from('marketplace_connections').insert({
      user_id: userId,
      platform: 'craigslist',
      metadata: {
        cl_username: 'testuser',
        cl_password: 'testpassword'
      }
    });

    if (connError) {
      throw new Error(`Failed to create connection: ${connError.message}`);
    }
    console.log('Created marketplace connection');

    // 4. Add job to queue
    const job = await jobQueueService.addJob(listingId, 'craigslist', userId);
    if (!job) throw new Error('Failed to add job');
    console.log(`Added job: ${job.id}`);

    // 5. Process jobs
    console.log('Processing jobs...');
    await jobQueueService.processJobs();

    // 6. Check status
    const jobs = await jobQueueService.getJobStatus(listingId);
    const processedJob = jobs.find(j => j.id === job.id);
    
    console.log('Job Status:', processedJob?.status);
    console.log('Job Result:', processedJob?.result_data);
    console.log('Job Error:', processedJob?.error_log);

    if (processedJob?.status === 'failed' && processedJob.error_log?.includes('Posting failed with status')) {
        console.log('SUCCESS: Adapter ran and attempted to post (failed as expected with invalid credentials).');
    } else if (processedJob?.status === 'completed') {
        console.log('SUCCESS: Adapter ran successfully (unexpected for invalid credentials but flow worked).');
    } else {
        console.log('WARNING: Job outcome uncertain.');
    }

    // Cleanup (optional)
    // await supabaseAdmin.auth.admin.deleteUser(userId);

  } catch (error: any) {
    console.error('Test failed:', error);
  }
}

testCraigslistAdapter();