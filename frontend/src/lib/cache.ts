/**
 * AI Prompt & Analysis LRU Cache with Deterministic SHA-256 Hashing
 * Prevents redundant LLM API queries and expensive vector parsing
 * for identical candidate resume + job requirement pairs.
 */

import { logger } from './logger';

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
}

export class LRUCache<T> {
  private capacity: number;
  private ttlMs: number;
  private cache: Map<string, CacheEntry<T>>;

  constructor(capacity: number = 100, ttlMs: number = 1000 * 60 * 60 * 24) { // default 24h
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL expiration
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      logger.debug('LRUCache', `Evicted expired key: ${key}`);
      return null;
    }

    // Refresh position in Map for LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    logger.debug('LRUCache', `Cache HIT for key: ${key.substring(0, 16)}...`);
    return entry.data;
  }

  public set(key: string, data: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest entry (first key in iteration)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug('LRUCache', `LRU capacity reached. Evicted: ${oldestKey.substring(0, 16)}...`);
      }
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
    });
  }

  public has(key: string): boolean {
    const data = this.get(key);
    return data !== null;
  }

  public clear(): void {
    this.cache.clear();
    logger.info('LRUCache', 'Cache cleared.');
  }

  public size(): number {
    return this.cache.size;
  }
}

/**
 * Calculates a deterministic SHA-256 hash string for arbitrary text.
 * Falls back gracefully to standard FNV-1a hash if window.crypto.subtle is unavailable.
 */
export async function computeHash(content: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }

  // Fallback FNV-1a 64-bit hash
  let hash1 = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash1 ^= content.charCodeAt(i);
    hash1 = Math.imul(hash1, 0x01000193);
  }
  return `fnv-${(hash1 >>> 0).toString(16)}`;
}

// Global singleton instance for single resume analysis results
export const analysisCache = new LRUCache<unknown>(150);
