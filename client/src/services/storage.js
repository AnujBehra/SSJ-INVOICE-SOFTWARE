const PREFIX = 'ssj_persist_v1_';

// Purge any legacy toxic tombstones that previously hid server records on refresh
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    Object.keys(localStorage).forEach(k => {
      if (k.endsWith('_deleted')) {
        localStorage.removeItem(k);
      }
    });
  }
} catch (e) {}

export const storage = {
  get(key, fallback = []) {
    try {
      const data = localStorage.getItem(`${PREFIX}${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
  },

  record(key, item) {
    if (!item || item.id === undefined || item.id === null) return [];
    try {
      const existing = this.get(key, []);
      const updated = [item, ...existing.filter(x => String(x.id) !== String(item.id))];
      this.set(key, updated);
      return updated;
    } catch (e) {
      return [];
    }
  },

  remove(key, id) {
    if (id === undefined || id === null) return [];
    try {
      const existing = this.get(key, []);
      const updated = existing.filter(x => String(x.id) !== String(id));
      this.set(key, updated);
      return updated;
    } catch (e) {
      return [];
    }
  },

  // Authoritative server data persistence: Server data ALWAYS wins and never gets suppressed
  merge(key, serverList = []) {
    try {
      if (Array.isArray(serverList)) {
        this.set(key, serverList);
        return serverList;
      }
      return this.get(key, []);
    } catch (e) {
      return Array.isArray(serverList) ? serverList : [];
    }
  },

  clearAll() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith(PREFIX)) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch (e) {}
  }
};
