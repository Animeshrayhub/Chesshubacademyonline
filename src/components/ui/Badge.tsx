import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'gold' | 'gold-dark' | 'success' | 'light' | 'dark';
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary/10 text-primary border border-primary/20',
  gold: 'bg-amber-50 text-amber-800 border border-amber-200/80',
  'gold-dark': 'bg-accent/20 text-accent border border-accent/30',
  success: 'bg-green-50 text-green-700 border border-green-200',
  light: 'bg-white/10 text-white border border-white/20',
  dark: 'bg-surface-dark text-white border border-white/10',
};

export default function Badge({ children, variant = 'primary', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
