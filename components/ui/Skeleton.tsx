'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('rounded bg-gray-200 animate-pulse', className)}
      aria-hidden="true"
    />
  )
}

function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} />
}

function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn('rounded-full', className)} />
}

function SkeletonCard({ className }: SkeletonProps) {
  return <Skeleton className={cn('rounded-xl h-32', className)} />
}

Skeleton.Text = SkeletonText
Skeleton.Circle = SkeletonCircle
Skeleton.Card = SkeletonCard

export { Skeleton }
export type { SkeletonProps }
