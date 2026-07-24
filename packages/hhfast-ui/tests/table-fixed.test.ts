import { describe, expect, it } from 'vitest';
import {
  buildFixedColumnOffsets,
  normalizeColumnFixed,
  resolveColumnWidthPx,
} from '../src/components/table/tableUtils';

describe('table fixed column helpers', () => {
  it('normalizes fixed sides', () => {
    expect(normalizeColumnFixed(true)).toBe('left');
    expect(normalizeColumnFixed('start')).toBe('left');
    expect(normalizeColumnFixed('end')).toBe('right');
    expect(normalizeColumnFixed(undefined)).toBeNull();
  });

  it('builds cumulative sticky offsets', () => {
    const result = buildFixedColumnOffsets(
      [
        { key: 'name', title: '姓名', width: 100, fixed: 'left' },
        { key: 'age', title: '年龄', width: 80 },
        { key: 'action', title: '操作', width: 90, fixed: 'right' },
      ],
      56
    );
    expect(result.leftOffsets).toEqual({ name: 56 });
    expect(result.rightOffsets).toEqual({ action: 0 });
    expect(result.leftEdgeKey).toBe('name');
    expect(result.rightEdgeKey).toBe('action');
    expect(resolveColumnWidthPx('120px')).toBe(120);
  });
});
