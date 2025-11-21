import { Router } from 'express';
import { jobQueueService } from '../services/job-queue.service';
import { verifyToken, requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all routes
router.use(verifyToken as any);
router.use(requireAuth as any);

// POST /api/postings/publish
router.post('/publish', async (req, res, next) => {
  try {
    const { listingId, platforms } = req.body;
    const userId = req.user!.id;

    if (!listingId || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ error: 'Missing listingId or platforms array' });
    }

    const jobs = [];
    for (const platform of platforms) {
      const job = await jobQueueService.addJob(listingId, platform, userId);
      jobs.push(job);
    }

    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
});

// GET /api/postings/user
router.get('/user', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const jobs = await jobQueueService.getUserJobs(userId);
    res.json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
});

// GET /api/postings/status/:listingId
router.get('/status/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const jobs = await jobQueueService.getJobStatus(listingId);
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

export const postingRoutes = router;