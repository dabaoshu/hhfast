import { reactive, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import {
  collectDescendantKeys,
  findRecordByKey,
  getChildren,
} from '../src/components/table/tableUtils';
import { useTableData } from '../src/components/table/useTableData';
import type { TableColumn } from '../src/components/table/types';

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

describe('useTableData tree', () => {
  it('flattens only expanded branches', () => {
    const columns: TableColumn<Node>[] = [{ key: 'name', title: '姓名', dataIndex: 'name' }];
    const treeExpandedKeys = ref<string[]>(['a']);
    const data = useTableData<Node>({
      props: {
        columns,
        dataSource: tree,
        rowKey: 'id',
        childrenColumnName: 'children',
        pagination: false,
      },
      filters: reactive({}),
      sorter: ref({ order: null }),
      current: ref(1),
      pageSize: ref(10),
      treeExpandedKeys,
    });
    expect(data.visibleRows.value.map((r) => r.record.id)).toEqual(['a', 'a1', 'a2', 'b']);
    expect(data.visibleRows.value.find((r) => r.record.id === 'a1')?.level).toBe(1);
  });

  it('filters drop unmatched branches without lifting children', () => {
    const columns: TableColumn<Node>[] = [
      { key: 'name', title: '姓名', dataIndex: 'name', filters: [{ text: 'B', value: 'B' }] },
    ];
    const filters = reactive<Record<string, string[]>>({ name: ['B'] });
    const data = useTableData<Node>({
      props: {
        columns,
        dataSource: tree,
        rowKey: 'id',
        childrenColumnName: 'children',
        pagination: false,
      },
      filters,
      sorter: ref({ order: null }),
      current: ref(1),
      pageSize: ref(10),
      treeExpandedKeys: ref(['a', 'a2']),
    });
    // 父节点不匹配时整枝丢弃；不抬升子孙。仅根节点 B 匹配。
    expect(data.visibleRows.value.map((r) => r.record.id)).toEqual(['b']);
  });
});
