# HTable Tree + Expandable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nested `children` tree flattening, independent row-click expandable details, and checkbox parent-child selection (`checkStrictly`) to `HTable`.

**Architecture:** Extend the existing filter → sort → paginate pipeline with sibling-only tree sort/filter, then flatten by `treeExpandedKeys` into `visibleRows`. Keep tree expand keys and detail expand keys in a new `useTableExpand`. Selection walks the full tree for cascade + indeterminate. `TableView` renders indent+▶ on `expandColumnKey`, toggles detail on row click (excluding controls), and inserts colspan detail rows.

**Tech Stack:** Vue 3.4+, TypeScript 5, TSX (`TableView.tsx`), Vitest 3, pnpm, existing `table.scss`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-table-tree-expandable-design.md`
- Tree data: nested `children` only; field name via `childrenColumnName` (default `'children'`).
- Detail UI: **B3** — no `+/−` column; row click toggles detail.
- Tree UI: **A2** — `expandColumnKey` for indent + ▶; default first data column.
- Selection: **D** — `checkStrictly` default `false` (cascade + half-check); `radio` never cascades.
- Do not fold expand into `change.extra.action`.
- Do not break flat (non-tree) table behavior when `dataSource` has no children / no `expandable`.
- Prefer Chinese JSDoc; user-facing copy stays Chinese.
- Package manager: pnpm. Tests: `pnpm --filter @nnnb/hhfast-ui test`.

---

## File map

| File | Responsibility |
|------|----------------|
| `packages/hhfast-ui/src/components/table/types.ts` | Tree props, `TableExpandableConfig`, `TableFlatRow`, `checkStrictly` |
| `packages/hhfast-ui/src/components/table/tableUtils.ts` | `getChildren`, walk/collect helpers |
| `packages/hhfast-ui/src/components/table/useTableData.ts` | Tree filter/sort + flatten + paginate on `visibleRows` |
| `packages/hhfast-ui/src/components/table/useTableExpand.ts` | Tree + detail expand keys (controlled/uncontrolled) |
| `packages/hhfast-ui/src/components/table/useTableSelection.ts` | Cascade, indeterminate, tree `selectedRows` |
| `packages/hhfast-ui/src/components/table/useTableState.ts` | Wire expand + flat rows + selection |
| `packages/hhfast-ui/src/components/table/TableView.tsx` | Props, tree cell, row click, detail row, half-check |
| `packages/hhfast-ui/src/components/table/table.scss` | Indent, expand icon, expand-row, expanded row class |
| `packages/hhfast-ui/src/components/table/index.ts` | Export new types |
| `packages/hhfast-ui/src/components/table/readme.md` | Document APIs |
| `packages/hhfast-ui/tests/table-tree.test.ts` | Unit + mount tests |
| `apps/playground/demos/ui/table/TableDemo.vue` | Tree + detail + selection demo section |

---

### Task 1: Types + tree helpers

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/types.ts`
- Modify: `packages/hhfast-ui/src/components/table/tableUtils.ts`
- Create: `packages/hhfast-ui/tests/table-tree.test.ts`
- Modify: `packages/hhfast-ui/src/components/table/index.ts` (export types at end of Task 7 if preferred; do minimal export here)

**Interfaces:**
- Consumes: existing `TableProps`, `TableRowSelection`, `TableRowKey`
- Produces: `TableFlatRow`, `TableExpandableConfig`, extended `TableProps` / `TableRowSelection`; helpers `getChildren`, `collectDescendantKeys`, `findRecordByKey`, `forEachTreeNode`

- [ ] **Step 1: Write failing helper tests**

Append to `packages/hhfast-ui/tests/table-tree.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  collectDescendantKeys,
  findRecordByKey,
  getChildren,
} from '../src/components/table/tableUtils';

interface Node {
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
    expect(getChildren({ id: 'x', name: 'X', kids: [{ id: 'y', name: 'Y' }] } as any, 'kids')).toHaveLength(1);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nnnb/hhfast-ui exec vitest run tests/table-tree.test.ts`
Expected: FAIL (helpers not exported / not found)

- [ ] **Step 3: Add types to `types.ts`**

