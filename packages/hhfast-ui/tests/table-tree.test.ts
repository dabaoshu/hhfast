import { describe, expect, it } from 'vitest';
import {
  collectDescendantKeys,
  findRecordByKey,
  getChildren,
} from '../src/components/table/tableUtils';

interface Node extends Record<string, unknown> {
  id: string;
  name: string;
  children?: Node[];
}

const tree: Node[] = [
  {
    id: 'a',
    name: 'A',
    children: [
      { id: 'a1', name: 'A1' },
      { id: 'a2', name: 'A2', children: [{ id: 'a21', name: 'A21' }] },
    ],
  },
  { id: 'b', name: 'B' },
];

const getKey = (r: Node) => r.id;

describe('table tree helpers', () => {
  it('getChildren reads configurable field', () => {
    expect(getChildren(tree[0], 'children')).toHaveLength(2);
    const withKids = { id: 'x', name: 'X', kids: [{ id: 'y', name: 'Y' }] } as Node & {
      kids: Node[];
    };
    expect(getChildren(withKids, 'kids')).toHaveLength(1);
    expect(getChildren(tree[1], 'children')).toEqual([]);
  });

  it('collectDescendantKeys excludes self', () => {
    expect(collectDescendantKeys(tree[0], 'children', getKey).sort()).toEqual(['a1', 'a2', 'a21']);
  });

  it('findRecordByKey walks nested tree', () => {
    expect(findRecordByKey(tree, 'a21', 'children', getKey)?.name).toBe('A21');
    expect(findRecordByKey(tree, 'missing', 'children', getKey)).toBeUndefined();
  });
});
