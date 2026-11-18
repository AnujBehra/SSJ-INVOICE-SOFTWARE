const PREFIX = 'ssj_persist_v1_';

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
    if (!item || !item.id) return [];
    try {
      const existing = this.get(key, []);
      const updated = [item, ...existing.filter(x => String(x.id) !== String(item.id))];
      this.set(key, updated);

      // Clean from deleted tombstones if re-added
      const tombstones = this.get(`${key}_deleted`, []);
      if (tombstones.includes(String(item.id))) {
        this.set(`${key}_deleted`, tombstones.filter(id => id !== String(item.id)));
      }
      return updated;
    } catch (e) {
      return [];
    }
  },

  remove(key, id) {
    if (!id) return [];
    try {
      const existing = this.get(key, []);
      const updated = existing.filter(x => String(x.id) !== String(id));
      this.set(key, updated);

      // Record tombstone so it won't resurrect on server merge
      const tombstones = this.get(`${key}_deleted`, []);
      if (!tombstones.includes(String(id))) {
        this.set(`${key}_deleted`, [...tombstones, String(id)]);
      }
      return updated;
    } catch (e) {
      return [];
    }
  },

  merge(key, serverList = []) {
    try {
      const localList = this.get(key, []);
      const tombstones = new Set(this.get(`${key}_deleted`, []));

      // Filter out deleted items from server
      const validServerList = Array.isArray(serverList) 
        ? serverList.filter(item => item && !tombstones.has(String(item.id)))
        : [];

      // Merge: local-created items that server doesn't have yet + server items
      const localOnly = localList.filter(
        item => item && !validServerList.some(s => String(s.id) === String(item.id)) && !tombstones.has(String(item.id))
      );

      const merged = [...localOnly, ...validServerList];
      this.set(key, merged);
      return merged;
    } catch (e) {
      return Array.isArray(serverList) ? serverList : [];
    }
  }
};
