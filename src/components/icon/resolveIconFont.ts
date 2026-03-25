import type { FunctionalComponent } from 'vue';
import CreateIconFont from './IconFont';
import type { IconFontProps } from './IconFont';

const cache = new Map<string, FunctionalComponent<IconFontProps>>();

/**
 * 将 scriptUrl 序列化为缓存键。
 */
function keyOf(scriptUrl?: string | string[]): string {
  if (scriptUrl == null || scriptUrl === '') {
    return '';
  }
  return Array.isArray(scriptUrl) ? scriptUrl.join('\0') : scriptUrl;
}

/**
 * 按 `scriptUrl` 缓存 `CreateIconFont` 结果，同一应用内相同配置只插入一次脚本。
 *
 * @param scriptUrl - 未传或空数组时不请求外部 iconfont 脚本（适用于已在页面注入 symbol 的场景）
 */
export function resolveIconFontComponent(
  scriptUrl?: string | string[]
): FunctionalComponent<IconFontProps> {
  const key = keyOf(scriptUrl);
  let comp = cache.get(key);
  if (!comp) {
    comp = CreateIconFont({ scriptUrl }) as FunctionalComponent<IconFontProps>;
    cache.set(key, comp);
  }
  return comp;
}
