'use client'

import { cn } from '@/lib/utils'

type ProgressSize = 'sm' | 'md'

interface ProgressProps {
  value: number
  label?: string
  color?: string
  size?: ProgressSize
  className?: string
}

const trackSizes: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
}

function Progress({
  value,
  label,
  color = 'ember',
  size = 'md',
  className,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-navy">{label}</span>
          <span className="text-sm text-steel">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-gray-200 overflow-hidden', trackSizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', `bg-${color}`)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}

export { Progress }
export type { ProgressProps, ProgressSize }
