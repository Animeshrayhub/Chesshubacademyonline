import { cn } from '@/utils/cn';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  light?: boolean;
}

export default function SectionTitle({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  align = 'center',
  className,
  light = false,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        'mb-12 lg:mb-16',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className
      )}
    >
      {eyebrow && (
        <span
          className={cn(
            'inline-block mb-3 text-sm font-semibold tracking-widest uppercase',
            light ? 'text-accent' : 'text-accent'
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4',
          light ? 'text-white' : 'text-text-primary'
        )}
      >
        {title}
        {titleHighlight && (
          <span className="text-gradient-gold"> {titleHighlight}</span>
        )}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'text-lg max-w-2xl',
            align === 'center' && 'mx-auto',
            light ? 'text-white/70' : 'text-text-secondary'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
