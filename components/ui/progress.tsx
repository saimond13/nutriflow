'use client'
import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils/cn'

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  color?: 'emerald' | 'amber' | 'red' | 'blue'
}

const colorMap = {
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-400',
  red:     'bg-red-500',
  blue:    'bg-blue-500',
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, color = 'emerald', ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full transition-all duration-500 rounded-full', colorMap[color])}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
