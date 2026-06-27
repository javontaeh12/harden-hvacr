'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}

interface DropdownItemProps {
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  destructive?: boolean
  className?: string
}

function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      <div
        className={cn(
          'absolute z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-white py-1 shadow-lg transition-all duration-150',
          align === 'right' ? 'right-0' : 'left-0',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DropdownItem({ icon, children, onClick, destructive = false, className }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
        destructive
          ? 'text-red-600 hover:bg-red-50'
          : 'text-navy hover:bg-ice',
        className,
      )}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
      {children}
    </button>
  )
}

Dropdown.Item = DropdownItem

export { Dropdown, DropdownItem }
export type { DropdownProps, DropdownItemProps }
