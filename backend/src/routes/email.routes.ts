import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// GET /api/email-stats
// Returns email statistics for the current user
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    // Get proxy assignment info
    const { data: assignment } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select(`
        id,
        full_alias,
        assigned_at,
        email_proxy_pool!inner(email)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    // Cast assignment to any to handle the joined property safely
    const proxyAssignment = assignment as any;

    // Get email stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabaseAdmin
      .from('email_logs')
      .select('id, direction, is_spam, forwarding_status, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (logsError) throw logsError;

    // Calculate stats
    // Note: assignment.email_proxy_pool.email is like 'user@proxy.com'
    // We want to construct something like 'user+alias@proxy.com' if that's how it works,
    // or just return the full email if available.
    // The instructions say: `${assignment.email_proxy_pool.email.split('@')[0]}+${assignment.full_alias}@${assignment.email_proxy_pool.email.split('@')[1]}`
    
    let proxyEmail = null;
    if (proxyAssignment && proxyAssignment.email_proxy_pool && proxyAssignment.email_proxy_pool.email) {
      const emailParts = proxyAssignment.email_proxy_pool.email.split('@');
      if (emailParts.length === 2) {
        proxyEmail = `${emailParts[0]}+${proxyAssignment.full_alias}@${emailParts[1]}`;
      }
    }

    const stats = {
      hasProxyEmail: !!proxyAssignment,
      proxyEmail: proxyEmail,
      assignedAt: proxyAssignment?.assigned_at || null,
      totalReceived: logs?.filter((l: any) => l.direction === 'inbound').length || 0,
      totalForwarded: logs?.filter((l: any) => l.forwarding_status === 'sent').length || 0,
      spamBlocked: logs?.filter((l: any) => l.is_spam).length || 0,
      last7Days: {
        received: logs?.filter((l: any) => {
          const date = new Date(l.created_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return l.direction === 'inbound' && date >= sevenDaysAgo;
        }).length || 0,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

export const emailRoutes = router;
export default emailRoutes;