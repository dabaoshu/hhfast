export interface DrawerProps {
  open: boolean
  placement?: DrawerPlacement
  title?: string
  closable?: boolean
  maskClosable?: boolean
  width?: string | number
  height?: string | number
}

export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'
