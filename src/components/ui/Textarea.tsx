import { cn } from '@/utils/cn';
import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  id: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, rows = 5, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
          {props.required && (
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={cn(
            'w-full px-4 py-3 text-base rounded-lg border bg-white resize-none',
            'transition-colors duration-150',
            'placeholder:text-text-secondary/50',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none'
              : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          {...props}
        />
        {hint && !error && (
          <p id={`${id}-hint`} className="text-xs text-text-secondary">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
