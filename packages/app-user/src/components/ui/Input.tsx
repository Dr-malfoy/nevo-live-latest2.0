import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-ink-muted mb-1.5">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl bg-surface-sunken border border-transparent px-4 py-3 text-ink
            placeholder:text-ink-faint focus:outline-none focus:bg-white focus:border-accent-500 focus:ring-1 focus:ring-accent-500
            transition-colors ${icon ? 'pl-10' : ''}
            ${error ? 'border-role-host focus:border-role-host focus:ring-role-host' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-role-host">{error}</p>}
    </div>
  )
);
