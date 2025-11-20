import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

router.post('/backfill-credits', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ credits: 5 })
      .or('credits.is.null,credits.eq.0')
      .select('id');

    if (error) {
      console.error('Backfill credits error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Credits backfilled successfully',
      updatedCount: data?.length || 0
    });
  } catch (error: any) {
    console.error('Backfill credits exception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;