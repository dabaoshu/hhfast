import { computed, h, nextTick, reactive, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import {
  collectDescendantKeys,
  findRecordByKey,
  getChildren,
} from '../src/components/table/tableUtils';
import { useTableData } from '../src/components/table/useTableData';
import { useTableExpand } from '../src/components/table/useTableExpand';
import { useTableSelection } from '../src/components/table/useTableSelection';
import { HTable } from '../src/components/table/TableView';
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
    expect(data.visibleRows.value.map((r) => r.record.id)).toEqual(['b']);
  });
});

describe('useTableExpand', () => {
  it('defaultExpandAll collects all parent keys', () => {
    const expand = useTableExpand<Node>({
      props: {
        columns: [],
        dataSource: tree,
        rowKey: 'id',
        defaultExpandAll: true,
        childrenColumnName: 'children',
      },
      getRecordKey: (r) => r.id,
    });
    expect(expand.treeExpandedKeys.value.map(String).sort()).toEqual(['a', 'a2']);
  });

  it('tree and detail keys stay independent', () => {
    const expand = useTableExpand<Node>({
      props: {
        columns: [],
        dataSource: tree,
        rowKey: 'id',
        expandable: {
          expandedRowRender: () => 'x',
          defaultExpandedRowKeys: ['a1'],
        },
      },
      getRecordKey: (r) => r.id,
    });
    expand.toggleTreeExpand(tree[0], 0);
    expect(expand.treeExpandedKeys.value).toContain('a');
    expect(expand.detailExpandedKeys.value).toEqual(['a1']);
  });
});

describe('useTableSelection tree cascade', () => {
  it('checkStrictly false cascades descendants', () => {
    const selectedRowKeys = ref<string[]>([]);
    const selection = useTableSelection<Node>({
      props: {
        columns: [],
        dataSource: tree,
        rowKey: 'id',
        childrenColumnName: 'children',
        rowSelection: { checkStrictly: false },
      },
      selectedRowKeys,
      current: ref(1),
      pageSize: ref(10),
      currentPageData: computed(() => tree),
      getRecordKey: (r) => r.id,
    });
    selection.toggleRowSelection(tree[0], 0, true);
    expect(selectedRowKeys.value.map(String).sort()).toEqual(['a', 'a1', 'a2', 'a21']);
  });

  it('partial children yield indeterminate parent', () => {
    const selectedRowKeys = ref<string[]>(['a1']);
    const selection = useTableSelection<Node>({
      props: {
        columns: [],
        dataSource: tree,
        rowKey: 'id',
        childrenColumnName: 'children',
        rowSelection: { checkStrictly: false },
      },
      selectedRowKeys,
      current: ref(1),
      pageSize: ref(10),
      currentPageData: computed(() => [tree[0]]),
      getRecordKey: (r) => r.id,
    });
    expect(selection.isRowChecked(tree[0], 0)).toBe(false);
    expect(selection.isRowIndeterminate(tree[0], 0)).toBe(true);
  });
});

describe('HTable tree + expandable UI', () => {
  it('toggles detail via expand column button like Ant Design', async () => {
    const wrapper = mount(HTable, {
      props: {
        rowKey: 'id',
        columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }],
        dataSource: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'Not Expandable' },
        ],
        expandable: {
          expandedRowRender: (record: Node) => h('div', { class: 'detail' }, record.name),
          rowExpandable: (record: Node) => record.name !== 'Not Expandable',
        },
        pagination: false,
      },
    });
    await nextTick();

    expect(wrapper.findAll('.hh-table__expand-toggle').length).toBe(2);
    expect(wrapper.findAll('.hh-table__expand-toggle-spacer').length).toBe(1);

    await wrapper.findAll('.hh-table__expand-toggle')[1].trigger('click');
    expect(wrapper.find('.hh-table__expand-row .detail').text()).toBe('B');
    expect(wrapper.find('.hh-table__expand-toggle.is-expanded').exists()).toBe(true);
  });
});
