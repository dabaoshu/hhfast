import { inject } from 'vue';
import { HH_CONFIG_KEY } from './types';
import type { HhConfig } from './types';

/**
 * 在子组件中读取 {@link HConfigProvider} 注入的全局配置。
 *
 * @returns 配置对象，若祖先未提供则返回 `undefined`
 */
export function useHhConfig(): HhConfig | undefined {
  return inject(HH_CONFIG_KEY, undefined);
}
