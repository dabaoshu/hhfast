import { computed, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { HTable } from '../src/components/table/TableView';
import { useTableSelection } from '../src/components/table/useTableSelection';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  city: string;
  disabled?: boolean;
}

const rows: Row[] = [
  { id: 1, name: '张三', city: '杭州' },
  { id: 2, name: '李四', city: '上海', disabled: true },
  { id: 3, name: '王五', city: '北京' },
];

describe('HTable mid-tier APIs', () => {
  it('shows loading overlay', () => {
    const wrapper = mount(HTable, {
      props: {
        columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }],
        dataSource: rows,
        rowKey: 'id',
        loading: true,
        pagination: false,
      },
    });
    expect(wrapper.find('.hh-table__loading').exists()).toBe(true);
    expect(wrapper.classes()).toContain('hh-table--loading');
  });

  it('skips disabled rows in select-all', () => {
    const selectedRowKeys = ref<number[]>([]);
    const selection = useTableSelection<Row>({
      props: {
        columns: [],
        dataSource: rows,
        rowKey: 'id',
        rowSelection: {
          getCheckboxProps: (record) => ({ disabled: Boolean(record.disabled) }),
        },
      },
      selectedRowKeys,
      current: ref(1),
      pageSize: ref(10),
      currentPageData: computed(() => rows),
      getRecordKey: (r) => r.id,
    });
    selection.toggleAllCurrentPage(true);
    expect(selectedRowKeys.value.map(Number).sort()).toEqual([1, 3]);
  });

  it('applies rowClassName and calls onRow click', async () => {
    const onClick = vi.fn();
    const wrapper = mount(HTable, {
      props: {
        columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }],
        dataSource: rows,
        rowKey: 'id',
        pagination: false,
        rowClassName: (record: Row) => (record.id === 1 ? 'is-vip' : ''),
        onRow: () => ({ onClick }),
      },
    });
    const first = wrapper.findAll('.hh-table__tr')[0];
    expect(first.classes()).toContain('is-vip');
    await first.trigger('click');
    expect(onClick).toHaveBeenCalled();
  });

  it('renders showTotal and quick jumper', async () => {
    const wrapper = mount(HTable, {
      props: {
        columns: [{ key: 'name', title: '姓名', dataIndex: 'name' }],
        dataSource: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          name: `U${i + 1}`,
          city: '杭州',
        })),
        rowKey: 'id',
        pagination: {
          defaultPageSize: 10,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
        },
      },
    });
    expect(wrapper.find('.hh-table__pagination-left').text()).toContain('1-10 / 25');
    const input = wrapper.find('.hh-table__quick-jumper-input');
    await input.setValue('3');
    await input.trigger('keydown', { key: 'Enter' });
    await nextTick();
    expect(wrapper.find('.hh-table__page-btn.is-active').text()).toBe('3');
  });

  it('filters filter items by filterSearch', async () => {
    const wrapper = mount(HTable, {
      attachTo: document.body,
      props: {
        columns: [
          {
            key: 'city',
            title: '城市',
            dataIndex: 'city',
            filterSearch: true,
            filters: [
              { text: '杭州', value: '杭州' },
              { text: '上海', value: '上海' },
              { text: '北京', value: '北京' },
            ],
          },
        ],
        dataSource: rows,
        rowKey: 'id',
        pagination: false,
      },
    });
    await wrapper.find('.hh-table__filter-trigger').trigger('click');
    await nextTick();
    const search = document.querySelector('.hh-table__filter-search') as HTMLInputElement | null;
    expect(search).toBeTruthy();
    search!.value = '上';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    const texts = Array.from(document.querySelectorAll('.hh-table__filter-item-text')).map(
      (n) => n.textContent
    );
    expect(texts).toEqual(['上海']);
    wrapper.unmount();
  });

  it('renders title, footer and summary', () => {
    const wrapper = mount(HTable, {
      props: {
        columns: [
          { key: 'name', title: '姓名', dataIndex: 'name' },
          { key: 'age', title: '年龄', dataIndex: 'age' },
        ],
        dataSource: [
          { id: 1, name: '张三', city: '杭州', age: 20 },
          { id: 2, name: '李四', city: '上海', age: 30 },
        ],
        rowKey: 'id',
        pagination: false,
        title: '用户列表',
        footer: () => '底部说明',
        summary: (data: Array<Record<string, unknown>>) =>
          h('tr', [
            h('td', '合计'),
            h(
              'td',
              String(data.reduce((sum, row) => sum + Number(row.age ?? 0), 0))
            ),
          ]),
      },
    });
    expect(wrapper.find('.hh-table__title').text()).toBe('用户列表');
    expect(wrapper.find('.hh-table__footer').text()).toBe('底部说明');
    expect(wrapper.find('.hh-table__summary').text()).toContain('50');
  });
});