```ts
import type { CSSProperties, VNodeChild } from 'vue';

/** 拍平后的可见行元数据。 */
export interface TableFlatRow<T extends Record<string, unknown>> {
  record: T;
  level: number;
  hasChildren: boolean;
}

/** 可展开详情行配置（与树展开独立）。 */
export interface TableExpandableConfig<T extends Record<string, unknown>> {
  expandedRowRender: (record: T, index: number) => VNodeChild;
  expandedRowKeys?: TableRowKey[];
  defaultExpandedRowKeys?: TableRowKey[];
  onExpand?: (expanded: boolean, record: T) => void;
  onExpandedRowsChange?: (keys: TableRowKey[]) => void;
  /** 是否允许该行详情展开（含行点击），默认 true */
  rowExpandable?: (record: T) => boolean;
}
```

Extend `TableRowSelection`:

```ts
  /**
   * 树数据下勾选是否严格独立。
   * `false`（默认）：父子联动 + 半选；`true`：各行独立。
   * 仅 `type !== 'radio'` 时生效。
   */
  checkStrictly?: boolean;
```

Extend `TableProps` with:

```ts
  childrenColumnName?: string;
  indentSize?: number;
  expandColumnKey?: string;
  defaultExpandAll?: boolean;
  expandedRowKeys?: TableRowKey[];
  defaultExpandedRowKeys?: TableRowKey[];
  onExpandedRowsChange?: (keys: TableRowKey[]) => void;
  onExpand?: (expanded: boolean, record: T) => void;
  expandable?: TableExpandableConfig<T>;
```

- [ ] **Step 4: Implement helpers in `tableUtils.ts`**

```ts
/**
 * 读取节点子列表；非数组时返回空数组。
 */
export function getChildren<T extends Record<string, unknown>>(
  record: T,
  childrenColumnName: string
): T[] {
  const raw = record[childrenColumnName];
  return Array.isArray(raw) ? (raw as T[]) : [];
}

/**
 * 深度优先遍历树。
 */
export function forEachTreeNode<T extends Record<string, unknown>>(
  nodes: T[],
  childrenColumnName: string,
  visitor: (node: T, parent: T | null) => void,
  parent: T | null = null
): void {
  for (const node of nodes) {
    visitor(node, parent);
    forEachTreeNode(getChildren(node, childrenColumnName), childrenColumnName, visitor, node);
  }
}

/**
 * 收集全部子孙 key（不含自身）。
 */
export function collectDescendantKeys<T extends Record<string, unknown>>(
  record: T,
  childrenColumnName: string,
  getKey: (record: T) => TableRowKey
): TableRowKey[] {
  const keys: TableRowKey[] = [];
  forEachTreeNode(getChildren(record, childrenColumnName), childrenColumnName, (node) => {
    keys.push(getKey(node));
  });
  return keys;
}

/**
 * 在树中按 key 查找节点。
 */
export function findRecordByKey<T extends Record<string, unknown>>(
  nodes: T[],
  key: TableRowKey,
  childrenColumnName: string,
  getKey: (record: T) => TableRowKey
): T | undefined {
  for (const node of nodes) {
    if (String(getKey(node)) === String(key)) {
      return node;
    }
    const found = findRecordByKey(
      getChildren(node, childrenColumnName),
      key,
      childrenColumnName,
      getKey
    );
    if (found) {
      return found;
    }
  }
  return undefined;
}
```

Import `TableRowKey` from `./types` at top of `tableUtils.ts`.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter @nnnb/hhfast-ui exec vitest run tests/table-tree.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/hhfast-ui/src/components/table/types.ts packages/hhfast-ui/src/components/table/tableUtils.ts packages/hhfast-ui/tests/table-tree.test.ts
git commit -m "$(cat <<'EOF'
feat(table): add tree types and child-walk helpers

EOF
)"
```

---

### Task 2: Tree filter / sort / flatten in `useTableData`

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/useTableData.ts`
- Modify: `packages/hhfast-ui/tests/table-tree.test.ts`

**Interfaces:**
- Consumes: `getChildren`, `TableFlatRow`, props tree fields; `treeExpandedKeys: Ref<TableRowKey[]>` passed in from expand hook (for now accept as option)
- Produces: `visibleRows`, `currentPageFlatRows`; `sortedData` = flattened visible records (pre-pagination); `currentPageData` = page records

- [ ] **Step 1: Add failing flatten/filter tests**

