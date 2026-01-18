/**
 * Unit tests for utility functions
 */

import { cn, generateId, formatDate, formatTime, sleep, truncate } from '../utils';

describe('cn (className merge)', () => {
  it('should merge simple class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'active', false && 'disabled');
    expect(result).toBe('base active');
  });

  it('should handle undefined and null', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('should handle object syntax', () => {
    const result = cn({ active: true, disabled: false });
    expect(result).toBe('active');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle complex Tailwind merge scenarios', () => {
    const result = cn('bg-red-500 hover:bg-red-600', 'bg-blue-500');
    expect(result).toBe('hover:bg-red-600 bg-blue-500');
  });
});

describe('generateId', () => {
  it('should generate a string ID', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should generate non-empty IDs', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should generate alphanumeric IDs', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should generate IDs of reasonable length', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThanOrEqual(20);
    expect(id.length).toBeLessThanOrEqual(30);
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('should format ISO date string', () => {
    const result = formatDate('2024-06-20');
    expect(result).toMatch(/Jun 20, 2024/);
  });

  it('should handle datetime string', () => {
    const result = formatDate('2024-03-10T14:30:00Z');
    // Time zone may affect the date, so just check month and year
    expect(result).toMatch(/Mar.*2024/);
  });

  it('should handle start of year', () => {
    const result = formatDate('2024-01-01');
    expect(result).toMatch(/Jan 1, 2024/);
  });

  it('should handle end of year', () => {
    const result = formatDate('2024-12-31');
    expect(result).toMatch(/Dec 31, 2024/);
  });

  it('should handle leap year date', () => {
    const result = formatDate('2024-02-29');
    expect(result).toMatch(/Feb 29, 2024/);
  });
});

describe('formatTime', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatTime(date);
    // Check for time format (could be 12h or 24h depending on locale)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should format datetime string', () => {
    const result = formatTime('2024-01-15T08:45:00');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should handle midnight', () => {
    const result = formatTime('2024-01-15T00:00:00');
    expect(result).toMatch(/12:00/);
  });

  it('should handle noon', () => {
    const result = formatTime('2024-01-15T12:00:00');
    expect(result).toMatch(/12:00/);
  });
});

describe('sleep', () => {
  it('should resolve after specified milliseconds', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
    expect(elapsed).toBeLessThan(100); // Should not take too long
  });

  it('should return a Promise', () => {
    const result = sleep(1);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should handle 0ms sleep', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('truncate', () => {
  it('should truncate string longer than limit', () => {
    const result = truncate('Hello, World!', 5);
    expect(result).toBe('Hello...');
  });

  it('should not truncate string shorter than limit', () => {
    const result = truncate('Hi', 10);
    expect(result).toBe('Hi');
  });

  it('should not truncate string equal to limit', () => {
    const result = truncate('Hello', 5);
    expect(result).toBe('Hello');
  });

  it('should handle empty string', () => {
    const result = truncate('', 10);
    expect(result).toBe('');
  });

  it('should handle limit of 0', () => {
    const result = truncate('Hello', 0);
    expect(result).toBe('...');
  });

  it('should handle limit of 1', () => {
    const result = truncate('Hello', 1);
    expect(result).toBe('H...');
  });

  it('should handle very long strings', () => {
    const longStr = 'a'.repeat(1000);
    const result = truncate(longStr, 100);
    expect(result).toBe('a'.repeat(100) + '...');
    expect(result.length).toBe(103);
  });

  it('should handle unicode characters', () => {
    const result = truncate('Hello 👋 World', 8);
    expect(result).toBe('Hello 👋...');
  });

  it('should handle strings with newlines', () => {
    const result = truncate('Hello\nWorld', 5);
    expect(result).toBe('Hello...');
  });
});

describe('Edge Cases', () => {
  describe('generateId edge cases', () => {
    it('should work under high concurrency', async () => {
      const promises = Array(100).fill(null).map(() => Promise.resolve(generateId()));
      const ids = await Promise.all(promises);
      const unique = new Set(ids);
      expect(unique.size).toBe(100);
    });
  });

  describe('formatDate edge cases', () => {
    it('should handle very old dates', () => {
      const result = formatDate('1900-01-01');
      expect(result).toMatch(/Jan 1, 1900/);
    });

    it('should handle future dates', () => {
      const result = formatDate('2099-12-31');
      expect(result).toMatch(/Dec 31, 2099/);
    });

    it('should handle Date at epoch', () => {
      const result = formatDate(new Date(0));
      expect(result).toMatch(/1969|1970/); // Depends on timezone
    });
  });

  describe('cn edge cases', () => {
    it('should handle deeply nested arrays', () => {
      const result = cn([['nested', 'classes']]);
      expect(result).toBe('nested classes');
    });

    it('should handle mixed complex inputs', () => {
      const result = cn(
        'base',
        { active: true, hidden: false },
        ['extra', 'classes'],
        undefined,
        null,
        '',
        'final'
      );
      expect(result).toBe('base active extra classes final');
    });
  });
});
