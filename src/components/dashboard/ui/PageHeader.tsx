interface PageHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {typeof title === 'string' ? (
          <h1 className="text-2xl font-bold text-text-primary font-heading">{title}</h1>
        ) : (
          title
        )}
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