```ts
import { ref, reactive } from 'vue';
import { useTableData } from '../src/components/table/useTableData';
import type { TableColumn } from '../src/components/table/types';

// inside describe('useTableData tree')
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
    } as any,
    filters: reactive({}),
    sorter: ref({ order: null }),
    current: ref(1),
    pageSize: ref(10),
    treeExpandedKeys,
  });
  expect(data.visibleRows.value.map((r) => r.record.id)).toEqual(['a', 'a1', 'a2', 'b']);
  expect(data.visibleRows.value.find((r) => r.record.id === 'a1')?.level).toBe(1);
});

it('filters drop unmatched branches', () => {
  const columns: TableColumn<Node>[] = [
    { key: 'name', title: '姓名', dataIndex: 'name', filters: [{ text: 'A1', value: 'A1' }] },
  ];
  const filters = reactive<Record<string, string[]>>({ name: ['A1'] });
  const data = useTableData<Node>({
    props: {
      columns,
      dataSource: tree,
      rowKey: 'id',
      childrenColumnName: 'children',
      pagination: false,
    } as any,
    filters,
    sorter: ref({ order: null }),
    current: ref(1),
    pageSize: ref(10),
    treeExpandedKeys: ref(['a', 'a2']),
  });
  // 仅保留自身匹配的节点；A1 匹配则只见 A1（祖先不抬升）
  expect(data.visibleRows.value.map((r) => r.record.id)).toEqual(['a1']);
});
```

- [ ] **Step 2: Run — expect FAIL** (option / API missing)

- [ ] **Step 3: Implement tree pipeline in `useTableData.ts`**

Key changes:

1. Extend options with `treeExpandedKeys: Ref<TableRowKey[]>`.
2. `childrenColumnName = computed(() => props.childrenColumnName ?? 'children')`.
3. Replace flat filter with recursive:

```ts
function filterTree(nodes: T[]): T[] {
  if (Object.keys(filters).length === 0) {
    return nodes.map(cloneShallowWithChildren);
  }
  const result: T[] = [];
  for (const node of nodes) {
    const selfMatch = mergedColumns.value.every(/* same as today */);
    if (!selfMatch) {
      continue; // 丢弃整枝（含子孙）
    }
    const next = { ...node, [childrenColumnName.value]: filterTree(getChildren(node, childrenColumnName.value)) };
    result.push(next);
  }
  return result;
}
```

4. Sibling-only sort:

```ts
function sortTree(nodes: T[]): T[] {
  const sorted = nodes.slice().sort(compareFnOrIdentity);
  return sorted.map((node) => ({
    ...node,
    [childrenColumnName.value]: sortTree(getChildren(node, childrenColumnName.value)),
  }));
}
```

5. Flatten:

```ts
function flattenVisible(nodes: T[], level: number, expanded: Set<string>): TableFlatRow<T>[] {
  const rows: TableFlatRow<T>[] = [];
  for (const record of nodes) {
    const kids = getChildren(record, childrenColumnName.value);
    const hasChildren = kids.length > 0;
    rows.push({ record, level, hasChildren });
    if (hasChildren && expanded.has(String(getRecordKey(record, 0)))) {
      rows.push(...flattenVisible(kids, level + 1, expanded));
    }
  }
  return rows;
}
```

Note: `getRecordKey(record, index)` — for tree prefer key from `rowKey` only; pass `0` or ignore index when key exists.

6. `visibleRows = computed(() => flattenVisible(sortedTree, 0, new Set(treeExpandedKeys.value.map(String))))`
7. `sortedData = computed(() => visibleRows.value.map((r) => r.record))` — keeps pagination total on visible rows
8. `currentPageFlatRows = computed(() => slice visibleRows)`
9. `currentPageData = computed(() => currentPageFlatRows.value.map((r) => r.record))`

Return new fields: `visibleRows`, `currentPageFlatRows`, `childrenColumnName`.

When data has no nested children and keys empty, behavior matches today.

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/hhfast-ui/src/components/table/useTableData.ts packages/hhfast-ui/tests/table-tree.test.ts
git commit -m "$(cat <<'EOF'
feat(table): flatten visible tree rows after filter/sort

