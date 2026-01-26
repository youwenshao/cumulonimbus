/**
 * Encryption Utilities for Secure API Key Storage
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment variable
 * Throws if the key is not configured
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. API key encryption is disabled.');
  }
  
  // The key should be a base64-encoded 32-byte key
  const keyBuffer = Buffer.from(key, 'base64');
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (base64 encoded). Got ${keyBuffer.length} bytes.`);
  }
  
  return keyBuffer;
}

/**
 * Check if encryption is available (key is configured)
 */
export function isEncryptionAvailable(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt an API key using AES-256-GCM
 * Returns a string in format: iv:encryptedData:authTag (all base64 encoded)
 * 
 * @param plaintext - The API key to encrypt
 * @returns Encrypted string
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = getEncryptionKey();
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Encrypt the plaintext
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine iv:encrypted:authTag
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an API key that was encrypted with encryptApiKey
 * 
 * @param encryptedString - The encrypted string in format iv:encryptedData:authTag
 * @returns Decrypted plaintext
 */
export function decryptApiKey(encryptedString: string): string {
  if (!encryptedString) {
    throw new Error('Cannot decrypt empty value');
  }

  const key = getEncryptionKey();
  
  // Parse the encrypted string
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:encryptedData:authTag');
  }
  
  const [ivBase64, encryptedBase64, authTagBase64] = parts;
  
  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  // Validate lengths
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH}, got ${iv.length}`);
  }
  
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length. Expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  
  // Set the authentication tag
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Mask an API key for display purposes
 * Shows first 4 and last 4 characters
 * 
 * @param key - The API key to mask
 * @returns Masked key like "sk-a1...x9z2"
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  
  if (key.length <= 8) {
    // Very short key, just show asterisks
    return '*'.repeat(key.length);
  }
  
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  
  return `${start}...${end}`;
}

/**
 * Generate a new encryption key (for setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * 
 * @returns Base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Validate that a string looks like an API key
 * Basic validation - checks minimum length and allowed characters
 * 
 * @param key - The API key to validate
 * @param provider - The provider type for provider-specific validation
 * @returns Whether the key appears valid
 */
export function validateApiKeyFormat(key: string, provider: 'deepseek' | 'openrouter'): { valid: boolean; error?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, error: 'API key is required' };
  }
  
  const trimmedKey = key.trim();
  
  if (trimmedKey.length < 10) {
    return { valid: false, error: 'API key is too short' };
  }
  
  if (trimmedKey.length > 200) {
    return { valid: false, error: 'API key is too long' };
  }
  
  // Provider-specific validation
  if (provider === 'deepseek') {
    // DeepSeek keys typically start with "sk-"
    if (!trimmedKey.startsWith('sk-')) {
      return { valid: false, error: 'DeepSeek API keys should start with "sk-"' };
    }
  }
  
  if (provider === 'openrouter') {
    // OpenRouter keys typically start with "sk-or-"
    if (!trimmedKey.startsWith('sk-or-')) {
      return { valid: false, error: 'OpenRouter API keys should start with "sk-or-"' };
    }
  }
  
  return { valid: true };
}
