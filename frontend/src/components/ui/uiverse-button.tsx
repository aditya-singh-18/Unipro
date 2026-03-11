'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

type UiverseButtonVariant =
  | 'back'
  | 'create'
  | 'primary'

interface UiverseButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: UiverseButtonVariant
}

export default function UiverseButton({
  variant,
  className,
  children,
  ...props
}: UiverseButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'uiverse-btn',
        variant,
        className
      )}
    >
      {children}
    </button>
  )
}
