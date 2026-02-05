const PREFIX = 'declanalytics_';

type CacheOptions = {
  storage?: 'session' | 'local';
  ttl?: number; // ms
};

const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export const CacheService = {
  set<T>(key: string, data: T, options: CacheOptions = {}) {
    if (typeof window === 'undefined') return;
    
    const { storage = 'session', ttl = DEFAULT_TTL } = options;
    const store = storage === 'local' ? localStorage : sessionStorage;
    
    try {
      const entry = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + ttl
      };
      store.setItem(PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn(`Cache full: failed to set ${key}`, e);
    }
  },

  get<T>(key: string, storage: 'session' | 'local' = 'session'): T | null {
    if (typeof window === 'undefined') return null;
    
    const store = storage === 'local' ? localStorage : sessionStorage;
    const item = store.getItem(PREFIX + key);
    
    if (!item) return null;
    
    try {
      const entry = JSON.parse(item);
      if (Date.now() > entry.expires) {
        store.removeItem(PREFIX + key);
        return null;
      }
      return entry.data as T;
    } catch {
      return null;
    }
  },

  remove(key: string) {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(PREFIX + key);
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    if (typeof window === 'undefined') return;
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith(PREFIX)) sessionStorage.removeItem(k);
    });
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
  }
};
