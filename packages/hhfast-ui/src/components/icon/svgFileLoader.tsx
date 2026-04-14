/***
 * 本地svg文件加载 svgFile传true
 * type为文件名 
 <MyIcon type="arr-file" tooltip="111" svgFile></MyIcon>
 * 
 */

import { delay } from "@nnnb/hhfast-utils";

const customCache = new Map<string, string>();
const fetchCache = new Set<string>();
function isValidCustomSvgUrl(svgUrl: string): boolean {
  return (typeof svgUrl === "string" &&
    svgUrl.length &&
    !customCache.has(svgUrl)) as boolean;
}

export const svgLoader = async ({
  svgUrl,
}: {
  svgUrl: string;
}): Promise<string | undefined> => {
  if (customCache.has(svgUrl)) {
    return customCache.get(svgUrl);
  }
  if (fetchCache.has(svgUrl)) {
    await delay(1000);
    return await svgLoader({ svgUrl });
  }
  if (isValidCustomSvgUrl(svgUrl)) {
    fetchCache.add(svgUrl);
    return fetch(svgUrl).then(async (res) => {
      const text = await res.text();
      customCache.set(svgUrl, text);
      return text;
    });
  }
  return undefined;
};
