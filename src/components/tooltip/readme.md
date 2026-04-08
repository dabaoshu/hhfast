# Tooltip（文字提示）

轻量级文字提示组件，支持 `<HTooltip>` 组件和 `v-tooltip` 指令两种用法。

---

## 1. HTooltip 组件

### 基础用法

```vue
<HTooltip content="提示文字">
  <button>悬浮显示</button>
</HTooltip>
```

### 方位

```vue
<HTooltip content="顶部" placement="top">...</HTooltip>
<HTooltip content="底部" placement="bottom">...</HTooltip>
<HTooltip content="左侧" placement="left">...</HTooltip>
<HTooltip content="右侧" placement="right">...</HTooltip>
<HTooltip content="左上" placement="top-start">...</HTooltip>
```

支持 12 个方位：`top` `top-start` `top-end` `bottom` `bottom-start` `bottom-end` `left` `left-start` `left-end` `right` `right-start` `right-end`

### 触发方式

```vue
<HTooltip content="hover" trigger="hover">...</HTooltip>
<HTooltip content="focus" trigger="focus">...</HTooltip>
<HTooltip content="click" trigger="click">...</HTooltip>
<HTooltip content="manual" trigger="manual" :visible="show">...</HTooltip>
```

### 自定义内容

```vue
<HTooltip>
  <button>悬浮</button>
  <template #content>
    <strong>标题</strong>
    <p>自定义 HTML 内容</p>
  </template>
</HTooltip>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | string | - | 提示内容 |
| placement | TooltipPlacement | 'top' | 弹出方位 |
| trigger | TooltipTrigger | 'hover' | 触发方式 |
| disabled | boolean | false | 是否禁用 |
| offset | number | 8 | 偏移量（px） |
| showDelay | number | 100 | hover 显示延迟（ms） |
| hideDelay | number | 100 | hover 隐藏延迟（ms） |
| enterable | boolean | true | 鼠标可进入浮层 |
| maxWidth | number \| string | - | 最大宽度 |
| zIndex | number | 9999 | 层级 |
| visible | boolean | - | 手动控制显隐 |
| transition | string | 'hh-tooltip-fade' | 过渡名 |

---

## 2. v-tooltip 指令

不增加 DOM 层级的轻量用法。

### 基础

```vue
<button v-tooltip="'提示文字'">悬浮显示</button>
```

### 修饰符

```vue
<!-- 方位 -->
<button v-tooltip.bottom="'底部'">底部</button>
<button v-tooltip.left="'左侧'">左侧</button>

<!-- 触发方式 -->
<button v-tooltip.click="'点击显示'">点击</button>
```

### 对象配置

```vue
<button v-tooltip="{ content: '提示', placement: 'right', trigger: 'click', maxWidth: 200 }">
  完整配置
</button>
```

---

## 3. 类型

```ts
type TooltipPlacement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'

type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual'
```

---

## 4. Playground

`playground/demos/tooltip/TooltipDemo.vue`