EOF
)"
```

---

### Task 3: `useTableExpand`

**Files:**
- Create: `packages/hhfast-ui/src/components/table/useTableExpand.ts`
- Modify: `packages/hhfast-ui/tests/table-tree.test.ts`

**Interfaces:**
- Consumes: `TableProps` tree + `expandable` fields; `getRecordKey`; `dataSource` for `defaultExpandAll`
- Produces:
  - `treeExpandedKeys: Ref<TableRowKey[]>`
  - `detailExpandedKeys: Ref<TableRowKey[]>`
  - `toggleTreeExpand(record, index)`
  - `toggleDetailExpand(record, index)`
  - `isTreeExpanded(key)` / `isDetailExpanded(key)`
  - `isRowDetailExpandable(record)`

- [ ] **Step 1: Failing tests**

```ts
import { useTableExpand } from '../src/components/table/useTableExpand';

it('defaultExpandAll collects all parent keys', () => {
  const expand = useTableExpand<Node>({
    props: {
      columns: [],
      dataSource: tree,
      rowKey: 'id',
      defaultExpandAll: true,
      childrenColumnName: 'children',
    } as any,
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
    } as any,
    getRecordKey: (r) => r.id,
  });
  expand.toggleTreeExpand(tree[0], 0);
  expect(expand.treeExpandedKeys.value).toContain('a');
  expect(expand.detailExpandedKeys.value).toEqual(['a1']);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement `useTableExpand.ts`**

```ts
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { TableProps, TableRowKey } from './types';
import { forEachTreeNode, getChildren } from './tableUtils';

export interface UseTableExpandOptions<T extends Record<string, unknown>> {
  props: TableProps<T>;
  getRecordKey: (record: T, index: number) => TableRowKey;
}

export interface UseTableExpandReturn<T extends Record<string, unknown>> {
  treeExpandedKeys: Ref<TableRowKey[]>;
  detailExpandedKeys: Ref<TableRowKey[]>;
  isTreeExpanded: (key: TableRowKey) => boolean;
  isDetailExpanded: (key: TableRowKey) => boolean;
  isRowDetailExpandable: (record: T) => boolean;
  toggleTreeExpand: (record: T, index: number) => void;
  toggleDetailExpand: (record: T, index: number) => void;
}

function collectExpandableParentKeys<T extends Record<string, unknown>>(
  nodes: T[],
  childrenColumnName: string,
  getRecordKey: (record: T, index: number) => TableRowKey
): TableRowKey[] {
  const keys: TableRowKey[] = [];
  forEachTreeNode(nodes, childrenColumnName, (node) => {
    if (getChildren(node, childrenColumnName).length > 0) {
      keys.push(getRecordKey(node, 0));
    }
  });
  return keys;
}

export function useTableExpand<T extends Record<string, unknown>>(
  options: UseTableExpandOptions<T>
): UseTableExpandReturn<T> {
  const { props, getRecordKey } = options;
  const childrenColumnName = () => props.childrenColumnName ?? 'children';

  const initialTreeKeys = (): TableRowKey[] => {
    if (props.expandedRowKeys != null) {
      return props.expandedRowKeys.slice();
    }
    if (props.defaultExpandAll) {
      return collectExpandableParentKeys(props.dataSource ?? [], childrenColumnName(), getRecordKey);
    }
    return props.defaultExpandedRowKeys?.slice() ?? [];
  };

  const treeExpandedKeys = ref<TableRowKey[]>(initialTreeKeys());
  const detailExpandedKeys = ref<TableRowKey[]>(
    props.expandable?.expandedRowKeys?.slice() ??
      props.expandable?.defaultExpandedRowKeys?.slice() ??
      []
  );

  watch(
    () => props.expandedRowKeys,
    (value) => {
      if (value != null) treeExpandedKeys.value = value.slice();
    }
  );
  watch(
    () => props.expandable?.expandedRowKeys,
    (value) => {
      if (value != null) detailExpandedKeys.value = value.slice();
    }
  );

  const isTreeExpanded = (key: TableRowKey) =>
    treeExpandedKeys.value.some((k) => String(k) === String(key));
  const isDetailExpanded = (key: TableRowKey) =>
    detailExpandedKeys.value.some((k) => String(k) === String(key));
  const isRowDetailExpandable = (record: T) =>
    props.expandable?.rowExpandable?.(record) ?? true;

  const setTreeKeys = (keys: TableRowKey[], record: T, expanded: boolean) => {
    if (props.expandedRowKeys == null) {
      treeExpandedKeys.value = keys;
    }
    props.onExpandedRowsChange?.(keys);
    props.onExpand?.(expanded, record);
  };

  const setDetailKeys = (keys: TableRowKey[], record: T, expanded: boolean) => {
    if (props.expandable?.expandedRowKeys == null) {
      detailExpandedKeys.value = keys;
    }
    props.expandable?.onExpandedRowsChange?.(keys);
    props.expandable?.onExpand?.(expanded, record);
  };

  const toggleTreeExpand = (record: T, index: number) => {
    const key = getRecordKey(record, index);
    const open = isTreeExpanded(key);
    const next = open
      ? treeExpandedKeys.value.filter((k) => String(k) !== String(key))
      : [...treeExpandedKeys.value, key];
    setTreeKeys(next, record, !open);
  };

  const toggleDetailExpand = (record: T, index: number) => {
    if (!props.expandable || !isRowDetailExpandable(record)) return;
    const key = getRecordKey(record, index);
    const open = isDetailExpanded(key);
    const next = open
      ? detailExpandedKeys.value.filter((k) => String(k) !== String(key))
      : [...detailExpandedKeys.value, key];
    setDetailKeys(next, record, !open);
  };

  return {
    treeExpandedKeys,
    detailExpandedKeys,
    isTreeExpanded,
    isDetailExpanded,
    isRowDetailExpandable,
    toggleTreeExpand,
    toggleDetailExpand,
  };
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/hhfast-ui/src/components/table/useTableExpand.ts packages/hhfast-ui/tests/table-tree.test.ts
git commit -m "$(cat <<'EOF'
feat(table): add independent tree and detail expand state

EOF
)"
```

---

### Task 4: Selection cascade + half-check

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/useTableSelection.ts`
- Modify: `packages/hhfast-ui/tests/table-tree.test.ts`

**Interfaces:**
- Consumes: `getChildren`, `collectDescendantKeys`, `findRecordByKey`, `forEachTreeNode`; `childrenColumnName` from props
- Produces: same public API + `isRowIndeterminate(record, index)`

- [ ] **Step 1: Failing tests**

```ts
import { useTableSelection } from '../src/components/table/useTableSelection';

it('checkStrictly false cascades descendants', () => {
  const selectedRowKeys = ref<string[]>([]);
  const selection = useTableSelection<Node>({
    props: {
      columns: [],
      dataSource: tree,
      rowKey: 'id',
      childrenColumnName: 'children',
      rowSelection: { checkStrictly: false },
    } as any,
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
    } as any,
    selectedRowKeys,
    current: ref(1),
    pageSize: ref(10),
    currentPageData: computed(() => [tree[0]]),
    getRecordKey: (r) => r.id,
  });
  expect(selection.isRowChecked(tree[0], 0)).toBe(false);
  expect(selection.isRowIndeterminate(tree[0], 0)).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement cascade**

Logic sketch:

```ts
const checkStrictly = () => props.rowSelection?.checkStrictly === true;
const isRadio = () => props.rowSelection?.type === 'radio';
const childrenColumnName = () => props.childrenColumnName ?? 'children';

// selectedRows: walk full tree with forEachTreeNode, collect matching keys

function isRowIndeterminate(record: T, index: number): boolean {
  if (checkStrictly() || isRadio()) return false;
  const descendants = collectDescendantKeys(record, childrenColumnName(), (r) => getRecordKey(r, 0));
  if (descendants.length === 0) return false;
  const selectedCount = descendants.filter((k) => selectedKeySet.value.has(String(k))).length;
  return selectedCount > 0 && selectedCount < descendants.length;
}

// toggleRowSelection when !checkStrictly && !radio:
//  checked true → add self + all descendants; then reconcileAncestors
//  checked false → remove self + all descendants; then reconcileAncestors
//
// reconcileAncestors: walk parents (build parent map once from dataSource);
//  if all children selected → add parent key
//  else → remove parent key (half-check is UI-only via isRowIndeterminate)
```

Build `parentMap: Map<string, T | null>` with `forEachTreeNode`.

`toggleAllCurrentPage`: for each visible page record, call cascade toggle semantics (union keys).

When `checkStrictly === true`, keep existing flat behavior.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/hhfast-ui/src/components/table/useTableSelection.ts packages/hhfast-ui/tests/table-tree.test.ts
git commit -m "$(cat <<'EOF'
feat(table): cascade tree checkbox selection with indeterminate

EOF
)"
```

---

### Task 5: Wire `useTableState`

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/useTableState.ts`

**Interfaces:**
- Consumes: `useTableExpand`, updated `useTableData` / `useTableSelection`
- Produces: expose expand APIs + `currentPageFlatRows` + `isRowIndeterminate` on `UseTableStateReturn`

- [ ] **Step 1: Update `useTableState`**

Order:

1. Create temporary `getRecordKey` identical to today (or call expand after data — prefer extract getRecordKey into shared inline first).
2. `const expandState = useTableExpand({ props, getRecordKey })` — getRecordKey from dataState; chicken-egg: instantiate `useTableData` with `treeExpandedKeys: expandState.treeExpandedKeys`, so create expand first with a local `getRecordKey` function duplicated from data hook, OR pass getRecordKey from data after creating data with a stub ref.

Recommended order:

```ts
const getRecordKey = (record: T, index: number): TableRowKey => { /* copy from useTableData */ };

const expandState = useTableExpand({ props, getRecordKey });

const dataState = useTableData({
  props,
  filters,
  sorter,
  current,
  pageSize,
  treeExpandedKeys: expandState.treeExpandedKeys,
});

const selectionState = useTableSelection({ /* ... currentPageData: dataState.currentPageData */ });
```

Optionally refactor `getRecordKey` into `tableUtils` in this task to avoid duplication — preferred:

```ts
// tableUtils.ts
export function resolveRecordKey<T>(record: T, index: number, rowKey: TableProps<T>['rowKey']): TableRowKey
```

Use in both `useTableData` and `useTableState`/`useTableExpand`.

Expose on return:

```ts
currentPageFlatRows: dataState.currentPageFlatRows,
treeExpandedKeys: expandState.treeExpandedKeys,
detailExpandedKeys: expandState.detailExpandedKeys,
isTreeExpanded: expandState.isTreeExpanded,
isDetailExpanded: expandState.isDetailExpanded,
isRowDetailExpandable: expandState.isRowDetailExpandable,
toggleTreeExpand: expandState.toggleTreeExpand,
toggleDetailExpand: expandState.toggleDetailExpand,
isRowIndeterminate: selectionState.isRowIndeterminate,
```

- [ ] **Step 2: Smoke existing package tests**

Run: `pnpm --filter @nnnb/hhfast-ui test`
Expected: all PASS (fix any type errors)

- [ ] **Step 3: Commit**

```bash
git add packages/hhfast-ui/src/components/table/useTableState.ts packages/hhfast-ui/src/components/table/useTableData.ts packages/hhfast-ui/src/components/table/tableUtils.ts
git commit -m "$(cat <<'EOF'
feat(table): wire expand state into useTableState pipeline

EOF
)"
```

---

### Task 6: `TableView` UI (tree + B3 row click + detail row + half-check)

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/TableView.tsx`
- Modify: `packages/hhfast-ui/src/components/table/table.scss`
- Modify: `packages/hhfast-ui/tests/table-tree.test.ts`

**Interfaces:**
- Consumes: state APIs from Task 5; new props on `tableProps`
- Produces: rendered tree/detail UX per spec

- [ ] **Step 1: Mount test (failing)**

```ts
import { mount } from '@vue/test-utils';
import { HTable } from '../src/components/table/TableView';
import { h, nextTick } from 'vue';

it('toggles detail on row click but not on tree icon', async () => {
  const wrapper = mount(HTable, {
    props: {
      rowKey: 'id',
      columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }],
      dataSource: tree,
      defaultExpandAll: true,
      expandable: {
        expandedRowRender: (record: Node) => h('div', { class: 'detail' }, record.name),
      },
      pagination: false,
    },
  });
  await nextTick();
  const leafRow = wrapper.findAll('.hh-table__tr').find((tr) => tr.text().includes('A1'));
  await leafRow!.trigger('click');
  expect(wrapper.find('.hh-table__expand-row .detail').text()).toBe('A1');
  await wrapper.find('.hh-table__tree-toggle').trigger('click');
  // detail still only A1; tree collapse may hide children — assert expand-row count / no accidental second detail from icon
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Extend `tableProps`**

Add: `childrenColumnName`, `indentSize`, `expandColumnKey`, `defaultExpandAll`, `expandedRowKeys`, `defaultExpandedRowKeys`, `onExpandedRowsChange`, `onExpand`, `expandable` with proper `PropType`s.

- [ ] **Step 4: Render loop changes**

1. Resolve expand column:

```ts
const expandColumnKey = computed(() => {
  if (props.expandColumnKey) return props.expandColumnKey;
  return mergedColumns.value[0]?.key;
});
```

2. Iterate `state.currentPageFlatRows.value` instead of `currentPageData` only:

```ts
for (const flat of state.currentPageFlatRows.value) {
  const { record, level, hasChildren } = flat;
  const absoluteIndex = /* pageBase + loop index */;
  const recordKey = state.getRecordKey(record, absoluteIndex);
  const detailOpen = state.isDetailExpanded(recordKey);
  // selection td: bind indeterminate via watchEffect on input ref OR :indeterminate in onVnodeMounted
}
```

3. In expand column cell, wrap content:

```tsx
<div class="hh-table__tree-cell" style={{ paddingLeft: `${level * (props.indentSize ?? 15)}px` }}>
  {hasChildren ? (
    <button
      type="button"
      class="hh-table__tree-toggle"
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        state.toggleTreeExpand(record, absoluteIndex);
      }}
    >
      {state.isTreeExpanded(recordKey) ? '▼' : '▶'}
    </button>
  ) : (
    <span class="hh-table__tree-toggle-spacer" />
  )}
  {cellNode}
</div>
```

4. Row:

```tsx
<tr
  key={recordKey}
  class={[
    'hh-table__tr',
    detailOpen && 'hh-table__tr--expanded',
    props.expandable && state.isRowDetailExpandable(record) && 'hh-table__tr--expandable',
  ].filter(Boolean)}
  onClick={(e: MouseEvent) => {
    if (!props.expandable || !state.isRowDetailExpandable(record)) return;
    const target = e.target as HTMLElement;
    if (target.closest('input,button,a,.hh-table__tree-toggle,[data-hh-table-no-row-expand]')) {
      return;
    }
    state.toggleDetailExpand(record, absoluteIndex);
  }}
>
```

5. After data row, if `detailOpen`:

```tsx
<tr class="hh-table__expand-row" key={`${recordKey}-expand`}>
  <td class="hh-table__expand-td" colSpan={totalColCount}>
    {props.expandable!.expandedRowRender(record, absoluteIndex)}
  </td>
</tr>
```

6. Selection checkbox: set `indeterminate` in `watchEffect` like header, or:

```tsx
<input
  ref={(el) => { if (el) (el as HTMLInputElement).indeterminate = state.isRowIndeterminate(record, absoluteIndex); }}
  ...
  onClick={(e: MouseEvent) => e.stopPropagation()}
/>
```

- [ ] **Step 5: Styles in `table.scss`**

```scss
.hh-table__tree-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.hh-table__tree-toggle {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: $hh-text-secondary;
  cursor: pointer;
  line-height: 1;
}
.hh-table__tree-toggle-spacer {
  flex: 0 0 16px;
  width: 16px;
  display: inline-block;
}
.hh-table__tr--expandable {
  cursor: pointer;
}
.hh-table__expand-row .hh-table__expand-td {
  background: #fafafa;
  padding: 12px 16px;
}
.hh-table__tr--expanded {
  background: #f0f5ff;
}
```

- [ ] **Step 6: Run table-tree tests — PASS**

- [ ] **Step 7: Commit**

```bash
git add packages/hhfast-ui/src/components/table/TableView.tsx packages/hhfast-ui/src/components/table/table.scss packages/hhfast-ui/tests/table-tree.test.ts
git commit -m "$(cat <<'EOF'
feat(table): render tree indent and row-click detail rows

EOF
)"
```

---

### Task 7: Exports + readme + playground demo

**Files:**
- Modify: `packages/hhfast-ui/src/components/table/index.ts`
- Modify: `packages/hhfast-ui/src/components/table/readme.md`
- Modify: `apps/playground/demos/ui/table/TableDemo.vue`

**Interfaces:**
- Produces: exported `TableFlatRow`, `TableExpandableConfig`; demo section用户可点

- [ ] **Step 1: Export types from `index.ts`**

```ts
export type {
  // ...existing
  TableExpandableConfig,
  TableFlatRow,
} from './types';
```

Ensure `src/index.ts` re-exports via components barrel if needed (follow existing table export path).

- [ ] **Step 2: Document in `readme.md`**

Add sections:

1. 树形数据（`children` / `expandColumnKey` / `expandedRowKeys` / `defaultExpandAll`）
2. 可展开详情（`expandable` + 行点击；防冒泡约定 `data-hh-table-no-row-expand`）
3. 勾选联动（`rowSelection.checkStrictly`）

- [ ] **Step 3: Add playground section in `TableDemo.vue`**

Add a second `HTable` block（或折叠区块）「树形 + 行点击详情 + 联动勾选」：

```ts
interface Dept {
  id: string
  name: string
  city: string
  children?: Dept[]
}

const treeData: Dept[] = [
  {
    id: 'tech',
    name: '技术部',
    city: '-',
    children: [
      {
        id: 'fe',
        name: '前端组',
        city: '-',
        children: [
          { id: 'u1', name: '张三', city: '杭州' },
          { id: 'u2', name: '李四', city: '上海' },
        ],
      },
      { id: 'be', name: '后端组', city: '-', children: [{ id: 'u3', name: '王五', city: '深圳' }] },
    ],
  },
]

const treeSelectedKeys = ref<TableRowKey[]>([])
const treeColumns: TableColumn<Dept>[] = [
  { key: 'name', title: '姓名', dataIndex: 'name' },
  { key: 'city', title: '城市', dataIndex: 'city' },
]
```

```vue
<HTable
  :columns="treeColumns"
  :data-source="treeData"
  row-key="id"
  :default-expand-all="true"
  expand-column-key="name"
  :row-selection="{ selectedRowKeys: treeSelectedKeys, checkStrictly: false, onChange: (keys) => (treeSelectedKeys = keys) }"
  :expandable="{
    expandedRowRender: (record) => h('div', `详情：${record.name} / ${record.city}`),
  }"
  :pagination="false"
/>
```

- [ ] **Step 4: Run full package tests**

Run: `pnpm --filter @nnnb/hhfast-ui test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/hhfast-ui/src/components/table/index.ts packages/hhfast-ui/src/components/table/readme.md apps/playground/demos/ui/table/TableDemo.vue
git commit -m "$(cat <<'EOF'
docs(table): document tree/expandable APIs and add playground demo

EOF
)"
```

---

### Task 8: Spec commit + final verification

**Files:**
- `docs/superpowers/specs/2026-07-24-table-tree-expandable-design.md` (if uncommitted)
- `docs/superpowers/plans/2026-07-24-table-tree-expandable-implementation.md`

- [ ] **Step 1: Commit design + plan if not already committed**

```bash
git add docs/superpowers/specs/2026-07-24-table-tree-expandable-design.md docs/superpowers/plans/2026-07-24-table-tree-expandable-implementation.md
git commit -m "$(cat <<'EOF'
docs: add HTable tree/expandable design and implementation plan

EOF
)"
```

- [ ] **Step 2: Final test pass**

Run: `pnpm --filter @nnnb/hhfast-ui test`
Expected: PASS

- [ ] **Step 3: Optional typecheck**

Run: `pnpm --filter @nnnb/hhfast-ui exec vue-tsc --noEmit` (or package’s existing typecheck script if any)
Expected: no errors in table files

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Nested children + `childrenColumnName` | 1–2 |
| `expandColumnKey` (A2) | 6 |
| Tree expand keys / `defaultExpandAll` | 3, 5–6 |
| Detail expand independent (B3 row click) | 3, 6 |
| No +/− column | 6 |
| stopPropagation on ▶ / checkbox | 6 |
| Sibling sort + simplified filter | 2 |
| Paginate `visibleRows` | 2 |
| `checkStrictly` cascade + half-check (D) | 4–6 |
| radio no cascade | 4 |
| readme + playground | 7 |
| Vitest | 1–6 |
| No flat parentKey / virtual / async | out of scope |

## Placeholder / consistency notes

- Tree expand prop names reuse Ant-like `expandedRowKeys` on **table props** for tree; detail keys live under `expandable.expandedRowKeys` — do not conflate in implementation.
- `sortedData` / `extra.currentDataSource` after this work = **visible flattened records** (pre-pagination), not nested tree.
- Controlled mode: when `expandedRowKeys` / `expandable.expandedRowKeys` / `rowSelection.selectedRowKeys` provided, only emit callbacks; parent must update props.
