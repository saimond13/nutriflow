import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:   'bg-emerald-100 text-emerald-700',
        secondary: 'bg-slate-100 text-slate-600',
        premium:   'bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700 border border-orange-200',
        free:      'bg-slate-100 text-slate-500',
        danger:    'bg-red-100 text-red-700',
        info:      'bg-blue-100 text-blue-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
