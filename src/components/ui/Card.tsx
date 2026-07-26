import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className,
  hover = true,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-border rounded-2xl',
        'shadow-[0_2px_8px_rgba(0,0,0,0.06),_0_4px_20px_rgba(0,0,0,0.04)]',
        hover &&
          'transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
