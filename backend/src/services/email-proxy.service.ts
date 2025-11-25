import { supabaseAdmin } from '../config/supabase';
import { gmailApiService } from './gmail-api.service';
import { encryptionService } from './encryption.service';

interface ProxyAssignment {
  id: string;
  userId: string;
  proxyPoolId: string;
  aliasPrefix: string;
  fullAlias: string;
  proxyEmail: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface ProxyPoolEntry {
  id: string;
  email: string;
  status: 'available' | 'assigned' | 'cooldown' | 'disabled';
  healthScore: number;
  lastUsedAt?: Date;
  cooldownUntil?: Date;
  dailySendCount: number;
  dailyReceiveCount: number;
}

export class EmailProxyService {
  private readonly COOLDOWN_HOURS = 24;
  private readonly MAX_DAILY_SENDS = 50;
  private readonly MAX_DAILY_RECEIVES = 200;
  private readonly MIN_HEALTH_SCORE = 50;

  /**
   * Assign an available proxy email to a user
   * Returns the full proxy email address with alias
   */
  async assignProxy(userId: string): Promise<ProxyAssignment | null> {
    // Check if user already has an active assignment
    const existing = await this.getUserActiveAssignment(userId);
    if (existing) {
      console.log(`[EmailProxyService] User ${userId} already has active proxy: ${existing.proxyEmail}`);
      return existing;
    }

    // Find the best available proxy
    const { data: availableProxies, error } = await supabaseAdmin
      .from('email_proxy_pool')
      .select('*')
      .eq('status', 'available')
      .gte('health_score', this.MIN_HEALTH_SCORE)
      .lt('daily_send_count', this.MAX_DAILY_SENDS)
      .order('health_score', { ascending: false })
      .order('last_used_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (error || !availableProxies || availableProxies.length === 0) {
      console.error(`[EmailProxyService] No available proxies: ${error?.message || 'Pool empty'}`);
      return null;
    }

    const proxy = availableProxies[0];
    const aliasPrefix = this.generateAliasPrefix();

    // Create assignment in a transaction-like manner
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from('email_proxy_assignments')
      .insert({
        user_id: userId,
        proxy_pool_id: proxy.id,
        alias_prefix: aliasPrefix,
        is_active: true,
      })
      .select()
      .single();

    if (assignError || !assignment) {
      console.error(`[EmailProxyService] Failed to create assignment: ${assignError?.message}`);
      return null;
    }

    // Update proxy status to assigned
    await supabaseAdmin
      .from('email_proxy_pool')
      .update({
        status: 'assigned',
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', proxy.id);

    // Construct the full proxy email
    const proxyEmail = this.constructProxyEmail(proxy.email, assignment.full_alias);

    console.log(`[EmailProxyService] Assigned proxy ${proxyEmail} to user ${userId}`);

    return {
      id: assignment.id,
      userId: assignment.user_id,
      proxyPoolId: assignment.proxy_pool_id,
      aliasPrefix: assignment.alias_prefix,
      fullAlias: assignment.full_alias,
      proxyEmail,
      assignedAt: new Date(assignment.assigned_at),
      expiresAt: assignment.expires_at ? new Date(assignment.expires_at) : undefined,
      isActive: assignment.is_active,
    };
  }

  /**
   * Release a proxy email assignment
   */
  async releaseProxy(assignmentId: string): Promise<void> {
    // Fetch the assignment to get proxy pool ID
    const { data: assignment, error } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select('proxy_pool_id')
      .eq('id', assignmentId)
      .single();

    if (error || !assignment) {
      console.error(`[EmailProxyService] Assignment not found: ${assignmentId}`);
      return;
    }

    // Mark assignment as inactive
    await supabaseAdmin
      .from('email_proxy_assignments')
      .update({ is_active: false })
      .eq('id', assignmentId);

    // Put proxy in cooldown
    const cooldownUntil = new Date();
    cooldownUntil.setHours(cooldownUntil.getHours() + this.COOLDOWN_HOURS);

    await supabaseAdmin
      .from('email_proxy_pool')
      .update({
        status: 'cooldown',
        cooldown_until: cooldownUntil.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.proxy_pool_id);

    console.log(`[EmailProxyService] Released assignment ${assignmentId}, proxy in cooldown until ${cooldownUntil}`);
  }

  /**
   * Get user's current active proxy assignment
   */
  async getUserActiveAssignment(userId: string): Promise<ProxyAssignment | null> {
    const { data, error } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select(`
        id,
        user_id,
        proxy_pool_id,
        alias_prefix,
        full_alias,
        assigned_at,
        expires_at,
        is_active,
        email_proxy_pool!inner(email)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    const proxyPool = data.email_proxy_pool as unknown as { email: string };
    const proxyEmail = this.constructProxyEmail(proxyPool.email, data.full_alias);

    return {
      id: data.id,
      userId: data.user_id,
      proxyPoolId: data.proxy_pool_id,
      aliasPrefix: data.alias_prefix,
      fullAlias: data.full_alias,
      proxyEmail,
      assignedAt: new Date(data.assigned_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      isActive: data.is_active,
    };
  }

  /**
   * Get proxy assignment by the email alias (for routing incoming emails)
   */
  async getAssignmentByAlias(alias: string): Promise<ProxyAssignment | null> {
    const { data, error } = await supabaseAdmin
      .from('email_proxy_assignments')
      .select(`
        id,
        user_id,
        proxy_pool_id,
        alias_prefix,
        full_alias,
        assigned_at,
        expires_at,
        is_active,
        email_proxy_pool!inner(email)
      `)
      .eq('full_alias', alias)
      .single();

    if (error || !data) {
      return null;
    }

    const proxyPool = data.email_proxy_pool as unknown as { email: string };
    const proxyEmail = this.constructProxyEmail(proxyPool.email, data.full_alias);

    return {
      id: data.id,
      userId: data.user_id,
      proxyPoolId: data.proxy_pool_id,
      aliasPrefix: data.alias_prefix,
      fullAlias: data.full_alias,
      proxyEmail,
      assignedAt: new Date(data.assigned_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      isActive: data.is_active,
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

  /**
   * Construct full proxy email from base email and alias
   */
  private constructProxyEmail(baseEmail: string, alias: string): string {
    const [localPart, domain] = baseEmail.split('@');
    return `${localPart}+${alias}@${domain}`;
  }

  /**
   * Extract alias from a proxy email address
   */
  extractAliasFromEmail(proxyEmail: string): string | null {
    const match = proxyEmail.match(/\+([^@]+)@/);
    return match ? match[1] : null;
  }

  /**
   * Process cooldown expiration - move proxies from cooldown back to available
   * Should be called periodically (e.g., every hour)
   */
  async processCooldownExpiration(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('email_proxy_pool')
      .update({
        status: 'available',
        cooldown_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'cooldown')
      .lte('cooldown_until', new Date().toISOString())
      .select();

    if (error) {
      console.error(`[EmailProxyService] Error processing cooldowns: ${error.message}`);
      return 0;
    }

    const count = data?.length || 0;
    if (count > 0) {
      console.log(`[EmailProxyService] Moved ${count} proxies from cooldown to available`);
    }
    return count;
  }

  /**
   * Update proxy health score
   */
  async updateHealthScore(proxyPoolId: string, delta: number): Promise<void> {
    // Fetch current health score
    const { data: proxy } = await supabaseAdmin
      .from('email_proxy_pool')
      .select('health_score')
      .eq('id', proxyPoolId)
      .single();

    if (!proxy) return;

    // Calculate new score, clamped between 0 and 100
    const newScore = Math.max(0, Math.min(100, proxy.health_score + delta));

    await supabaseAdmin
      .from('email_proxy_pool')
      .update({
        health_score: newScore,
        status: newScore < this.MIN_HEALTH_SCORE ? 'disabled' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proxyPoolId);

    if (newScore < this.MIN_HEALTH_SCORE) {
      console.log(`[EmailProxyService] Proxy ${proxyPoolId} disabled due to low health score: ${newScore}`);
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(): Promise<{
    total: number;
    available: number;
    assigned: number;
    cooldown: number;
    disabled: number;
    avgHealthScore: number;
  }> {
    const { data, error } = await supabaseAdmin
      .from('email_proxy_pool')
      .select('status, health_score');

    if (error || !data) {
      return { total: 0, available: 0, assigned: 0, cooldown: 0, disabled: 0, avgHealthScore: 0 };
    }

    const stats = {
      total: data.length,
      available: data.filter(p => p.status === 'available').length,
      assigned: data.filter(p => p.status === 'assigned').length,
      cooldown: data.filter(p => p.status === 'cooldown').length,
      disabled: data.filter(p => p.status === 'disabled').length,
      avgHealthScore: data.length > 0
        ? data.reduce((sum, p) => sum + p.health_score, 0) / data.length
        : 0,
    };

    return stats;
  }

  /**
   * Add a new proxy email to the pool (admin operation)
   */
  async addProxyToPool(email: string, credentials: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expiry_date: number;
  }): Promise<string> {
    const encryptedCredentials = encryptionService.encrypt(credentials);

    const { data, error } = await supabaseAdmin
      .from('email_proxy_pool')
      .insert({
        email,
        encrypted_credentials: encryptedCredentials,
        status: 'available',
        health_score: 100,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add proxy to pool: ${error.message}`);
    }

    console.log(`[EmailProxyService] Added new proxy to pool: ${email}`);
    return data.id;
  }
}

export const emailProxyService = new EmailProxyService();