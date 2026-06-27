'use client'

import { cn } from '@/lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'
type AvatarStatus = 'online' | 'busy' | 'away' | 'offline'

interface AvatarProps {
  name: string
  src?: string
  size?: AvatarSize
  status?: AvatarStatus
  className?: string
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-emerald-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-400',
}

const statusDotSize: Record<AvatarSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : ''
  return (first + last).toUpperCase()
}

function Avatar({ name, src, size = 'md', status, className }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeStyles[size],
          )}
        />
      ) : (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-navy text-white font-medium',
            sizeStyles[size],
          )}
          aria-label={name}
        >
          {getInitials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            statusColors[status],
            statusDotSize[size],
          )}
          aria-label={status}
        />
      )}
    </div>
  )
}

export { Avatar }
export type { AvatarProps, AvatarSize, AvatarStatus }
