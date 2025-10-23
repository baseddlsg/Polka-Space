// Mock Redis for testing
export class MockRedis {
  private data: Map<string, any> = new Map();
  private sets: Map<string, Set<string>> = new Map();
  private sortedSets: Map<string, Map<string, number>> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map();

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.data.set(key, value);
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    keys.forEach(key => {
      if (this.data.delete(key)) deleted++;
      if (this.sets.delete(key)) deleted++;
      if (this.sortedSets.delete(key)) deleted++;
      if (this.hashes.delete(key)) deleted++;
    });
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter(key => regex.test(key));
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    members.forEach(member => {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    });
    return added;
  }

  async scard(key: string): Promise<number> {
    return this.sets.get(key)?.size || 0;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    const sortedSet = this.sortedSets.get(key)!;
    const existed = sortedSet.has(member);
    sortedSet.set(member, score);
    return existed ? 0 : 1;
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) return [];
    
    return Array.from(sortedSet.entries())
      .filter(([, score]) => score >= min && score <= max)
      .sort(([, a], [, b]) => a - b)
      .map(([member]) => member);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const sortedSet = this.sortedSets.get(key);
    if (!sortedSet) return 0;
    
    let removed = 0;
    for (const [member, score] of sortedSet.entries()) {
      if (score >= min && score <= max) {
        sortedSet.delete(member);
        removed++;
      }
    }
    return removed;
  }

  async hset(key: string, field: string, value: string): Promise<number>;
  async hset(key: string, hash: Record<string, string>): Promise<number>;
  async hset(key: string, fieldOrHash: string | Record<string, string>, value?: string): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    
    if (typeof fieldOrHash === 'string' && value !== undefined) {
      const existed = hash.has(fieldOrHash);
      hash.set(fieldOrHash, value);
      return existed ? 0 : 1;
    } else if (typeof fieldOrHash === 'object') {
      let added = 0;
      Object.entries(fieldOrHash).forEach(([field, val]) => {
        if (!hash.has(field)) added++;
        hash.set(field, val);
      });
      return added;
    }
    return 0;
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.get(field) || null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    
    const result: Record<string, string> = {};
    hash.forEach((value, field) => {
      result[field] = value;
    });
    return result;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    const current = parseInt(hash.get(field) || '0');
    const newValue = current + increment;
    hash.set(field, newValue.toString());
    return newValue;
  }

  async flushdb(): Promise<'OK'> {
    this.data.clear();
    this.sets.clear();
    this.sortedSets.clear();
    this.hashes.clear();
    return 'OK';
  }
}

// Mock the ioredis module
jest.mock('ioredis', () => {
  return {
    Redis: MockRedis,
  };
});

export default MockRedis;