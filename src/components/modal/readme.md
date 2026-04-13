# Modal 子模块

维护 **全局弹层栈**、**命令式 API**、**`useModal`** / **`useModalLayer`** 以及内置渲染层 **`HModalLayer`**。

- **开箱即用**：在根组件挂载 `<HModalLayer />` 即可获得默认 Modal UI。
- **自定义 UI**：也可不使用 `HModalLayer`，通过 `useModalLayer()` / `useModal()` 订阅栈后自行渲染。

## 从入口导入

```ts
import {
  modal,
  createModal,
  useModal,
  openModal,
  closeModal,
  MODAL_DEFAULTS,
  type ModalApi,
  type ModalOpenPayload,
  type ModalConfirmPayload,
  type ModalRecord,
  type ModalType,
  type UseModalReturn,
} from '@/components/modal';
```

## 业务接 UI（推荐）

1. 根布局中 **`useModal()`**，订阅只读 **`modalList`**（栈底 → 栈顶）。
2. 使用 **`Teleport to="body"`**，按栈渲染多层蒙层；每条用 **`item.zIndex`** 控制层级。
3. **`maskClosable`**、**`title`** 等字段仅作约定，由你在蒙层点击、`ESC` 等逻辑里调用 **`closeModal(id)`**。
4. 内容来自 **`item.content`**（已规范化的 **`VNode`**），由 `open` 的 **`content`** 经 **`normalizeModalContent`** 得到。
5. 确认/取消按钮的显示与文案由 **`item.showConfirm`**、**`item.showCancel`**、**`item.confirmText`**、**`item.cancelText`** 提供，业务自绘按钮后调用 **`item.onConfirm?.(values)`** / **`item.onCancel?.()`**。

## `content` 类型（`ModalContentInput`）

`open` / `confirm` 的 **`content`** 支持（入栈后统一存为 `VNode`）：

| 形式 | 示例 |
|------|------|
| **TSX 节点** | `content: <MyDialog title="a" />`（编译结果为 `VNode`） |
| **Vue 组件** | `content: MyDialog`（内部 `h(MyDialog)`） |
| **返回 VNode 的函数** | `content: () => <div>静态</div>` 或 `() => h('p', 'hi')` |

## `modal` / `createModal`

### `open(options)`

入栈一层弹层，返回 `id`。`options` 必须含 **`content`**；可选 `maskClosable`、`maxStack`、`zIndex`、`type`、`title`、`showConfirm`、`showCancel`、`confirmText`、`cancelText`、`className`、`style`、`onConfirm`、`onCancel`、`onClose`。

### `confirm<T>(options)` — Promise 风格（参考 `messageConfirm`）

返回 `Promise<T>`：
- **resolve**：业务 UI 调用 `record.onConfirm(values)` 后触发
- **reject**：业务 UI 调用 `record.onCancel()` 或通过 `onClose` 路径关闭

```ts
try {
  const values = await modal.confirm({
    title: '确认删除？',
    type: 'danger',
    content: <MyConfirmPanel />,
    onConfirm: async (v) => {
      await api.delete(v.id); // 支持异步，不关闭直到完成
    },
  });
  console.log('用户确认', values);
} catch {
  console.log('用户取消');
}
```

`content` 可选——不传时业务可根据 `title` 渲染纯文字确认框。

### `close(id)` / `closeAll()`

关闭一层或全部；从栈中移除后会调用对应记录的 **`onClose`**。

### 通用规则

- **`maxStack`** 超出时，会在入栈前依次关闭最底层直到有空间。
- 无 `document`（如 SSR）时 **`open`** / **`confirm`** 不入栈。

## `useModal()`

返回 **`modalList`**、`defaults`（`MODAL_DEFAULTS`）、**`openModal`**、**`closeModal`**、**`closeAllModals`**，与命令式函数为同一套单例。

## 默认值摘要

| 项 | 默认 |
|----|------|
| `maskClosable` | `true`（仅语义，由业务实现） |
| `maxStack` | `20` |
| `zIndex`（未指定时） | `zIndexBase + 栈索引 * 10`，`zIndexBase` 为 `1000` |
| `type` | `'info'` |
| `showConfirm` | `true` |
| `showCancel` | `true` |
| `confirmText` | `'确定'` |
| `cancelText` | `'取消'` |

## 目录内文件

| 文件 | 说明 |
|------|------|
| `types.ts` | `ModalRecord`、`ModalShowOptions`、`ModalOpenPayload`、`ModalConfirmPayload`、`ModalType` |
| `modalState.ts` | 栈、`openModal` / `closeModal` / `closeAllModals`、`useModal` |
| `createModal.ts` | `createModal`（含 `confirm`）与默认 `modal` 单例 |
| `HModalLayer.vue` | 内置渲染层组件 |
| `index.ts` | 对外导出 |

## 与 `messageConfirm` 的关系

Modal 模块将 `messageConfirm/createPortaModal` 的核心 **Promise 确认/取消** 逻辑抽象为通用的 `modal.confirm()` API。区别：

- `messageConfirm` 自带 `createApp` + 挂载 DOM + UI 样式
- `modal.confirm()` **只管逻辑**（入栈、Promise、回调），**不创建任何 DOM/UI**

如需完全兼容旧 `createMessageModal` 的使用方式，可包装一个 thin wrapper 在 `modal.confirm` 之上。

## 与 Icon 的关系

Modal **不依赖** Icon；内容 `VNode` 内可自由使用 `resolveIconFontComponent`、`createSvgIcon` 等生成的组件。
