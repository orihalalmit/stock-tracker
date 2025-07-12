class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 30000; // 30 seconds default TTL
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Get cache key for stock snapshots
  getSnapshotsKey(symbols) {
    return `snapshots:${symbols.sort().join(',')}`;
  }

  // Get cache key for individual symbol
  getSymbolKey(symbol) {
    return `symbol:${symbol}`;
  }

  // Get cache key for bars
  getBarsKey(symbols, timeframe, start, end) {
    return `bars:${symbols.sort().join(',')}:${timeframe}:${start}:${end}`;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired
    };
  }
}

module.exports = CacheService; 