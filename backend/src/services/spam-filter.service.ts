import { supabaseAdmin } from '../config/supabase';

interface SpamCheckResult {
  isSpam: boolean;
  score: number;  // 0-100, higher = more likely spam
  reasons: string[];
}

interface EmailContent {
  from: string;
  subject: string;
  body: string;
  labels?: string[];
}

export class SpamFilterService {
  // Known spam patterns
  private readonly SPAM_KEYWORDS = [
    'nigerian prince', 'wire transfer', 'western union', 'moneygram',
    'cashier check', 'certified check', 'overpayment', 'shipping agent',
    'i am interested in your item', 'dear seller', 'kindly send',
    'paypal invoice', 'zelle payment', 'venmo payment',
    'off craigslist', 'off the platform', 'text me at',
    'call me at',' whatsapp ', 'telegram ',
    'click here', 'click this link', 'bit.ly/', 'tinyurl.com/',
    'free money', 'lottery winner', 'congratulations winner',
    'bitcoin', 'cryptocurrency', 'crypto payment',
  ];

  private readonly SPAM_EMAIL_PATTERNS = [
    /reply.*@.*craigslist\.org$/i,  // Valid CL anonymized emails (not spam)
    /@(yahoo|gmail|hotmail|outlook)\.(com|net)$/i,  // Common providers (neutral)
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    /\$\d{4,}/,  // Large dollar amounts mentioned
    /western\s*union/i,
    /\bmoney\s*order\b/i,
    /\boverpay/i,
    /\bshipping\s*company\b/i,
    /\bagent\b.*\b(will|can)\b/i,
    /\bsend\b.*\b(code|pin|password)\b/i,
    /https?:\/\/[^\s]+/gi,  // Any links (mild suspicion)
  ];

  /**
   * Check if an email is spam
   */
  checkSpam(email: EmailContent): SpamCheckResult {
    const reasons: string[] = [];
    let score = 0;

    // Check Gmail's spam label first
    if (email.labels?.includes('SPAM')) {
      score += 80;
      reasons.push('Gmail flagged as spam');
    }

    // Check subject line
    const subjectLower = (email.subject || '').toLowerCase();
    for (const keyword of this.SPAM_KEYWORDS) {
      if (subjectLower.includes(keyword)) {
        score += 15;
        reasons.push(`Subject contains spam keyword: "${keyword}"`);
      }
    }

    // Check body content
    const bodyLower = (email.body || '').toLowerCase();
    for (const keyword of this.SPAM_KEYWORDS) {
      if (bodyLower.includes(keyword)) {
        score += 10;
        reasons.push(`Body contains spam keyword: "${keyword}"`);
      }
    }

    // Check suspicious patterns in body
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(email.body || '')) {
        score += 8;
        reasons.push(`Body matches suspicious pattern: ${pattern.source}`);
      }
    }

    // Check sender
    const fromLower = (email.from || '').toLowerCase();
    if (fromLower.includes('noreply') || fromLower.includes('no-reply')) {
      score += 5;
      reasons.push('Sender appears to be a no-reply address');
    }

    // Check for extremely short messages (often spam)
    if ((email.body || '').length < 20) {
      score += 10;
      reasons.push('Message body is suspiciously short');
    }

    // Check for all caps subject (common spam trait)
    if (email.subject && email.subject === email.subject.toUpperCase() && email.subject.length > 5) {
      score += 5;
      reasons.push('Subject is all caps');
    }

    // Normalize score to 0-100
    score = Math.min(100, score);

    return {
      isSpam: score >= 50,  // Threshold for marking as spam
      score,
      reasons,
    };
  }

  /**
   * Check if an email appears to be a legitimate Craigslist buyer inquiry
   */
  isLegitimateInquiry(email: EmailContent): boolean {
    const body = (email.body || '').toLowerCase();
    
    // Positive signals for legitimate buyer
    const positiveSignals = [
      /is (this|it) still available/i,
      /interested\s+(in|to)\s+(buy|purchase|the)/i,
      /what('s| is) your (lowest|best) price/i,
      /can i (come|pick|see|look)/i,
      /when (are you|can i) (available|pick)/i,
      /where (are you|is it) located/i,
      /does (it|this) work/i,
      /any (issues|problems) with/i,
    ];

    for (const signal of positiveSignals) {
      if (signal.test(body)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Log spam detection result
   */
  async logSpamCheck(
    emailLogId: string,
    result: SpamCheckResult
  ): Promise<void> {
    await supabaseAdmin
      .from('email_logs')
      .update({
        is_spam: result.isSpam,
        spam_score: result.score,
        spam_reasons: result.reasons,
      })
      .eq('id', emailLogId);
  }
}

export const spamFilterService = new SpamFilterService();