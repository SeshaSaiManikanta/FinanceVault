// VaultFinance — AES-256-GCM Field Encryption
// Used for Aadhaar, PAN, and other sensitive PII
// © 2025 VaultFinance. All Rights Reserved.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;      // 128-bit IV
const TAG_LENGTH = 16;     // 128-bit auth tag
const KEY_LENGTH = 32;     // 256-bit key

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 64) {
    throw new Error('ENCRYPTION_KEY must be set and at least 64 hex chars (32 bytes)');
  }
  return Buffer.from(key, 'hex').slice(0, KEY_LENGTH);
}

export interface EncryptedField {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns ciphertext, IV, and authentication tag — all as hex strings.
 */
export function encryptField(plaintext: string): EncryptedField {
  if (!plaintext) throw new Error('Cannot encrypt empty value');

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertextBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertextBuffer.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted field.
 * Throws if authentication fails (tampered data).
 */
export function decryptField(encrypted: EncryptedField): string {
  if (!encrypted?.ciphertext || !encrypted?.iv || !encrypted?.tag) {
    throw new Error('Invalid encrypted field structure');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const tag = Buffer.from(encrypted.tag, 'hex');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

/**
 * Safely decrypt — returns masked value on failure (never throws in UI context).
 */
export function safeDecrypt(encrypted: EncryptedField | null | undefined, fallback = '••••'): string {
  if (!encrypted) return fallback;
  try {
    return decryptField(encrypted);
  } catch {
    return fallback;
  }
}

/**
 * Mask sensitive value — show only last 4 chars.
 * e.g. Aadhaar: ••••-••••-1234, PAN: AB•••••2F
 */
export function maskAadhaar(plaintext: string): string {
  if (!plaintext) return '••••-••••-????';
  const digits = plaintext.replace(/\D/g, '');
  return `••••-••••-${digits.slice(-4)}`;
}

export function maskPAN(plaintext: string): string {
  if (!plaintext || plaintext.length < 4) return '••••••••••';
  return `${plaintext.slice(0, 2)}•••••${plaintext.slice(-2)}`;
}

/**
 * Generate a secure random key for first-time setup.
 * Run: node -e "require('./utils/encryption').generateKey()"
 */
export function generateKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash a PIN or short secret using PBKDF2.
 * More appropriate than bcrypt for 4-digit PINs.
 */
export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(pin, saltBuf, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return {
    hash: hash.toString('hex'),
    salt: saltBuf.toString('hex'),
  };
}

export async function verifyPin(pin: string, storedHash: string, storedSalt: string): Promise<boolean> {
  const { hash } = await hashPin(pin, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}
