import { emailProxyService } from '../services/email-proxy.service';
import { emailRoutingService } from '../services/email-routing.service';

// Process cooldown expirations every hour
export function startPeriodicTasks(): void {
  // Process cooldowns every hour
  setInterval(async () => {
    try {
      const count = await emailProxyService.processCooldownExpiration();
      if (count > 0) {
        console.log(`[PeriodicTasks] Processed ${count} cooldown expirations`);
      }
    } catch (error) {
      console.error('[PeriodicTasks] Error processing cooldowns:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Process incoming emails every 2 minutes
  setInterval(async () => {
    try {
      const result = await emailRoutingService.processIncomingEmails();
      if (result.processed > 0) {
        console.log(`[PeriodicTasks] Email processing: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error('[PeriodicTasks] Error processing emails:', error);
    }
  }, 2 * 60 * 1000); // 2 minutes

  // Run immediately on startup
  setTimeout(async () => {
    try {
      await emailRoutingService.processIncomingEmails();
    } catch (error) {
      console.error('[PeriodicTasks] Initial email processing error:', error);
    }
  }, 10000); // 10 seconds after startup

  console.log('[PeriodicTasks] Started periodic task scheduler');
}