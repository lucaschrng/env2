import { describe, expect, it } from 'vitest';

import { mergeEnvContent, parseEnvContent, serializeEnvGroups } from './env-parser';

describe('parseEnvContent', () => {
  it('parses simple key=value pairs', () => {
    const groups = parseEnvContent('FOO=bar\nBAZ=qux\n');
    expect(groups).toHaveLength(1);
    expect(groups[0].vars).toEqual([
      { key: 'FOO', value: 'bar' },
      { key: 'BAZ', value: 'qux' },
    ]);
  });

  it('groups vars by preceding comment', () => {
    const content = '# Database\nDB_URL=postgres\nDB_PORT=5432\n\n# Redis\nREDIS_URL=redis\n';
    const groups = parseEnvContent(content);
    expect(groups).toHaveLength(2);
    expect(groups[0].comment).toBe('# Database');
    expect(groups[0].vars).toHaveLength(2);
    expect(groups[1].comment).toBe('# Redis');
    expect(groups[1].vars).toHaveLength(1);
  });

  it('handles empty values', () => {
    const groups = parseEnvContent('EMPTY=\n');
    expect(groups[0].vars[0]).toEqual({ key: 'EMPTY', value: '' });
  });

  it('handles vars without comments', () => {
    const groups = parseEnvContent('A=1\n');
    expect(groups[0].comment).toBeUndefined();
  });

  it('splits groups on blank lines', () => {
    const groups = parseEnvContent('A=1\n\nB=2\n');
    expect(groups).toHaveLength(2);
  });
});

describe('serializeEnvGroups', () => {
  it('serializes groups to .env format', () => {
    const result = serializeEnvGroups([
      { comment: '# DB', vars: [{ key: 'URL', value: 'postgres' }] },
    ]);
    expect(result).toBe('# DB\nURL=postgres\n');
  });

  it('skips groups with no vars', () => {
    const result = serializeEnvGroups([
      { comment: '# Empty', vars: [] },
      { vars: [{ key: 'A', value: '1' }] },
    ]);
    expect(result).toBe('A=1\n');
  });
});

describe('parseEnvContent → serializeEnvGroups round-trip', () => {
  it('preserves content', () => {
    const original = '# Config\nA=1\nB=2\n';
    const groups = parseEnvContent(original);
    const serialized = serializeEnvGroups(groups);
    expect(serialized).toBe(original);
  });
});

describe('mergeEnvContent', () => {
  it('updates existing vars in-place', () => {
    const existing = 'A=old\nB=keep\n';
    const selected = [{ vars: [{ key: 'A', value: 'new' }] }];
    const result = mergeEnvContent(existing, selected);
    expect(result).toContain('A=new');
    expect(result).toContain('B=keep');
  });

  it('appends new vars', () => {
    const existing = 'A=1\n';
    const selected = [{ comment: '# New', vars: [{ key: 'B', value: '2' }] }];
    const result = mergeEnvContent(existing, selected);
    expect(result).toContain('A=1');
    expect(result).toContain('# New');
    expect(result).toContain('B=2');
  });

  it('preserves existing comments', () => {
    const existing = '# Header\nA=1\n';
    const selected = [{ vars: [{ key: 'A', value: '2' }] }];
    const result = mergeEnvContent(existing, selected);
    expect(result).toContain('# Header');
    expect(result).toContain('A=2');
  });
});
