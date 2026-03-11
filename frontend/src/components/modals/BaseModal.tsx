'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export default function BaseModal({
  open,
  onClose,
  title,
  children,
  className,
}: BaseModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative z-50 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
