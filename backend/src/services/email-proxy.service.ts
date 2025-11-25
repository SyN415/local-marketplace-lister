import { supabaseAdmin } from '../config/supabase';

export class EmailProxyService {
  /**
   * Assign an available proxy email to a user
   * @returns The assigned proxy email address or null if none available
   */
  async assignProxy(userId: string): Promise<string | null> {
    // TODO: Implement when Gmail API integration is ready
    // 1. Find available proxy with highest health score
    // 2. Create assignment with unique alias
    // 3. Update proxy status to 'assigned'
    // 4. Return the full proxy email (e.g., "proxyemail+alias@gmail.com")
    console.log(`[EmailProxyService] assignProxy called for user ${userId} - not yet implemented`);
    return null;
  }

  /**
   * Release a proxy email assignment
   */
  async releaseProxy(assignmentId: string): Promise<void> {
    // TODO: Implement
    // 1. Mark assignment as inactive
    // 2. Put proxy in cooldown status
    console.log(`[EmailProxyService] releaseProxy called for ${assignmentId} - not yet implemented`);
  }

  /**
   * Get user's current proxy assignment
   */
  async getUserProxy(userId: string): Promise<{ proxyEmail: string; assignmentId: string } | null> {
    const { data, error } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select(`
        id,
        full_alias,
        email_proxy_pool!inner(email)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Construct the full proxy email
    const proxyPool = data.email_proxy_pool as unknown as { email: string };
    const [localPart, domain] = proxyPool.email.split('@');
    const proxyEmail = `${localPart}+${data.full_alias}@${domain}`;

    return {
      proxyEmail,
      assignmentId: data.id
    };
  }

  /**
   * Generate a unique alias prefix for tracking
   */
  generateAliasPrefix(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cl-${timestamp}-${random}`;
  }
}

export const emailProxyService = new EmailProxyService();