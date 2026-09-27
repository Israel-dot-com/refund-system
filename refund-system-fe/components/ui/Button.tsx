import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-wide rounded-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-orange text-white hover:bg-orange-dark uppercase text-xs tracking-widest',
    secondary: 'bg-white text-ink border border-border hover:bg-cream uppercase text-xs tracking-widest',
    ghost:     'text-ink-2 hover:text-ink hover:bg-cream text-sm',
    danger:    'bg-[#c0392b] text-white hover:bg-[#a93226] uppercase text-xs tracking-widest',
  };

  const sizes = {
    sm: 'px-3 py-1.5',
    md: 'px-5 py-2.5',
    lg: 'px-7 py-3.5',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
