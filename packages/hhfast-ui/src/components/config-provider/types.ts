import type { InjectionKey, ComputedRef } from 'vue';
import type { ToastGlobalDefaults } from '../toast';
import type { ModalGlobalDefaults } from '../modal';

/**
 * {@link HConfigProvider} 的 Props。
 *
 * - 传对象：覆盖对应模块全局默认值，同时渲染内置 Layer
 * - 传 `false`：不渲染该 Layer（用户自绘）
 * - 不传 / `undefined`：使用默认值 + 渲染 Layer
 */
export interface HConfigProviderProps {
  /** Toast 全局默认配置覆盖 */
  toast?: Partial<ToastGlobalDefaults> | false;
  /** Modal 全局默认配置覆盖 */
  modal?: Partial<ModalGlobalDefaults> | false;
}

/**
 * `provide` 注入的配置快照，由 {@link useHhConfig} 读取。
 */
export interface HhConfig {
  toast: ComputedRef<Partial<ToastGlobalDefaults> | false | undefined>;
  modal: ComputedRef<Partial<ModalGlobalDefaults> | false | undefined>;
}

/**
 * ConfigProvider 的 InjectionKey。
 */
export const HH_CONFIG_KEY: InjectionKey<HhConfig> = Symbol('HhConfig');
