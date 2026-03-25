/** 按 scriptUrl 缓存的 IconFont 解析器 */
/** iconfont 工厂：传入 scriptUrl 得到可复用的函数组件。 */
export { resolveIconFontComponent } from "./resolveIconFont";

/** 远程 SVG 文本加载（带缓存），供扩展或测试使用。 */
export { svgLoader } from "./svgFileLoader";

/** 由 `import url from '*.svg'` 得到的 URL 创建与 MyIcon 一致的 SVG 图标组件。 */
export { createSvgIcon } from "./createSvgIcon";
export type { SvgAssetIconProps } from "./createSvgIcon";


