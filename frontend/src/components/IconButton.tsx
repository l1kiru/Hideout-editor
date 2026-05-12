import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  size?: 'sm' | 'md';
  variant?: 'muted' | 'primary' | 'danger';
  children: ReactNode;
};

// Accessible icon button. Pass aria-label (and title for the tooltip) when there is no visible text.
export function IconButton({
  size = 'md',
  variant = 'muted',
  className = '',
  type = 'button',
  children,
  ...props
}: IconButtonProps) {
  const cls = ['iconBtn', `iconBtn--${size}`, `iconBtn--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
