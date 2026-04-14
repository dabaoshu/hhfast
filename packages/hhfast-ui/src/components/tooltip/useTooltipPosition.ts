import type { TooltipPlacement } from './types'

/**
 * 定位计算结果。
 */
export interface TooltipPositionResult {
  /** 浮层 top（px）。 */
  top: number
  /** 浮层 left（px）。 */
  left: number
  /** 实际使用的方位（视口不够时自动翻转）。 */
  actualPlacement: TooltipPlacement
  /** 箭头偏移量（px），用于非居中对齐。 */
  arrowOffset: number
}

/**
 * 主轴方向。
 */
type Side = 'top' | 'bottom' | 'left' | 'right'

/**
 * 对齐方式。
 */
type Alignment = 'start' | 'end' | ''

/**
 * 解析 placement 为主轴 + 对齐。
 */
function parsePlacement(placement: TooltipPlacement): { side: Side; alignment: Alignment } {
  const parts = placement.split('-') as [Side, Alignment?]
  return { side: parts[0], alignment: parts[1] ?? '' }
}

/**
 * 合并为 placement。
 */
function joinPlacement(side: Side, alignment: Alignment): TooltipPlacement {
  return (alignment ? `${side}-${alignment}` : side) as TooltipPlacement
}

/**
 * 翻转映射。
 */
const FLIP_MAP: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

/**
 * 计算 tooltip 浮层定位。
 *
 * 基于 reference 和 popper 的 DOMRect 进行纯计算，不直接操作 DOM。
 * 当目标方位空间不足时自动翻转到对侧。
 *
 * @param referenceRect 触发元素的 getBoundingClientRect()。
 * @param popperRect 浮层元素的 getBoundingClientRect()（用于取宽高）。
 * @param placement 期望方位。
 * @param offset 偏移量（px）。
 * @param viewportWidth 视口宽度。
 * @param viewportHeight 视口高度。
 * @param scrollX 水平滚动距离。
 * @param scrollY 垂直滚动距离。
 */
export function calcTooltipPosition(
  referenceRect: DOMRect,
  popperRect: DOMRect,
  placement: TooltipPlacement,
  offset: number = 8,
  viewportWidth: number = window.innerWidth,
  viewportHeight: number = window.innerHeight,
  scrollX: number = window.scrollX,
  scrollY: number = window.scrollY,
): TooltipPositionResult {
  const { side, alignment } = parsePlacement(placement)

  // 先用期望方位算一次
  let pos = computePosition(referenceRect, popperRect, side, alignment, offset, scrollX, scrollY)

  // 检查是否需要翻转
  const shouldFlip = needsFlip(pos, popperRect, side, viewportWidth, viewportHeight, scrollX, scrollY)
  const actualSide = shouldFlip ? FLIP_MAP[side] : side

  if (shouldFlip) {
    pos = computePosition(referenceRect, popperRect, actualSide, alignment, offset, scrollX, scrollY)
  }

  // 边界钳制
  pos = clampToViewport(pos, popperRect, viewportWidth, viewportHeight, scrollX, scrollY)

  // 箭头偏移
  const arrowOffset = calcArrowOffset(referenceRect, popperRect, actualSide, alignment, pos, scrollX, scrollY)

  return {
    top: pos.top,
    left: pos.left,
    actualPlacement: joinPlacement(actualSide, alignment),
    arrowOffset,
  }
}

/**
 * 基于主轴和对齐计算位置。
 */
function computePosition(
  ref: DOMRect,
  popper: DOMRect,
  side: Side,
  alignment: Alignment,
  offset: number,
  scrollX: number,
  scrollY: number,
): { top: number; left: number } {
  const refCenterX = ref.left + scrollX + ref.width / 2
  const refCenterY = ref.top + scrollY + ref.height / 2

  let top = 0
  let left = 0

  // 主轴定位
  switch (side) {
    case 'top':
      top = ref.top + scrollY - popper.height - offset
      left = refCenterX - popper.width / 2
      break
    case 'bottom':
      top = ref.bottom + scrollY + offset
      left = refCenterX - popper.width / 2
      break
    case 'left':
      top = refCenterY - popper.height / 2
      left = ref.left + scrollX - popper.width - offset
      break
    case 'right':
      top = refCenterY - popper.height / 2
      left = ref.right + scrollX + offset
      break
  }

  // 对齐偏移
  if (side === 'top' || side === 'bottom') {
    if (alignment === 'start') {
      left = ref.left + scrollX
    }
    else if (alignment === 'end') {
      left = ref.right + scrollX - popper.width
    }
  }
  else {
    if (alignment === 'start') {
      top = ref.top + scrollY
    }
    else if (alignment === 'end') {
      top = ref.bottom + scrollY - popper.height
    }
  }

  return { top, left }
}

/**
 * 检查是否需要翻转。
 */
function needsFlip(
  pos: { top: number; left: number },
  popper: DOMRect,
  side: Side,
  viewportWidth: number,
  viewportHeight: number,
  scrollX: number,
  scrollY: number,
): boolean {
  switch (side) {
    case 'top':
      return pos.top < scrollY
    case 'bottom':
      return pos.top + popper.height > scrollY + viewportHeight
    case 'left':
      return pos.left < scrollX
    case 'right':
      return pos.left + popper.width > scrollX + viewportWidth
  }
}

/**
 * 钳制到视口内。
 */
function clampToViewport(
  pos: { top: number; left: number },
  popper: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  scrollX: number,
  scrollY: number,
): { top: number; left: number } {
  const minX = scrollX + 4
  const maxX = scrollX + viewportWidth - popper.width - 4
  const minY = scrollY + 4
  const maxY = scrollY + viewportHeight - popper.height - 4

  return {
    top: Math.max(minY, Math.min(maxY, pos.top)),
    left: Math.max(minX, Math.min(maxX, pos.left)),
  }
}

/**
 * 计算箭头偏移量。
 */
function calcArrowOffset(
  ref: DOMRect,
  popper: DOMRect,
  side: Side,
  alignment: Alignment,
  pos: { top: number; left: number },
  scrollX: number,
  scrollY: number,
): number {
  if (side === 'top' || side === 'bottom') {
    const refCenter = ref.left + scrollX + ref.width / 2
    return refCenter - pos.left
  }
  else {
    const refCenter = ref.top + scrollY + ref.height / 2
    return refCenter - pos.top
  }
}
