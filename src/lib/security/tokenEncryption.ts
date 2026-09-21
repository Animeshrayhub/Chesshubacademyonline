import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

/**
 * Retrieves the 32-byte encryption key from environment variables.
 */
function getEncryptionKey(): Buffer {
  const rawKey =
    process.env.GOOGLE_OAUTH_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'chesshub-development-gmeet-secret-seed-key';

  // If provided as 64-character hex string
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }
  // If provided as 32-character string
  if (Buffer.byteLength(rawKey, 'utf-8') === 32) {
    return Buffer.from(rawKey, 'utf-8');
  }
  // Hash arbitrary length keys to 32 bytes using SHA-256
  return crypto.createHash('sha256').update(rawKey).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a sensitive string (e.g. Google refresh token) using AES-256-GCM.
 */
export function encryptToken(plainText: string): EncryptedPayload {
  if (!plainText) {
    throw new Error('Cannot encrypt empty token.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted token payload.
 */
export function decryptToken(ciphertext: string, ivHex: string, tagHex: string): string {
  if (!ciphertext || !ivHex || !tagHex) {
    throw new Error('Incomplete encryption payload provided for decryption.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
