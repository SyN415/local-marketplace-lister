import crypto from 'crypto';
import config from '../config/config';

/**
 * AES-256-GCM Encryption Service for secure credential storage
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encoding: BufferEncoding = 'base64';

  private key: Buffer;

  constructor() {
    const encryptionKey = config.encryption?.key || process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      console.warn('[EncryptionService] No encryption key configured. Using derived key from JWT_SECRET (not recommended for production)');
      // Fallback: derive from JWT_SECRET (not ideal but better than failing)
      const fallbackKey = config.JWT_SECRET || 'default-fallback-key-change-me';
      this.key = crypto.scryptSync(fallbackKey, 'salt', this.keyLength);
    } else {
      // Key should be provided as base64 encoded 32-byte key
      this.key = Buffer.from(encryptionKey, 'base64');
      
      if (this.key.length !== this.keyLength) {
        throw new Error(`Encryption key must be ${this.keyLength} bytes (${this.keyLength * 8} bits). Got ${this.key.length} bytes.`);
      }
    }
  }

  /**
   * Encrypt an object (e.g., credentials) to a string
   */
  encrypt(data: Record<string, any>): string {
    const plaintext = JSON.stringify(data);
    
    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', this.encoding);
    encrypted += cipher.final(this.encoding);
    
    // Get auth tag
    const tag = cipher.getAuthTag();
    
    // Combine: iv + tag + ciphertext
    const combined = Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, this.encoding)
    ]);
    
    return combined.toString(this.encoding);
  }

  /**
   * Decrypt a string back to an object
   */
  decrypt<T = Record<string, any>>(encryptedString: string): T {
    const combined = Buffer.from(encryptedString, this.encoding);
    
    // Extract components
    const iv = combined.subarray(0, this.ivLength);
    const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
    const ciphertext = combined.subarray(this.ivLength + this.tagLength);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(ciphertext.toString(this.encoding), this.encoding, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted) as T;
  }

  /**
   * Check if a value appears to be encrypted (base64 of sufficient length)
   */
  isEncrypted(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // Minimum length: iv (16) + tag (16) + at least some ciphertext
    const minLength = (this.ivLength + this.tagLength + 10) * 4 / 3;
    if (value.length < minLength) return false;
    
    // Check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(value);
  }

  /**
   * Generate a new encryption key (for .env setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();