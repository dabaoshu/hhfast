# Splitter（分隔面板）

可拖拽的分割区域布局组件，参考 Ant Design Splitter 实现。

## 特性

- 水平/垂直分割
- 拖拽调整面板大小
- 最小/最大尺寸约束
- 面板折叠/展开
- 多面板支持
- 嵌套布局
- 懒渲染模式

---

## 1. 基础用法

```vue
<Splitter orientation="horizontal">
  <SplitterPanel :default-size="'50%'">
    <div>左侧内容</div>
  </SplitterPanel>
  <SplitterPanel :default-size="'50%'">
    <div>右侧内容</div>
  </SplitterPanel>
</Splitter>
```

## 2. 垂直方向

```vue
<Splitter orientation="vertical">
  <SplitterPanel :default-size="'40%'">上</SplitterPanel>
  <SplitterPanel :default-size="'60%'">下</SplitterPanel>
</Splitter>
```

## 3. 尺寸约束

```vue
<SplitterPanel :default-size="'50%'" min="20%" max="70%">
  Panel 1
</SplitterPanel>
<SplitterPanel min="100px">
  Panel 2
</SplitterPanel>
```

支持 `number`（px）、`'50%'`（百分比）、`'200px'`（像素字符串）。

## 4. 面板折叠

```vue
<SplitterPanel :collapsible="{ start: false, end: true }">
  侧边栏
</SplitterPanel>
<SplitterPanel :collapsible="{ start: true, end: false }">
  主内容
</SplitterPanel>
```

- `start`：向起始方向折叠
- `end`：向结束方向折叠
- 设为 `true` 等于 `{ start: true, end: true }`

## 5. 嵌套布局

```vue
<Splitter orientation="horizontal">
  <SplitterPanel :default-size="'30%'">侧边栏</SplitterPanel>
  <SplitterPanel>
    <Splitter orientation="vertical">
      <SplitterPanel :default-size="'60%'">编辑器</SplitterPanel>
      <SplitterPanel>终端</SplitterPanel>
    </Splitter>
  </SplitterPanel>
</Splitter>
```

## 6. 事件

```vue
<Splitter
  @resize="(sizes) => console.log('resize', sizes)"
  @resize-start="(sizes) => console.log('start', sizes)"
  @resize-end="(sizes) => console.log('end', sizes)"
>
```

---

## API

### Splitter Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| orientation | `'horizontal' \| 'vertical'` | `'horizontal'` | 分割方向 |
| lazy | boolean | false | 懒渲染 |

### Splitter Events

| 事件 | 类型 | 说明 |
|------|------|------|
| resize | `(sizes: number[]) => void` | 大小变化 |
| resizeStart | `(sizes: number[]) => void` | 拖拽开始 |
| resizeEnd | `(sizes: number[]) => void` | 拖拽结束 |

### SplitterPanel Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | number \| string | - | 受控大小 |
| defaultSize | number \| string | - | 初始大小 |
| min | number \| string | 0 | 最小尺寸 |
| max | number \| string | 100% | 最大尺寸 |
| resizable | boolean | true | 是否可拖拽 |
| collapsible | boolean \| `{ start?: boolean; end?: boolean }` | false | 可折叠 |

---

## Playground

`playground/demos/splitter/SplitterDemo.vue`
