import { describe, it, expect } from 'vitest';
import { backgroundEngine } from '../../src/services/background-service';

describe('backgroundEngine', () => {
  it('initializes and returns default statistics', () => {
    const stats = backgroundEngine.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.overdueCount).toBe('number');
    expect(typeof stats.dueTodayCount).toBe('number');
    expect(typeof stats.lastSyncStatus).toBe('string');
  });

  it('allows subscription to background stats updates', () => {
    let capturedStats: any = null;
    const unsubscribe = backgroundEngine.subscribe((stats) => {
      capturedStats = stats;
    });

    expect(capturedStats).not.toBeNull();
    expect(capturedStats.lastSyncStatus).toBeDefined();
    unsubscribe();
  });
});
